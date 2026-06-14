// Route: app/api/auth/send-onboarding-status/route.ts
// Sends TWO emails when an employee completes onboarding:
//   1. To employee  → "Onboarding submitted, pending approval" (amber)
//   2. To admin/HR   → "Action required: approve this employee" (green, link to /employees)
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      employeeEmail,
      employeeName,
      orgName,
      designation,
      department,
      dateOfJoining,
      adminEmails, // string OR string[] — who should approve
    } = await request.json();

    if (!employeeEmail || !employeeName || !orgName) {
      return NextResponse.json(
        { error: "employeeEmail, employeeName and orgName required" },
        { status: 400 }
      );
    }

    const approveUrl = `${request.nextUrl.origin}/employees`;

    const key = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@northweblabs.com";

    // Normalise admin recipients
    const admins: string[] = Array.isArray(adminEmails)
      ? adminEmails.filter(Boolean)
      : adminEmails
      ? [adminEmails]
      : [];

    // Small helper: a detail row, only rendered if value present
    const detailRow = (label: string, value?: string) =>
      value
        ? `<tr>
             <td style="padding:6px 0;font-size:13px;color:#64748B">${label}</td>
             <td style="padding:6px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right">${value}</td>
           </tr>`
        : "";

    const detailsTable = `
      <table style="width:100%;border-collapse:collapse">
        ${detailRow("Employee", employeeName)}
        ${detailRow("Designation", designation)}
        ${detailRow("Department", department)}
        ${detailRow("Date of Joining", dateOfJoining)}
      </table>`;

    // ── Email 1: to employee (amber, pending) ──────────────────────────────
    const employeeHtml = `
      <div style="font-family:'Inter',-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 32px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:14px;line-height:48px;text-align:center">
            <span style="color:#fff;font-size:20px;font-weight:bold">N</span>
          </div>
        </div>
        <h1 style="font-size:22px;font-weight:700;color:#0F172A;text-align:center;margin:0 0 8px">
          Onboarding submitted 🎉
        </h1>
        <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 24px">
          Hi ${employeeName}, your onboarding details for <strong>${orgName}</strong> have been received.
        </p>
        <div style="background:#FFFBEB;border:2px solid #FDE68A;border-radius:16px;padding:24px;margin-bottom:24px">
          <p style="font-size:14px;color:#92400E;margin:0 0 8px;text-align:center;font-weight:700">
            ⏳ Pending HR / Admin approval
          </p>
          <p style="font-size:13px;color:#B45309;margin:0;text-align:center">
            You'll receive a welcome email with your login link once your account is approved. If it's taking a while, reach out to your HR or Admin.
          </p>
        </div>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="font-size:13px;color:#334155;margin:0 0 12px;font-weight:600">Your submitted details</p>
          ${detailsTable}
        </div>
        <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
          Your login email: <strong>${employeeEmail}</strong>
        </p>
        <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
        <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">NorthWebLabs HRMS Platform</p>
      </div>`;

    // ── Email 2: to admin / HR (green, action required) ────────────────────
    const adminHtml = `
      <div style="font-family:'Inter',-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 32px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:14px;line-height:48px;text-align:center">
            <span style="color:#fff;font-size:20px;font-weight:bold">N</span>
          </div>
        </div>
        <h1 style="font-size:22px;font-weight:700;color:#0F172A;text-align:center;margin:0 0 8px">
          Action required
        </h1>
        <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 24px">
          <strong>${employeeName}</strong> completed onboarding for <strong>${orgName}</strong> and is waiting for approval.
        </p>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px">
          ${detailsTable}
        </div>
        <div style="background:#F0FDF4;border:2px solid #BBF7D0;border-radius:16px;padding:24px;margin-bottom:24px">
          <p style="font-size:14px;color:#166534;margin:0 0 16px;text-align:center">
            Review the details and approve to send ${employeeName} their welcome email and login access.
          </p>
          <div style="text-align:center">
            <a href="${approveUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#16A34A,#22C55E);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px">
              Review & Approve →
            </a>
          </div>
        </div>
        <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
          Employee email: <strong>${employeeEmail}</strong>
        </p>
        <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
        <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">NorthWebLabs HRMS Platform</p>
      </div>`;

    // DEV mode — no key
    if (!key) {
      console.log("[onboarding-status] DEV MODE — no RESEND_API_KEY.", {
        employee: employeeEmail,
        admins,
        approveUrl,
      });
      return NextResponse.json({ success: true, dev: true, approveUrl, admins });
    }

    const send = (to: string[], subject: string, html: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `NorthWebLabs <${fromEmail}>`, to, subject, html }),
      });

    // Send employee email
    const results: Record<string, boolean> = {};
    const empRes = await send(
      [employeeEmail],
      `Onboarding submitted — pending approval at ${orgName}`,
      employeeHtml
    );
    results.employee = empRes.ok;
    if (!empRes.ok) console.error("[onboarding-status] employee email failed:", await empRes.text());

    // Send admin email (only if we have recipients)
    if (admins.length > 0) {
      const adminRes = await send(
        admins,
        `Action required: approve ${employeeName}'s onboarding (${orgName})`,
        adminHtml
      );
      results.admin = adminRes.ok;
      if (!adminRes.ok) console.error("[onboarding-status] admin email failed:", await adminRes.text());
    } else {
      console.warn("[onboarding-status] No admin recipients — skipped approval email.");
      results.admin = false;
    }

    return NextResponse.json({ success: true, results, approveUrl });
  } catch (err: any) {
    console.error("[onboarding-status]", err.message);
    return NextResponse.json({ error: "Failed to send onboarding emails" }, { status: 500 });
  }
}