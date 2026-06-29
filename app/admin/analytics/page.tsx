"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Building2, IdCard, Gauge, Search, Check, X, ExternalLink } from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";

type Analytics = {
  totals: { users: number; orgs: number; employees: number };
  months: { key: string; label: string; count: number }[];
  roles: Record<string, number>;
  seo: { ok: boolean; url: string; ms?: number; sizeKb?: number; status?: number; score?: number; checks?: { label: string; ok: boolean; detail: string }[]; error?: string };
};

const scoreColor = (s: number) => (s >= 80 ? "text-emerald-500" : s >= 50 ? "text-amber-500" : "text-rose-500");

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/manage?view=analytics").then(async (r) => {
      if (r.status === 403) { setDenied(true); return; }
      setData(await r.json());
    }).catch(() => setDenied(true));
  }, []);

  if (denied) return <Restricted />;
  if (!data) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  const maxMonth = Math.max(1, ...data.months.map((m) => m.count));
  const roleEntries = Object.entries(data.roles).sort((a, b) => b[1] - a[1]);
  const roleTotal = roleEntries.reduce((s, [, n]) => s + n, 0) || 1;
  const seo = data.seo;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      {/* totals */}
      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Users", v: data.totals.users, icon: Users }, { label: "Organizations", v: data.totals.orgs, icon: Building2 }, { label: "Employees", v: data.totals.employees, icon: IdCard }].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <Icon className="w-5 h-5 text-indigo-500 mb-3" />
              <p className="text-2xl font-bold text-slate-900">{c.v}</p>
              <p className="text-xs text-slate-400 mt-1">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* signups */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">New users · last 6 months</h2>
          <div className="flex items-end gap-3 h-44">
            {data.months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-full">
                  <div className="w-9 rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-500 transition-all" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count ? 6 : 2 }} title={`${m.count}`} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500">{m.label}</span>
                <span className="text-[11px] text-slate-400 -mt-1.5">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* role mix */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Role mix</h2>
          <div className="space-y-3">
            {roleEntries.map(([role, n]) => (
              <div key={role}>
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 capitalize">{role.replace("_", " ")}</span><span className="text-xs font-bold text-slate-700">{n}</span></div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(n / roleTotal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEO + performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Search className="w-4 h-4 text-slate-400" />SEO &amp; performance</h2>
          <a href={seo.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 flex items-center gap-1 truncate max-w-[200px]">{seo.url.replace(/^https?:\/\//, "")}<ExternalLink className="w-3 h-3" /></a>
        </div>
        {!seo.ok ? (
          <div className="p-6 text-sm text-rose-500">Couldn't fetch the homepage: {seo.error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* scores */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 flex md:flex-col gap-6 md:gap-4 items-center md:items-start">
              <div>
                <p className={`text-4xl font-bold ${scoreColor(seo.score || 0)}`}>{seo.score}</p>
                <p className="text-xs text-slate-400 mt-1">SEO score</p>
              </div>
              <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-slate-400" /><div><p className="text-lg font-bold text-slate-800">{seo.ms} ms</p><p className="text-[11px] text-slate-400">Load time · {seo.sizeKb} KB</p></div></div>
            </div>
            {/* checklist */}
            <div className="md:col-span-2 p-5">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {seo.checks!.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <span className={`w-4 h-4 rounded-full grid place-items-center shrink-0 mt-0.5 ${c.ok ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>{c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}</span>
                    <div className="min-w-0"><p className="text-sm font-medium text-slate-700">{c.label}</p><p className="text-[11px] text-slate-400 truncate">{c.detail}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
