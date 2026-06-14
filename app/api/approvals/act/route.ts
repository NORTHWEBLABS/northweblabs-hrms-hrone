// Route: app/api/approvals/act/route.ts
// Single side-effect engine for the approval pipeline.
// On approve: switches on request.type and performs the real DB mutation
//   (write leaves / decrement balance / upsert attendance / credit comp-off / flip expense),
//   then updates the approval_requests row, writes approval_history, and notifies the requester.
// On reject: status + history + notify only. No side effects.
//
// Employee resolution: payload.employee_id first, else bridge raised_by(users.id) → email → employees.
// Uses SUPABASE_SERVICE_ROLE_KEY when available (bypasses RLS for cross-table writes),
// falls back to the anon key (fine while RLS is open in dev).
//
// Balance policy: WARN BUT ALLOW — decrement even if it goes negative; surface a warning in the response.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Action = "approved" | "rejected";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Resolve the subject employee for a request.
async function resolveEmployeeId(sb: any, request: any): Promise<string | null> {
  // 1. payload.employee_id (preferred — written at creation time)
  const pid = request?.payload?.employee_id;
  if (pid) return pid;

  // 2. bridge raised_by (users.id) → users.email → employees.id (email + org_id)
  if (request?.raised_by) {
    const { data: u } = await sb.from("users").select("email").eq("id", request.raised_by).maybeSingle();
    if (u?.email) {
      const { data: emp } = await sb.from("employees")
        .select("id").eq("email", u.email).eq("org_id", request.org_id).maybeSingle();
      if (emp?.id) return emp.id;
    }
  }
  return null;
}

const yearNow = () => new Date().getFullYear();

