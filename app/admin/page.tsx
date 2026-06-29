"use client";

import { useEffect, useState } from "react";
import { Building2, Users, IdCard, Activity, Loader2, ArrowRight, Palette, TrendingUp } from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";
import GamesPanel from "@/components/admin/GamesPanel";

type Overview = {
  metrics: { orgs: number; users: number; employees: number; activeSessions: number };
  recentUsers: { id: string; full_name: string | null; email: string; role: string | null; org_name: string | null; created_at: string | null }[];
};

const roleColor = (r: string | null) => {
  switch (r) {
    case "super_admin": return "bg-violet-50 text-violet-600";
    case "owner": return "bg-indigo-50 text-indigo-600";
    case "admin": return "bg-blue-50 text-blue-600";
    case "hr": return "bg-emerald-50 text-emerald-600";
    case "manager": return "bg-amber-50 text-amber-600";
    default: return "bg-slate-100 text-slate-500";
  }
};

const CARDS = [
  { key: "orgs", label: "Organizations", icon: Building2, from: "from-indigo-500", to: "to-indigo-600" },
  { key: "users", label: "Users", icon: Users, from: "from-blue-500", to: "to-blue-600" },
  { key: "employees", label: "Employees", icon: IdCard, from: "from-emerald-500", to: "to-emerald-600" },
  { key: "activeSessions", label: "Active now", icon: Activity, from: "from-amber-500", to: "to-orange-500" },
] as const;

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin?view=overview").then(async (r) => {
      if (r.status === 403) { setDenied(true); return; }
      setData(await r.json());
    }).catch(() => setDenied(true));
  }, []);

  if (denied) return <Restricted />;

  return (
    <div className="mx-auto w-full max-w-[1200px] flex flex-col xl:flex-row gap-8 justify-center items-start">
      {/* main column */}
      <div className="flex-1 min-w-0 w-full xl:max-w-[780px] space-y-8">
        {/* metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map((c) => {
            const Icon = c.icon;
            const val = data?.metrics[c.key];
            return (
              <div key={c.key} className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden">
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${c.from} ${c.to} opacity-10`} />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.from} ${c.to} grid place-items-center text-white shadow-sm mb-4`}><Icon className="w-5 h-5" /></div>
                <p className="text-3xl font-bold text-slate-900 leading-none">{data ? val : <Loader2 className="w-5 h-5 animate-spin text-slate-300" />}</p>
                <p className="text-xs font-medium text-slate-400 mt-2">{c.label}</p>
              </div>
            );
          })}
        </div>

        {/* recent users */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-slate-400" />Recent users</h2>
            <a href="/admin/tenants" className="text-xs font-semibold text-indigo-600 flex items-center gap-1">All tenants <ArrowRight className="w-3 h-3" /></a>
          </div>
          {!data ? (
            <div className="p-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : data.recentUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">No users yet</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {data.recentUsers.map((u) => (
                <li key={u.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 transition">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center text-xs font-bold text-slate-500 shrink-0">{(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-400 truncate">{u.org_name || "—"}</p>
                  </div>
                  {u.role && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>{u.role}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/admin/tenants" className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-500"><Building2 className="w-5 h-5" /></div>
            <div><p className="text-sm font-bold text-slate-900">Tenant console</p><p className="text-xs text-slate-400">Browse organizations</p></div>
          </a>
          <a href="/admin/site" className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-500"><Palette className="w-5 h-5" /></div>
            <div><p className="text-sm font-bold text-slate-900">Site editor</p><p className="text-xs text-slate-400">Edit the homepage</p></div>
          </a>
        </div>
      </div>

      {/* games phone panel */}
      <GamesPanel />
    </div>
  );
}
