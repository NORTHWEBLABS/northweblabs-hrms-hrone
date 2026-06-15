"use client";
// Component: components/HeadSelect.tsx
// Hierarchical expense-head selector with inline create. Used in claim/submit modals and approvals.
// Heads: parent_id=null are top-level; children are sub-heads. Value = selected head id (usually a sub-head).

import { useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Plus, X, Loader2, ChevronDown } from "lucide-react";

export interface Head { id: string; name: string; parent_id: string | null; }

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

// Build "Parent › Child" label for a head id
export function headLabel(heads: Head[], id: string | null | undefined): string {
  if (!id) return "";
  const h = heads.find(x => x.id === id);
  if (!h) return "";
  if (!h.parent_id) return h.name;
  const parent = heads.find(x => x.id === h.parent_id);
  return parent ? `${parent.name} › ${h.name}` : h.name;
}

export default function HeadSelect({
  heads, value, onChange, orgId, onHeadsChange, label = "Expense head", optional = true,
}: {
  heads: Head[]; value: string; onChange: (id: string) => void;
  orgId: string; onHeadsChange: (heads: Head[]) => void;
  label?: string; optional?: boolean;
}) {
  const sb = useSB();
  const [creating, setCreating] = useState(false);
  const [newParent, setNewParent] = useState<string>("");   // parent head id, or "" for top-level
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const parents = heads.filter(h => !h.parent_id);
  const subsOf = (pid: string) => heads.filter(h => h.parent_id === pid);

  const createHead = async () => {
    if (!newName.trim()) { setErr("Name required"); return; }
    setSaving(true); setErr("");
    const { data, error } = await sb.from("expense_heads").insert({
      org_id: orgId, name: newName.trim(), parent_id: newParent || null,
    }).select().single();
    if (error) { setErr(error.message); setSaving(false); return; }
    const next = [...heads, data as Head];
    onHeadsChange(next);
    onChange((data as Head).id);   // auto-select the new head
    setCreating(false); setNewName(""); setNewParent(""); setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-gray-600">{label}{optional ? " (optional)" : " *"}</label>
        <button type="button" onClick={() => setCreating(c => !c)} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-0.5">
          {creating ? <><X className="w-3 h-3" />Cancel</> : <><Plus className="w-3 h-3" />New head</>}
        </button>
      </div>

      {!creating ? (
        <div className="relative">
          <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none pr-8">
            <option value="">— Select head —</option>
            {parents.map(p => {
              const subs = subsOf(p.id);
              if (subs.length === 0) return <option key={p.id} value={p.id}>{p.name}</option>;
              return (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.id}>{p.name} (general)</option>
                  {subs.map(s => <option key={s.id} value={s.id}>{p.name} › {s.name}</option>)}
                </optgroup>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      ) : (
        <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2">
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="relative">
            <select value={newParent} onChange={e => setNewParent(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">Top-level head (no parent)</option>
              {parents.map(p => <option key={p.id} value={p.id}>Under: {p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New head name" autoFocus
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <button type="button" onClick={createHead} disabled={saving}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}