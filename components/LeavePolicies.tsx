"use client";
// Component: components/LeavePolicies.tsx
// Leave policy management + balance allocation. Drop into the org-structure page as a new tab.
//
// Usage in org-structure page:
//   import LeavePolicies from "@/components/LeavePolicies";
//   ...add a tab { id: "policies", label: "Leave policies", icon: ShieldCheck }
//   ...{tab === "policies" && <LeavePolicies orgId={orgId} onToast={(m,t)=>setToast({message:m,type:t})} />}

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, X, Loader2, Edit2, Trash2, CheckCircle2, AlertCircle,
  CalendarRange, Users, ChevronDown, Repeat, ArrowDownUp,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

interface Policy {
  id: string; org_id: string; leave_type: string;
  annual_quota: number; accrual_frequency: string; accrual_rate: number;
  carry_forward: boolean; carry_forward_cap: number; max_balance: number;
  prorate_on_join: boolean; active: boolean; created_at: string;
}

const DEFAULT_TYPES = ["Casual Leave", "Sick Leave", "Earned Leave", "Comp Off"];
const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200";
const selectCls = inputCls + " appearance-none";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>{children}{hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}</div>;
}

function PolicyModal({ orgId, editing, existingTypes, onSaved, onClose }: {
  orgId: string; editing: Policy | null; existingTypes: string[];
  onSaved: (p: Policy) => void; onClose: () => void;
}) {
  const sb = useSB();
  const [form, setForm] = useState({
    leave_type: editing?.leave_type || "",
    annual_quota: editing?.annual_quota ?? 12,
    accrual_frequency: editing?.accrual_frequency || "annual",
    accrual_rate: editing?.accrual_rate ?? 0,
    carry_forward: editing?.carry_forward ?? false,
    carry_forward_cap: editing?.carry_forward_cap ?? 0,
    max_balance: editing?.max_balance ?? 0,
    prorate_on_join: editing?.prorate_on_join ?? true,
    active: editing?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const availableTypes = DEFAULT_TYPES.filter(t => !existingTypes.includes(t) || t === editing?.leave_type);

  const save = async () => {
    const lt = form.leave_type.trim();
    if (!lt) { setError("Pick or enter a leave type"); return; }
    setSaving(true); setError("");
    const payload = {
      org_id: orgId, leave_type: lt,
      annual_quota: Number(form.annual_quota) || 0,
      accrual_frequency: form.accrual_frequency,
      accrual_rate: form.accrual_frequency === "monthly" ? (Number(form.accrual_rate) || 0) : 0,
      carry_forward: form.carry_forward,
      carry_forward_cap: form.carry_forward ? (Number(form.carry_forward_cap) || 0) : 0,
      max_balance: Number(form.max_balance) || 0,
      prorate_on_join: form.prorate_on_join,
      active: form.active,
    };
    const q = editing
      ? sb.from("leave_policies").update(payload).eq("id", editing.id).select().single()
      : sb.from("leave_policies").insert(payload).select().single();
    const { data, error: e } = await q;
    if (e) { setError(e.message.includes("duplicate") ? "A policy for this leave type already exists" : e.message); setSaving(false); return; }
    onSaved(data as Policy);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-4">{editing ? "Edit leave policy" : "New leave policy"}</h3>
        <div className="flex flex-col gap-4">
          <Field label="Leave type">
            {editing ? (
              <input className={inputCls} value={form.leave_type} disabled />
            ) : (
              <div className="relative">
                <select className={selectCls} value={form.leave_type} onChange={e => set("leave_type", e.target.value)}>
                  <option value="">Select type…</option>
                  {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Annual quota (days)" hint="Granted per year">
              <input className={inputCls} type="number" min={0} step={0.5} value={form.annual_quota} onChange={e => set("annual_quota", e.target.value)} />
            </Field>
            <Field label="Accrual">
              <div className="relative">
                <select className={selectCls} value={form.accrual_frequency} onChange={e => set("accrual_frequency", e.target.value)}>
                  <option value="annual">Annual (full grant)</option>
                  <option value="monthly">Monthly accrual</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
          </div>

          {form.accrual_frequency === "monthly" && (
            <Field label="Days credited per month" hint="e.g. 1.5 — runs via monthly cron">
              <input className={inputCls} type="number" min={0} step={0.25} value={form.accrual_rate} onChange={e => set("accrual_rate", e.target.value)} />
            </Field>
          )}

          <Field label="Max balance cap (days)" hint="0 = no cap">
            <input className={inputCls} type="number" min={0} step={0.5} value={form.max_balance} onChange={e => set("max_balance", e.target.value)} />
          </Field>

          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${form.carry_forward ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"}`}>
            <input type="checkbox" checked={form.carry_forward} onChange={e => set("carry_forward", e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            <div className="flex-1"><p className="text-xs font-semibold text-gray-800">Carry forward unused</p><p className="text-xs text-gray-400">Roll remaining into next year</p></div>
          </label>
          {form.carry_forward && (
            <Field label="Carry-forward cap (days)" hint="Max days carried into next year (0 = unlimited)">
              <input className={inputCls} type="number" min={0} step={0.5} value={form.carry_forward_cap} onChange={e => set("carry_forward_cap", e.target.value)} />
            </Field>
          )}

          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${form.prorate_on_join ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"}`}>
            <input type="checkbox" checked={form.prorate_on_join} onChange={e => set("prorate_on_join", e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            <div className="flex-1"><p className="text-xs font-semibold text-gray-800">Prorate on join</p><p className="text-xs text-gray-400">New joiners get a partial first-year grant</p></div>
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{editing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeavePolicies({ orgId, onToast }: { orgId: string; onToast?: (msg: string, type: "success" | "error") => void }) {
  const sb = useSB();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: Policy | null }>({ open: false, editing: null });
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [allocating, setAllocating] = useState(false);

  const toast = (m: string, t: "success" | "error") => onToast?.(m, t);

  const fetchPolicies = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("leave_policies").select("*").eq("org_id", orgId).order("leave_type");
    setPolicies((data || []) as Policy[]);
    setLoading(false);
  }, [sb, orgId]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const del = async (id: string) => {
    const { error } = await sb.from("leave_policies").delete().eq("id", id);
    if (error) toast(error.message, "error");
    else { setPolicies(p => p.filter(x => x.id !== id)); toast("Policy deleted", "success"); }
    setConfirmDel(null);
  };

  const allocate = async () => {
    setAllocating(true);
    try {
      const res = await fetch("/api/leave/allocate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Allocation failed", "error"); }
      else if (data.allocated === 0) { toast(data.message || "Nothing to allocate", "success"); }
      else { toast(`Allocated ${data.allocated} balance rows across ${data.employees} employees`, "success"); }
    } catch (e: any) { toast(e.message || "Allocation failed", "error"); }
    setAllocating(false);
  };

  const existingTypes = policies.map(p => p.leave_type);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Define how each leave type accrues, carries forward, and caps. Then allocate balances to all employees.</p>
        <div className="flex items-center gap-2">
          <button onClick={allocate} disabled={allocating || policies.filter(p => p.active).length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-indigo-200 text-indigo-600 bg-indigo-50 text-sm font-semibold rounded-lg hover:bg-indigo-100 disabled:opacity-50">
            {allocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}Allocate balances
          </button>
          <button onClick={() => setModal({ open: true, editing: null })} className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b]">
            <Plus className="w-4 h-4" />New policy
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-sm text-gray-500">Loading…</span></div>
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><CalendarRange className="w-5 h-5 text-gray-400" /></div>
            <p className="text-sm font-semibold text-gray-600">No leave policies yet</p>
            <button onClick={() => setModal({ open: true, editing: null })} className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg"><Plus className="w-4 h-4" />Create first policy</button>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-200">{["Leave type", "Quota", "Accrual", "Carry forward", "Cap", "Status", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><CalendarRange className="w-4 h-4" /></div><span className="text-sm font-semibold text-gray-900">{p.leave_type}</span></div></td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.annual_quota} days/yr</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.accrual_frequency === "monthly" ? <span className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5" />{p.accrual_rate}/mo</span> : "Annual"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.carry_forward ? <span className="flex items-center gap-1"><ArrowDownUp className="w-3.5 h-3.5" />{p.carry_forward_cap > 0 ? `${p.carry_forward_cap} max` : "Unlimited"}</span> : "No"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.max_balance > 0 ? `${p.max_balance} days` : "—"}</td>
                  <td className="px-4 py-3">{p.active ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Active</span> : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactive</span>}</td>
                  <td className="px-4 py-3">
                    {confirmDel === p.id ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => del(p.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
                        <button onClick={() => setConfirmDel(null)} className="px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal({ open: true, editing: p })} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                        <button onClick={() => setConfirmDel(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg group"><Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        <strong>Allocate balances</strong> creates this year's balance rows for every active employee from your active policies. It's safe to run repeatedly — existing balances are never overwritten. Monthly accrual tops them up automatically via the scheduled job.
      </p>

      {modal.open && <PolicyModal orgId={orgId} editing={modal.editing} existingTypes={existingTypes}
        onClose={() => setModal({ open: false, editing: null })}
        onSaved={p => { setPolicies(prev => modal.editing ? prev.map(x => x.id === p.id ? p : x) : [...prev, p].sort((a, b) => a.leave_type.localeCompare(b.leave_type))); setModal({ open: false, editing: null }); toast(modal.editing ? "Policy updated" : "Policy created", "success"); }} />}
    </div>
  );
}