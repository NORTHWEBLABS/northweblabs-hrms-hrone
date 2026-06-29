import { NextRequest, NextResponse } from "next/server";
import { adminClient, getSuper } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function countOf(sb: any, table: string, mod?: (q: any) => any) {
  try {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    if (mod) q = mod(q);
    const { count } = await q;
    return count || 0;
  } catch { return 0; }
}

export async function GET(req: NextRequest) {
  const user = await getSuper(req);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const sb = adminClient();
  const view = req.nextUrl.searchParams.get("view") || "overview";

  try {
    if (view === "overview") {
      const nowIso = new Date().toISOString();
      const [orgs, users, employees, activeSessions] = await Promise.all([
        countOf(sb, "organizations"),
        countOf(sb, "users"),
        countOf(sb, "employees"),
        countOf(sb, "user_sessions", (q) => q.gt("expires_at", nowIso)),
      ]);

      let recentUsers: any[] = [];
      try {
        const { data } = await sb
          .from("users")
          .select("id, full_name, email, role, org_id, created_at")
          .order("created_at", { ascending: false })
          .limit(6);
        recentUsers = data || [];
      } catch {}

      // map org names for the recent users
      const orgIds = Array.from(new Set(recentUsers.map((u) => u.org_id).filter(Boolean)));
      const orgNames: Record<string, string> = {};
      if (orgIds.length) {
        const { data: orow } = await sb.from("organizations").select("id, name").in("id", orgIds);
        (orow || []).forEach((o: any) => { orgNames[o.id] = o.name; });
      }
      recentUsers = recentUsers.map((u) => ({ ...u, org_name: u.org_id ? orgNames[u.org_id] || null : null }));

      return NextResponse.json({ metrics: { orgs, users, employees, activeSessions }, recentUsers });
    }

    if (view === "tenants") {
      const { data: orgs } = await sb.from("organizations").select("id, name, industry, city, state").order("name");
      const { data: users } = await sb.from("users").select("id, org_id, role");
      const { data: emps } = await sb.from("employees").select("id, org_id");

      const uByOrg: Record<string, number> = {};
      const ownerByOrg: Record<string, string> = {};
      (users || []).forEach((u: any) => { if (u.org_id) uByOrg[u.org_id] = (uByOrg[u.org_id] || 0) + 1; });
      const eByOrg: Record<string, number> = {};
      (emps || []).forEach((e: any) => { if (e.org_id) eByOrg[e.org_id] = (eByOrg[e.org_id] || 0) + 1; });

      const tenants = (orgs || []).map((o: any) => ({
        id: o.id, name: o.name, industry: o.industry || null,
        location: [o.city, o.state].filter(Boolean).join(", ") || null,
        users: uByOrg[o.id] || 0, employees: eByOrg[o.id] || 0,
      }));
      return NextResponse.json({ tenants });
    }

    if (view === "tenant") {
      const id = req.nextUrl.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const { data: org } = await sb.from("organizations").select("id, name, industry, city, state").eq("id", id).maybeSingle();
      if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { data: users } = await sb.from("users").select("id, full_name, email, role, created_at").eq("org_id", id).order("role");
      let employees: any[] = [];
      try {
        const { data } = await sb.from("employees").select("id, full_name, email, department, designation").eq("org_id", id).order("full_name");
        employees = data || [];
      } catch {}
      return NextResponse.json({ org, users: users || [], employees });
    }

    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}