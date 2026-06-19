"use client";
// Route: app/(dashboard)/access-control/page.tsx
// Owner-only: assign module access per role, with per-user on/off overrides.

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { MODULES, MODULE_GROUPS, CONFIG_ROLES, isAllowed } from "@/lib/modules";
import {
  Shield, Loader2, CheckCircle2, AlertCircle, Save, Users, Lock,
  Check, X, RotateCcw,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) return data.org_id; }
  return "";
}

const ROLE_LABEL: Record<string, string> = { admin: "Admin", hr: "HR", manager: "Manager", employee: "Employee" };
interface OrgUser { id: string; full_name: string | null; email: string; role: string; }

export default function AccessControlPage() {
  const sb = useSB();
  const [tab, setTab] = useState<"role" | "user">("role");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // role matrix: perm[role][key] = boolean
  const [perm, setPerm] = useState<Record<string, Record<string, boolean>>>({});

  // per-user overrides
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [selUser, setSelUser] = useState<OrgUser | null>(null);
  const [ovr, setOvr] = useState<Record<string, "default" | "on" | "off">>({});

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    setOrgId(oid);

    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    const { data: me } = await sb.from("users").select("role").eq("email", email).eq("org_id", oid).maybeSingle();
    setMyRole(me?.role || "");

    const [{ data: perms }, { data: us }] = await Promise.all([
      sb.from("module_permissions").select("role, module_key, enabled").eq("org_id", oid),
      sb.from("users").select("id, full_name, email, role").eq("org_id", oid).order("full_name"),
    ]);

    // seed matrix from defaults, then apply saved rows
    const base: Record<string, Record<string, boolean>> = {};
    CONFIG_ROLES.forEach(r => {
      base[r] = {};
      MODULES.forEach(m => { base[r][m.key] = m.defaultRoles.includes(r); });
    });
    (perms || []).forEach((p: any) => { if (base[p.role]) base[p.role][p.module_key] = p.enabled; });
    setPerm(base);
    setUsers((us || []) as OrgUser[]);
    setLoading(false);
  }, [sb]);

  useEffect(() => { load(); }, [load]);

  const toggle = (role: string, key: string) =>
    setPerm(p => ({ ...p, [role]: { ...p[role], [key]: !p[role]?.[key] } }));

  const saveRoles = async () => {
    setSaving(true);
    const rows: any[] = [];
    CONFIG_ROLES.forEach(r => MODULES.forEach(m => rows.push({ org_id: orgId, role: r, module_key: m.key, enabled: !!perm[r]?.[m.key], updated_at: new Date().toISOString() })));
    const { error } = await sb.from("module_permissions").upsert(rows, { onConflict: "org_id,role,module_key" });
    setSaving(false);
    setToast(error ? { msg: error.message, type: "error" } : { msg: "Role access saved", type: "success" });
  };

  // ── per-user ──
  const pickUser = async (u: OrgUser) => {
    setSelUser(u);
    const { data } = await sb.from("user_module_overrides").select("module_key, enabled").eq("org_id", orgId).eq("user_id", u.id);
    const map: Record<string, "default" | "on" | "off"> = {};
    MODULES.forEach(m => { map[m.key] = "default"; });
    (data || []).forEach((o: any) => { map[o.module_key] = o.enabled ? "on" : "off"; });
    setOvr(map);
  };

  const cycleOvr = (key: string) =>
    setOvr(p => ({ ...p, [key]: p[key] === "default" ? "on" : p[key] === "on" ? "off" : "default" }));

  const saveUser = async () => {
    if (!selUser) return;
    setSaving(true);
    const upserts: any[] = [];
    const deletes: string[] = [];
    MODULES.forEach(m => {
      const v = ovr[m.key];
      if (v === "default") deletes.push(m.key);
      else upserts.push({ org_id: orgId, user_id: selUser.id, module_key: m.key, enabled: v === "on", updated_at: new Date().toISOString() });
    });
    if (deletes.length) await sb.from("user_module_overrides").delete().eq("org_id", orgId).eq("user_id", selUser.id).in("module_key", deletes);
    let err = null;
    if (upserts.length) { const { error } = await sb.from("user_module_overrides").upsert(upserts, { onConflict: "org_id,user_id,module_key" }); err = error; }
    setSaving(false);
    setToast(err ? { msg: err.message, type: "error" } : { msg: `Overrides saved for ${selUser.full_name || selUser.email}`, type: "success" });
  };

  // effective preview for a user (role default + override)
  const effFor = (u: OrgUser, key: string) => {
    const m = MODULES.find(x => x.key === key)!;
    const o = ovr[key];
    return isAllowed(m, u.role, perm[u.role]?.[key], o === "on" ? true : o === "off" ? false : undefined);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  if (myRole && !["owner", "super_admin"].includes(myRole)) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-gray-900">Owner access only</h2>
        <p className="text-sm text-gray-500 mt-1">Only the organisation owner can manage module access.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Shield className="w-5 h-5 text-indigo-600" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Access control</h1><p className="text-sm text-gray-400">Assign which modules each role and person can use</p></div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        <button onClick={() => setTab("role")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "role" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}><Shield className="w-4 h-4" />By role</button>
        <button onClick={() => setTab("user")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "user" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}><Users className="w-4 h-4" />By person</button>
      </div>

      {/* ── BY ROLE ── */}
      {tab === "role" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">Owner &amp; Platform admin always have full access. Toggle the rest below.</p>
            <button onClick={saveRoles} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Module</th>
                {CONFIG_ROLES.map(r => <th key={r} className="text-center text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{ROLE_LABEL[r]}</th>)}
              </tr></thead>
              <tbody>
                {MODULE_GROUPS.map(grp => {
                  const mods = MODULES.filter(m => m.group === grp);
                  if (!mods.length) return null;
                  return (
                    <Fragment key={grp}>
                      <tr className="bg-gray-50/60"><td colSpan={CONFIG_ROLES.length + 1} className="px-5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{grp}</td></tr>
                      {mods.map(m => (
                        <tr key={m.key} className="border-b border-gray-50 hover:bg-gray-50/40">
                          <td className="px-5 py-3 text-sm font-medium text-gray-800">{m.label}</td>
                          {CONFIG_ROLES.map(r => {
                            const on = !!perm[r]?.[m.key];
                            return (
                              <td key={r} className="px-4 py-3 text-center">
                                <button onClick={() => toggle(r, m.key)}
                                  className={`relative w-9 h-5 rounded-full transition ${on ? "bg-indigo-600" : "bg-gray-200"}`}>
                                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : ""}`} />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BY PERSON ── */}
      {tab === "user" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">People</h3></div>
            <div className="max-h-[480px] overflow-y-auto">
              {users.length === 0 ? <p className="text-xs text-gray-400 text-center py-8">No users</p> : users.map(u => (
                <button key={u.id} onClick={() => pickUser(u)} className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 transition ${selUser?.id === u.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!selUser ? (
              <div className="text-center py-20"><Users className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">Select a person to set overrides</p></div>
            ) : ["owner", "super_admin"].includes(selUser.role) ? (
              <div className="text-center py-20"><Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">{selUser.full_name || selUser.email} is an owner — full access, nothing to override.</p></div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{selUser.full_name || selUser.email}</h3>
                    <p className="text-xs text-gray-400 capitalize">{selUser.role} · overrides take priority over the role default</p>
                  </div>
                  <button onClick={saveUser} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
                  </button>
                </div>
                <div className="max-h-[440px] overflow-y-auto p-3">
                  {MODULE_GROUPS.map(grp => {
                    const mods = MODULES.filter(m => m.group === grp);
                    if (!mods.length) return null;
                    return (
                      <div key={grp} className="mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">{grp}</p>
                        {mods.map(m => {
                          const state = ovr[m.key] || "default";
                          const eff = effFor(selUser, m.key);
                          return (
                            <div key={m.key} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-800">{m.label}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${eff ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>{eff ? "visible" : "hidden"}</span>
                              </div>
                              <div className="flex gap-1">
                                {(["default", "on", "off"] as const).map(opt => (
                                  <button key={opt} onClick={() => setOvr(p => ({ ...p, [m.key]: opt }))}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${state === opt
                                      ? opt === "on" ? "bg-emerald-600 text-white border-emerald-600" : opt === "off" ? "bg-red-500 text-white border-red-500" : "bg-gray-700 text-white border-gray-700"
                                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                                    {opt === "default" ? "Default" : opt === "on" ? "Allow" : "Block"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
        </div>
      )}
    </div>
  );
}
