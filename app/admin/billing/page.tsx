"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, Check } from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";

type Plan = { id: string; name: string; price_inr: number; interval: string; features: string[]; sort: number };
type OrgRow = { id: string; name: string; plan_id: string | null; status: string | null; trial_ends: string | null };

const STATUSES = ["trial", "active", "past_due", "cancelled"];
const statusColor = (s: string | null) => s === "active" ? "bg-emerald-50 text-emerald-600" : s === "trial" ? "bg-blue-50 text-blue-600" : s === "past_due" ? "bg-amber-50 text-amber-600" : s === "cancelled" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400";

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [denied, setDenied] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => fetch("/api/admin/manage?view=billing").then(async (r) => {
    if (r.status === 403) { setDenied(true); return; }
    const j = await r.json(); setPlans(j.plans || []); setOrgs(j.orgs || []);
  }).catch(() => setDenied(true));
  useEffect(() => { load(); }, []);

  const assign = async (org: OrgRow, patch: Partial<OrgRow>) => {
    setSavingId(org.id);
    const next = { ...org, ...patch };
    setOrgs((cur) => cur.map((o) => o.id === org.id ? next : o));
    try {
      await fetch("/api/admin/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "subscription", action: "assign", org_id: org.id, plan_id: next.plan_id, status: next.status || "active", trial_ends: next.trial_ends }) });
    } finally { setSavingId(null); }
  };

  if (denied) return <Restricted />;
  if (!plans) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  const planName = (id: string | null) => plans.find((p) => p.id === id)?.name || "—";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      {/* plans */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-slate-400" />Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-900">{p.name}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{p.price_inr === 0 ? "Free" : `₹${p.price_inr.toLocaleString("en-IN")}`}<span className="text-xs font-normal text-slate-400">{p.price_inr ? `/${p.interval}` : ""}</span></p>
              <ul className="mt-3 space-y-1.5">
                {(p.features || []).map((f, i) => <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* org subscriptions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">Organization subscriptions</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3">Organization</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Current</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {orgs.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-800">{o.name}{savingId === o.id && <Loader2 className="inline w-3 h-3 animate-spin text-slate-300 ml-2" />}</td>
                  <td className="px-3 py-3">
                    <select value={o.plan_id || ""} onChange={(e) => assign(o, { plan_id: e.target.value || null })} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                      <option value="">— none —</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select value={o.status || "active"} onChange={(e) => assign(o, { status: e.target.value })} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{planName(o.plan_id)}{o.status ? ` · ${o.status}` : ""}</span></td>
                </tr>
              ))}
              {orgs.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No organizations</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
