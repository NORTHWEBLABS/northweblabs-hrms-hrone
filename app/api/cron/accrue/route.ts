// Route: app/api/cron/accrue/route.ts
// Vercel Cron target — runs monthly. For every org's MONTHLY-frequency active policies,
// credits accrual_rate days to each employee's matching balance for the current year,
// respecting max_balance (0 = no cap). Annual-frequency policies are untouched (granted at allocation).
//
// Secured by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
// Also callable manually with the same header for testing.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

const yearNow = () => new Date().getFullYear();
const norm = (s: string) => (s || "").trim().toLowerCase();

async function runAccrual() {
  const supabase = sb();
  const year = yearNow();

  // All monthly-accrual active policies across all orgs
  const { data: policies } = await supabase
    .from("leave_policies").select("*").eq("active", true).eq("accrual_frequency", "monthly");
  if (!policies || policies.length === 0) return { credited: 0, note: "No monthly policies." };

  let credited = 0;
  let capped = 0;

  for (const pol of policies) {
    const rate = Number(pol.accrual_rate) || 0;
    if (rate <= 0) continue;
    const cap = Number(pol.max_balance) || 0; // 0 = no cap

    // Employees in this org who have a balance row for this type+year
    const { data: emps } = await supabase
      .from("employees").select("id").eq("org_id", pol.org_id).neq("status", "terminated");
    const empIds = (emps || []).map((e: any) => e.id);
    if (empIds.length === 0) continue;

    const { data: balances } = await supabase
      .from("leave_balances").select("id, total, used, leave_type, employee_id")
      .in("employee_id", empIds).eq("year", year);

    const matching = (balances || []).filter((b: any) => norm(b.leave_type) === norm(pol.leave_type));

    for (const b of matching) {
      let newTotal = (Number(b.total) || 0) + rate;
      if (cap > 0 && newTotal > cap) { newTotal = cap; capped++; }
      const newRemaining = newTotal - (Number(b.used) || 0);
      await supabase.from("leave_balances").update({ total: newTotal, remaining: newRemaining }).eq("id", b.id);
      credited++;
    }
  }

  return { credited, capped, policies: policies.length, year };
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (dev) — allow
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  // Vercel Cron issues GET requests
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runAccrual();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[cron/accrue]", err.message);
    return NextResponse.json({ error: err.message || "Accrual failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}