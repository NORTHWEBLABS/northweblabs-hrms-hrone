// Route: app/api/leave/allocate/route.ts
// Admin action: create/refresh leave_balances rows for all active employees in an org,
// based on the org's active leave_policies. Idempotent — won't duplicate existing (employee, type, year) rows.
//
// Allocation amount = annual_quota, prorated by remaining months if prorate_on_join and the
// employee joined during the current year. Existing rows are left untouched (we never overwrite used days).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

const yearNow = () => new Date().getFullYear();

// Prorate an annual quota by months remaining from a join date within the current year.
function prorate(quota: number, joinDate: string | null, year: number): number {
  if (!joinDate) return quota;
  const d = new Date(joinDate);
  if (d.getFullYear() < year) return quota;          // joined before this year → full
  if (d.getFullYear() > year) return 0;              // joins next year → nothing yet
  const monthsLeft = 12 - d.getMonth();              // incl. join month
  return Math.round((quota * monthsLeft / 12) * 2) / 2; // nearest 0.5
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, year: yearIn } = await req.json() as { orgId: string; year?: number };
    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    const year = yearIn || yearNow();

    const supabase = sb();

    // Active policies for the org
    const { data: policies } = await supabase
      .from("leave_policies").select("*").eq("org_id", orgId).eq("active", true);
    if (!policies || policies.length === 0) {
      return NextResponse.json({ error: "No active leave policies for this org. Create policies first." }, { status: 400 });
    }

    // Active, approved employees
    const { data: emps } = await supabase
      .from("employees").select("id, date_of_joining, approval_status, status")
      .eq("org_id", orgId).neq("status", "terminated");
    const employees = (emps || []).filter((e: any) => e.approval_status !== "rejected");
    if (employees.length === 0) {
      return NextResponse.json({ error: "No eligible employees to allocate to." }, { status: 400 });
    }

    // Existing balances this year, to skip duplicates
    const empIds = employees.map((e: any) => e.id);
    const { data: existing } = await supabase
      .from("leave_balances").select("employee_id, leave_type").in("employee_id", empIds).eq("year", year);
    const existingKey = new Set((existing || []).map((b: any) => `${b.employee_id}::${(b.leave_type || "").trim().toLowerCase()}`));

    // Build rows to insert
    const rows: any[] = [];
    for (const emp of employees) {
      for (const pol of policies) {
        const key = `${emp.id}::${(pol.leave_type || "").trim().toLowerCase()}`;
        if (existingKey.has(key)) continue; // already allocated — never overwrite (preserves used)
        const total = pol.prorate_on_join
          ? prorate(Number(pol.annual_quota) || 0, emp.date_of_joining, year)
          : (Number(pol.annual_quota) || 0);
rows.push({
          employee_id: emp.id, leave_type: pol.leave_type, year,
          total, used: 0,
        });      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, allocated: 0, message: "All employees already have balances for this year." });
    }

    const { error: insErr } = await supabase.from("leave_balances").insert(rows);
    if (insErr) return NextResponse.json({ error: `Allocation failed: ${insErr.message}` }, { status: 500 });

    return NextResponse.json({ success: true, allocated: rows.length, year, employees: employees.length, policies: policies.length });
  } catch (err: any) {
    console.error("[leave/allocate]", err.message);
    return NextResponse.json({ error: err.message || "Allocation failed" }, { status: 500 });
  }
}