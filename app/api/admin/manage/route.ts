import { NextRequest, NextResponse } from "next/server";
import { adminClient, getSuper } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://northweblabs.com";

function pick(re: RegExp, html: string): string | null {
  const m = html.match(re);
  return m ? (m[1] || "").trim() : null;
}

// Build a JSON-safe error payload; flag missing tables so the UI can prompt to run the SQL.
function tableErr(error: any) {
  const msg = error?.message || "Database error";
  const missing = error?.code === "42P01" || /does not exist|could not find the table/i.test(msg);
  return { error: msg, needsSql: missing };
}

async function seoReport() {
  try {
    const t0 = Date.now();
    const res = await fetch(SITE_URL, { headers: { "user-agent": "NWL-admin-analytics" }, cache: "no-store" });
    const ms = Date.now() - t0;
    const html = await res.text();
    const sizeKb = Math.round(html.length / 1024);
    const title = pick(/<title[^>]*>([^<]*)<\/title>/i, html);
    const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i, html);
    const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i, html);
    const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i, html);
    const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i, html);
    const viewport = pick(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i, html);
    const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
    const checks = [
      { label: "Page loads (200)", ok: res.ok, detail: `HTTP ${res.status}` },
      { label: "Title tag", ok: !!title, detail: title || "missing" },
      { label: "Meta description", ok: !!description, detail: description ? `${description.length} chars` : "missing" },
      { label: "Open Graph title", ok: !!ogTitle, detail: ogTitle || "missing" },
      { label: "Open Graph image", ok: !!ogImage, detail: ogImage ? "set" : "missing" },
      { label: "Canonical URL", ok: !!canonical, detail: canonical || "missing" },
      { label: "Viewport (mobile)", ok: !!viewport, detail: viewport ? "set" : "missing" },
      { label: "Exactly one H1", ok: h1Count === 1, detail: `${h1Count} found` },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    return { ok: true, url: SITE_URL, ms, sizeKb, status: res.status, score, checks };
  } catch (e: any) {
    return { ok: false, error: e?.message || "fetch failed", url: SITE_URL };
  }
}

export async function GET(req: NextRequest) {
  const user = await getSuper(req);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const sb = adminClient();
  const view = req.nextUrl.searchParams.get("view") || "analytics";

  try {
    if (view === "analytics") {
      const [{ data: users }, { count: orgCount }, { count: empCount }] = await Promise.all([
        sb.from("users").select("role, created_at"),
        sb.from("organizations").select("*", { count: "exact", head: true }),
        sb.from("employees").select("*", { count: "exact", head: true }),
      ]);
      // monthly signups (last 6 months)
      const months: { key: string; label: string; count: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-IN", { month: "short" }), count: 0 });
      }
      const roles: Record<string, number> = {};
      (users || []).forEach((u: any) => {
        roles[u.role || "unknown"] = (roles[u.role || "unknown"] || 0) + 1;
        if (u.created_at) { const k = u.created_at.slice(0, 7); const m = months.find((x) => x.key === k); if (m) m.count++; }
      });
      const seo = await seoReport();
      return NextResponse.json({ totals: { users: (users || []).length, orgs: orgCount || 0, employees: empCount || 0 }, months, roles, seo });
    }

    if (view === "announcements") {
      const { data, error } = await sb.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) return NextResponse.json(tableErr(error));
      return NextResponse.json({ announcements: data || [] });
    }

    if (view === "settings") {
      const { data, error } = await sb.from("app_settings").select("value").eq("key", "maintenance").maybeSingle();
      if (error) return NextResponse.json(tableErr(error));
      return NextResponse.json({ maintenance: data?.value || { enabled: false, message: "" } });
    }

    if (view === "billing") {
      const { data: plans, error: pe } = await sb.from("plans").select("*").order("sort");
      if (pe) return NextResponse.json(tableErr(pe));
      const { data: orgs } = await sb.from("organizations").select("id, name").order("name");
      const { data: subs } = await sb.from("org_subscriptions").select("org_id, plan_id, status, trial_ends");
      const subMap: Record<string, any> = {};
      (subs || []).forEach((s: any) => (subMap[s.org_id] = s));
      const orgRows = (orgs || []).map((o: any) => ({ id: o.id, name: o.name, ...(subMap[o.id] || { plan_id: null, status: null, trial_ends: null }) }));
      return NextResponse.json({ plans: plans || [], orgs: orgRows });
    }

    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed", tablesMissing: true }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSuper(req);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const sb = adminClient();
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const { scope, action } = body || {};

  try {
    if (scope === "settings" && action === "maintenance") {
      const value = { enabled: !!body.enabled, message: body.message || "" };
      const { error } = await sb.from("app_settings").upsert({ key: "maintenance", value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (scope === "announcement") {
      if (action === "create") {
        const { error } = await sb.from("announcements").insert({ title: body.title, body: body.body || null, level: body.level || "info", audience: body.audience || "all", active: true });
        if (error) throw error;
      } else if (action === "toggle") {
        const { error } = await sb.from("announcements").update({ active: !!body.active }).eq("id", body.id);
        if (error) throw error;
      } else if (action === "delete") {
        const { error } = await sb.from("announcements").delete().eq("id", body.id);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }
    if (scope === "plan") {
      if (action === "create") {
        const { error } = await sb.from("plans").insert({ name: body.name, price_inr: Number(body.price_inr) || 0, interval: body.interval || "month", features: body.features || [], sort: Number(body.sort) || 99 });
        if (error) throw error;
      } else if (action === "delete") {
        const { error } = await sb.from("plans").delete().eq("id", body.id);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }
    if (scope === "subscription" && action === "assign") {
      const { error } = await sb.from("org_subscriptions").upsert({ org_id: body.org_id, plan_id: body.plan_id || null, status: body.status || "active", trial_ends: body.trial_ends || null, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    const { error, needsSql } = tableErr(e);
    return NextResponse.json({ error, needsSql }, { status: needsSql ? 200 : 500 });
  }
}