export async function POST(req: NextRequest) {
  try {
    const { requestId, action, actorUserId, actorName, remarks } = await req.json() as {
      requestId: string; action: Action; actorUserId: string; actorName?: string; remarks?: string;
    };

    if (!requestId || !action || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "requestId and a valid action are required" }, { status: 400 });
    }

    const sb = admin();

    // Load the request
    const { data: request, error: loadErr } = await sb
      .from("approval_requests").select("*").eq("id", requestId).maybeSingle();
    if (loadErr || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (request.status === "approved" || request.status === "rejected") {
      return NextResponse.json({ error: `Request already ${request.status}` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const warnings: string[] = [];
    let employeeId: string | null = null;

    // ── Side effects only on approval ──────────────────────────────────────
    if (action === "approved") {
      employeeId = await resolveEmployeeId(sb, request);
      const p = request.payload || {};

      switch (request.type) {
        case "leave": {
          if (!employeeId) { warnings.push("No employee resolved — leave record not written, balance not updated."); break; }
          const days = Number(p.days) || 0;
          const leaveType = p.leave_type || "Leave";
          // Write the actual leave record
          const { error: lErr } = await sb.from("leaves").insert({
            org_id: request.org_id, employee_id: employeeId, leave_type: leaveType,
            from_date: p.from || p.from_date, to_date: p.to || p.to_date, days,
            reason: request.description || p.reason || null,
            status: "approved", approved_by: actorUserId || null, approved_at: now,
          });
          if (lErr) warnings.push(`Leave record insert failed: ${lErr.message}`);
          // Decrement balance (warn but allow)
          const yr = yearNow();
          const { data: bal } = await sb.from("leave_balances")
            .select("id, total, used").eq("employee_id", employeeId).eq("leave_type", leaveType).eq("year", yr).maybeSingle();
          if (!bal) {
            warnings.push(`No ${leaveType} balance row for ${yr} — approved without ledger update.`);
          } else {
            const newUsed = (bal.used || 0) + days;
            await sb.from("leave_balances").update({ used: newUsed, remaining: (bal.total || 0) - newUsed }).eq("id", bal.id);
            if ((bal.total || 0) - newUsed < 0) warnings.push(`Balance for ${leaveType} is now negative.`);
          }
          break;
        }

        case "attendance_regularisation": {
          if (!employeeId) { warnings.push("No employee resolved — attendance not written."); break; }
          const date = p.date;
          if (!date) { warnings.push("No date in payload — attendance not written."); break; }
          // Upsert attendance for (employee, date)
          const { data: existing } = await sb.from("attendance")
            .select("id").eq("employee_id", employeeId).eq("date", date).maybeSingle();
          const row: any = {
            org_id: request.org_id, employee_id: employeeId, date,
            check_in: p.check_in || null, check_out: p.check_out || null,
            status: "present", source: "regularisation",
            notes: p.reason || request.description || "Regularised via approval",
          };
          if (existing?.id) await sb.from("attendance").update(row).eq("id", existing.id);
          else await sb.from("attendance").insert(row);
          break;
        }

        case "wfh": {
          if (!employeeId) { warnings.push("No employee resolved — WFH attendance not written."); break; }
          const date = p.date;
          if (!date) { warnings.push("No date in payload — WFH not written."); break; }
          const { data: existing } = await sb.from("attendance")
            .select("id").eq("employee_id", employeeId).eq("date", date).maybeSingle();
          const row: any = {
            org_id: request.org_id, employee_id: employeeId, date,
            status: "wfh", source: "regularisation",
            notes: p.reason || request.description || "Work from home",
          };
          if (existing?.id) await sb.from("attendance").update(row).eq("id", existing.id);
          else await sb.from("attendance").insert(row);
          break;
        }

        case "comp_off": {
          if (!employeeId) { warnings.push("No employee resolved — comp-off not credited."); break; }
          const credit = Number(p.credit_days) || 1;
          const leaveType = p.leave_type || "Comp Off";
          const yr = yearNow();
          const { data: bal } = await sb.from("leave_balances")
            .select("id, total, used").eq("employee_id", employeeId).eq("leave_type", leaveType).eq("year", yr).maybeSingle();
          if (bal) {
            const newTotal = (bal.total || 0) + credit;
            await sb.from("leave_balances").update({ total: newTotal, remaining: newTotal - (bal.used || 0) }).eq("id", bal.id);
          } else {
            await sb.from("leave_balances").insert({
              employee_id: employeeId, leave_type: leaveType, year: yr,
              total: credit, used: 0, remaining: credit,
            });
          }
          break;
        }

        case "expense": {
          // Flip the linked expense if we have its id
          const expId = p.expense_id;
          if (expId) {
            const { error: eErr } = await sb.from("expenses")
              .update({ status: "approved", approved_by: actorUserId || null, approved_at: now })
              .eq("id", expId);
            if (eErr) warnings.push(`Expense update failed: ${eErr.message}`);
          } else {
            warnings.push("No expense_id in payload — approval recorded but no expense row flipped.");
          }
          break;
        }

        // asset / custom / anything else → status-only, no side effect
        default:
          break;
      }
    }

    // ── Update the approval_requests row ───────────────────────────────────
    const updates: any = {
      status: action, final_remarks: remarks || null, updated_at: now,
      ...(action === "approved" ? { approved_at: now } : { rejected_at: now }),
    };
    const { error: updErr } = await sb.from("approval_requests").update(updates).eq("id", requestId);
    if (updErr) return NextResponse.json({ error: `Failed to update request: ${updErr.message}` }, { status: 500 });

    // ── History ────────────────────────────────────────────────────────────
    await sb.from("approval_history").insert({
      request_id: requestId, action, acted_by: actorUserId || request.assigned_to,
      acted_by_name: actorName || null, notes: remarks || `Request ${action}`,
      from_status: request.status, to_status: action,
    });

    // ── Notify the requester ────────────────────────────────────────────────
    await sb.from("notifications").insert({
      org_id: request.org_id, user_id: request.raised_by,
      title: `Request ${action}`,
      body: `Your ${request.type} request "${request.title}" was ${action}${actorName ? ` by ${actorName}` : ""}${remarks ? `: "${remarks}"` : ""}`,
      type: "approval_result", reference_type: "approval_request", reference_id: requestId, link: "/approvals",
    });

    return NextResponse.json({ success: true, action, warnings });
  } catch (err: any) {
    console.error("[approvals/act]", err.message);
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
  }
}