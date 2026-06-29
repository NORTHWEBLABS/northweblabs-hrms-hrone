"use client";

import { useEffect, useState } from "react";
import { Building2, Users, IdCard, Loader2, Search, X, MapPin, Briefcase, ChevronRight } from "lucide-react";
import AdminShell, { Restricted } from "@/components/admin/AdminShell";

type Tenant = { id: string; name: string; industry: string | null; location: string | null; users: number; employees: number };
type Detail = {
  org: { id: string; name: string; industry: string | null; city: string | null; state: string | null };
  users: { id: string; full_name: string | null; email: string; role: string | null; created_at: string | null }[];
  employees: { id: string; full_name: string | null; email: string | null; department: string | null; designation: string | null }[];
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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin?view=tenants").then(async (r) => {
      if (r.status === 403) { setDenied(true); return; }
      const j = await r.json();
      setTenants(j.tenants || []);
    }).catch(() => setDenied(true));
  }, []);

  const openTenant = (id: string) => {
    setOpenId(id); setDetail(null); setDetailLoading(true);
    fetch(`/api/admin?view=tenant&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => setDetail(j))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  if (denied) return <Restricted />;

  const filtered = (tenants || []).filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminShell active="tenants" title="Tenants">
      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search organizations…"
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
      </div>

      {!tenants ? (
        <div className="p-12 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400">No organizations found</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-50">
            {filtered.map((t) => (
              <li key={t.id}>
                <button onClick={() => openTenant(t.id)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50/70 transition text-left">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-500 shrink-0"><Building2 className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                      {t.industry && <span>{t.industry}</span>}
                      {t.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{t.location}</span>}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t.users}</span>
                    <span className="flex items-center gap-1"><IdCard className="w-3.5 h-3.5" />{t.employees}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* detail drawer */}
      {openId && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpenId(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 truncate">{detail?.org.name || "Tenant"}</h2>
              <button onClick={() => setOpenId(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex-1 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="flex flex-wrap gap-2 text-xs">
                  {detail.org.industry && <span className="px-2.5 py-1 bg-slate-100 rounded-full text-slate-600 flex items-center gap-1"><Briefcase className="w-3 h-3" />{detail.org.industry}</span>}
                  {(detail.org.city || detail.org.state) && <span className="px-2.5 py-1 bg-slate-100 rounded-full text-slate-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{[detail.org.city, detail.org.state].filter(Boolean).join(", ")}</span>}
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Users ({detail.users.length})</h3>
                  <ul className="space-y-2">
                    {detail.users.map((u) => (
                      <li key={u.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-xs font-bold text-slate-500 shrink-0">{(u.full_name || u.email).slice(0, 1).toUpperCase()}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{u.full_name || u.email}</p><p className="text-[11px] text-slate-400 truncate">{u.email}</p></div>
                        {u.role && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>{u.role}</span>}
                      </li>
                    ))}
                    {detail.users.length === 0 && <li className="text-xs text-slate-400">No users</li>}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Employees ({detail.employees.length})</h3>
                  <ul className="space-y-2">
                    {detail.employees.slice(0, 50).map((e) => (
                      <li key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 grid place-items-center text-xs font-bold text-emerald-500 shrink-0">{(e.full_name || e.email || "?").slice(0, 1).toUpperCase()}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{e.full_name || e.email || "Unnamed"}</p><p className="text-[11px] text-slate-400 truncate">{[e.designation, e.department].filter(Boolean).join(" · ") || e.email}</p></div>
                      </li>
                    ))}
                    {detail.employees.length === 0 && <li className="text-xs text-slate-400">No employees</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}