"use client";
// Route: app/(dashboard)/work-schedule/page.tsx
// Manage work-week / weekly-off policy: named schedules (working weekdays) + per-employee assignment.
// Owner/admin/hr only. Tables: work_schedules, employee_work_schedule (see 2026_work_schedules.sql).

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { WEEKDAYS, DEFAULT_WORKING_DAYS, scheduleSummary } from "@/lib/schedule";
import {
  CalendarDays, Plus, Trash2, Check, Loader2, Star, AlertCircle,
  CheckCircle2, X, Users, Save, ChevronDown,
} from "lucide-react";

function useSB() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

interface Schedule { id: string; org_id: string; name: string; working_days: number[]; is_default: boolean; }
interface Emp { id: string; full_name: string; employee_code: string | null; department: string | null; schedule_id: string | null; }

const initials = (n: string) => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const avColor = (n: string) => ["bg-indigo-100 text-indigo-700","bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-purple-100 text-purple-700","bg-pink-100 text-pink-700"][n.charCodeAt(0) % 6];

export default function WorkSchedulePage() {
  const sb = useSB();
  const [orgId, setOrgId] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"schedules" | "people">("schedules");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [assignDirty, setAssignDirty] = useState<Record<string, string>>({}); // empId -> schedule_id ("" = default)
  const [savingAssign, setSavingAssign] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const email = (typeof window !== "undefined" && localStorage.getItem("userEmail")) || "";
      const oid = (typeof window !== "undefined" && localStorage.getItem("activeOrgId")) || "";
      setOrgId(oid);

      if (email) {
        const { data: u } = await sb.from("users").select("role, org_id").eq("email", email.toLowerCase().trim()).maybeSingle();
        if (u) { setRole(u.role); if (!oid && u.org_id) setOrgId(u.org_id); }
      }
      const useOrg = oid || "";
      if (!useOrg) { setLoading(false); return; }

      const [{ data: sch }, { data: e }, { data: ews }] = await Promise.all([
        sb.from("work_schedules").select("*").eq("org_id", useOrg).order("is_default", { ascending: false }).order("name"),
        sb.from("employees").select("id, full_name, employee_code, department").eq("org_id", useOrg).eq("status", "active").order("full_name"),
        sb.from("employee_work_schedule").select("employee_id, schedule_id").eq("org_id", useOrg),
      ]);

      setSchedules((sch || []) as Schedule[]);
      const assignMap: Record<string, string> = {};
      (ews || []).forEach((r: any) => { assignMap[r.employee_id] = r.schedule_id; });
      setEmps(((e || []) as any[]).map(x => ({ ...x, schedule_id: assignMap[x.id] || null })) as Emp[]);
    } catch {
      setToast({ msg: "Failed to load — has the migration been run?", type: "error" });
    } finally { setLoading(false); }
  }, [sb]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const canEdit = role === "owner" || role === "admin" || role === "hr" || role === "super_admin";

  const defaultSchedule = schedules.find(s => s.is_default) || null;

  // ── Schedule editing (working-day toggles) ──────────────────────────────────
  const toggleDay = (sid: string, iso: number) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== sid) return s;
      const has = s.working_days.includes(iso);
      const next = has ? s.working_days.filter(d => d !== iso) : [...s.working_days, iso].sort((a, b) => a - b);
      return { ...s, working_days: next };
    }));
  };

  const saveSchedule = async (s: Schedule) => {
    if (s.working_days.length === 0) { setToast({ msg: "Pick at least one working day", type: "error" }); return; }
    setSavingId(s.id);
    try {
      const { error } = await sb.from("work_schedules")
        .update({ name: s.name, working_days: s.working_days }).eq("id", s.id);
      if (error) throw error;
      setToast({ msg: "Schedule saved", type: "success" });
    } catch (e: any) { setToast({ msg: e.message || "Save failed", type: "error" }); }
    finally { setSavingId(null); }
  };

  const makeDefault = async (sid: string) => {
    setSavingId(sid);
    try {
      // Clear other defaults first (partial unique index allows only one)
      await sb.from("work_schedules").update({ is_default: false }).eq("org_id", orgId).eq("is_default", true);
      const { error } = await sb.from("work_schedules").update({ is_default: true }).eq("id", sid);
      if (error) throw error;
      setSchedules(prev => prev.map(s => ({ ...s, is_default: s.id === sid })));
      setToast({ msg: "Default schedule updated", type: "success" });
    } catch (e: any) { setToast({ msg: e.message || "Failed", type: "error" }); }
    finally { setSavingId(null); }
  };

  const addSchedule = async () => {
    try {
      const { data, error } = await sb.from("work_schedules")
        .insert({ org_id: orgId, name: "New schedule", working_days: DEFAULT_WORKING_DAYS, is_default: schedules.length === 0 })
        .select().single();
      if (error) throw error;
      setSchedules(prev => [...prev, data as Schedule]);
    } catch (e: any) { setToast({ msg: e.message || "Failed to add", type: "error" }); }
  };

  const deleteSchedule = async (s: Schedule) => {
    if (s.is_default) { setToast({ msg: "Set another schedule as default first", type: "error" }); return; }
    if (!confirm(`Delete "${s.name}"? Employees on it will fall back to the default.`)) return;
    try {
      const { error } = await sb.from("work_schedules").delete().eq("id", s.id);
      if (error) throw error;
      setSchedules(prev => prev.filter(x => x.id !== s.id));
      setEmps(prev => prev.map(e => e.schedule_id === s.id ? { ...e, schedule_id: null } : e));
    } catch (e: any) { setToast({ msg: e.message || "Failed to delete", type: "error" }); }
  };

  const setName = (sid: string, name: string) =>
    setSchedules(prev => prev.map(s => s.id === sid ? { ...s, name } : s));

  // ── Assignment ──────────────────────────────────────────────────────────────
  const assignedValue = (e: Emp) => assignDirty[e.id] !== undefined ? assignDirty[e.id] : (e.schedule_id || "");
  const onAssign = (empId: string, sid: string) =>
    setAssignDirty(prev => ({ ...prev, [empId]: sid }));

  const saveAssignments = async () => {
    const changes = Object.entries(assignDirty);
    if (changes.length === 0) { setToast({ msg: "No changes", type: "error" }); return; }
    setSavingAssign(true);
    try {
      for (const [empId, sid] of changes) {
        if (sid === "") {
          await sb.from("employee_work_schedule").delete().eq("employee_id", empId);
        } else {
          await sb.from("employee_work_schedule")
            .upsert({ employee_id: empId, org_id: orgId, schedule_id: sid }, { onConflict: "employee_id" });
        }
      }
      setEmps(prev => prev.map(e => assignDirty[e.id] !== undefined ? { ...e, schedule_id: assignDirty[e.id] || null } : e));
      setAssignDirty({});
      setToast({ msg: "Assignments saved", type: "success" });
    } catch (e: any) { setToast({ msg: e.message || "Save failed", type: "error" }); }
    finally { setSavingAssign(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  );

  if (!canEdit) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-amber-400" /></div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Restricted</h2>
        <p className="text-sm text-gray-500">Only owners, admins and HR can manage work schedules.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500"><CalendarDays className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Work schedule</h1>
            <p className="text-xs text-gray-400 mt-0.5">Set working weekdays & weekly offs — org standard with per-person overrides.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([["schedules", "Schedules", CalendarDays], ["people", "By person", Users]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Schedules tab ── */}
      {tab === "schedules" && (
        <div className="flex flex-col gap-4">
          {schedules.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500 mb-4">No schedules yet. Create your first work-week policy.</p>
            </div>
          )}

          {schedules.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <input value={s.name} onChange={e => setName(s.id, e.target.value)}
                  className="flex-1 min-w-[160px] text-sm font-semibold text-gray-900 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                {s.is_default ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full"><Star className="w-3 h-3 fill-indigo-500 text-indigo-500" />Default</span>
                ) : (
                  <button onClick={() => makeDefault(s.id)} disabled={savingId === s.id}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50"><Star className="w-3 h-3" />Set default</button>
                )}
                <button onClick={() => deleteSchedule(s)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
              </div>

              {/* Weekday toggles */}
              <div className="flex gap-2 flex-wrap mb-3">
                {WEEKDAYS.map(w => {
                  const on = s.working_days.includes(w.iso);
                  return (
                    <button key={w.iso} onClick={() => toggleDay(s.id, w.iso)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-all w-16
                        ${on ? "bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-100" : "bg-yellow-50 border-yellow-200 text-yellow-600"}`}>
                      <span>{w.short}</span>
                      <span className="text-[10px] font-medium opacity-70">{on ? "Work" : "Off"}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-400">{scheduleSummary(s.working_days)}</p>
                <button onClick={() => saveSchedule(s)} disabled={savingId === s.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save
                </button>
              </div>
            </div>
          ))}

          <button onClick={addSchedule}
            className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-500 transition">
            <Plus className="w-4 h-4" />Add schedule
          </button>

          <p className="text-xs text-gray-400 px-1">
            Green = working day, yellow = weekly off. The <strong>Default</strong> schedule applies to everyone unless
            you override them under <em>By person</em>. Weekly-off days show as yellow on each employee&apos;s dashboard.
          </p>
        </div>
      )}

      {/* ── People tab ── */}
      {tab === "people" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Assign schedules · {emps.length} employees</p>
            <button onClick={saveAssignments} disabled={savingAssign || Object.keys(assignDirty).length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40">
              {savingAssign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save{Object.keys(assignDirty).length > 0 ? ` (${Object.keys(assignDirty).length})` : ""}
            </button>
          </div>
          {emps.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No active employees.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {emps.map(e => {
                const val = assignedValue(e);
                const dirty = assignDirty[e.id] !== undefined && (assignDirty[e.id] || "") !== (e.schedule_id || "");
                return (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avColor(e.full_name)}`}>{initials(e.full_name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{e.department || e.employee_code || ""}</p>
                    </div>
                    {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved" />}
                    <div className="relative">
                      <select value={val} onChange={ev => onAssign(e.id, ev.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 min-w-[180px]">
                        <option value="">{defaultSchedule ? `Standard — ${defaultSchedule.name}` : "Standard (default)"}</option>
                        {schedules.filter(s => !s.is_default).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5 opacity-50" /></button>
        </div>
      )}
    </div>
  );
}
