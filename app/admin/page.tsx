"use client";

import { useEffect, useState } from "react";
import { Building2, Users, IdCard, Activity, Loader2, ArrowRight, Palette } from "lucide-react";
import AdminShell, { Restricted } from "@/components/admin/AdminShell";

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

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin?view=overview").then(async (r) => {
      if (r.status === 403) { setDenied(true); return; }
      const j = await r.json();
      setData(j);
    }).catch(() => setDenied(true));
  }, []);

  if (denied) return <Restricted />;

  const cards = [
    { label: "Organizations", value: data?.metrics.orgs, icon: Building2, color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: "Users", value: data?.metrics.users, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Employees", value: data?.metrics.employees, icon: IdCard, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Active sessions", value: data?.metrics.activeSessions, icon: Activity, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <AdminShell active="overview" title="Overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{c.label}</span>
                <div className={`w-9 h-9 ${c.bg} rounded-xl grid place-items-center ${c.color}`}><Icon className="w-5 h-5" /></div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data ? c.value : <Loader2 className="w-5 h-5 animate-spin text-slate-300" />}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* recent users */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Recent users</h2>
            <a href="/admin/tenants" className="text-xs font-semibold text-indigo-600 flex items-center gap-1">All tenants <ArrowRight className="w-3 h-3" /></a>
          </div>
          {!data ? (
            <div className="p-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : data.recentUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No users yet</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {data.recentUsers.map((u) => (
                <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-xs font-bold text-slate-500 shrink-0">
                    {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                  </div>
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
        <div className="space-y-3">
          <a href="/admin/tenants" className="block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 transition">
            <Building2 className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-sm font-bold text-slate-900">Tenant console</p>
            <p className="text-xs text-slate-400 mt-0.5">Browse every organization and drill into its users.</p>
          </a>
          <a href="/admin/site" className="block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 transition">
            <Palette className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-sm font-bold text-slate-900">Site editor</p>
            <p className="text-xs text-slate-400 mt-0.5">Edit and publish the marketing homepage.</p>
          </a>
        </div>
      </div>
    </AdminShell>
  );
}