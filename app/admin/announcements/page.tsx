"use client";

import { useEffect, useState } from "react";
import { Loader2, Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";

type Ann = { id: string; title: string; body: string | null; level: string; audience: string; active: boolean; created_at: string };

const LEVELS = ["info", "success", "warning", "critical"];
const levelColor = (l: string) => l === "critical" ? "bg-rose-50 text-rose-600" : l === "warning" ? "bg-amber-50 text-amber-600" : l === "success" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600";

export default function AnnouncementsPage() {
  const [list, setList] = useState<Ann[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [needsSql, setNeedsSql] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ title: "", body: "", level: "info", audience: "all" });
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/admin/manage?view=announcements").then(async (r) => {
    if (r.status === 403) { setDenied(true); return; }
    const j = await r.json();
    if (j.needsSql) { setNeedsSql(true); setList([]); return; }
    setList(j.announcements || []);
  }).catch(() => setDenied(true));
  useEffect(() => { load(); }, []);

  const post = async (payload: any) => { setBusy(true); setErr(""); try { const r = await fetch("/api/admin/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const j = await r.json().catch(() => ({})); if (j.needsSql) setNeedsSql(true); else if (j.error) setErr(j.error); await load(); } finally { setBusy(false); } };
  const create = async () => { if (!form.title.trim()) return; await post({ scope: "announcement", action: "create", ...form }); setForm({ title: "", body: "", level: "info", audience: "all" }); };

  if (denied) return <Restricted />;

  return (
    <div className="mx-auto w-full max-w-[820px] space-y-6">
      {needsSql && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">These tables aren't set up yet. Run <code className="px-1 bg-amber-100 rounded">admin-extras.sql</code> in the Supabase SQL editor, then reload.</div>}
      {err && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{err}</div>}
      {/* composer */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-4"><Megaphone className="w-4 h-4 text-slate-400" />New announcement</h2>
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={2} placeholder="Message (optional)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]"><label className="block text-[11px] font-semibold text-slate-500 mb-1">Level</label><select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
            <div className="flex-1 min-w-[140px]"><label className="block text-[11px] font-semibold text-slate-500 mb-1">Audience</label><select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">{["all", "owners", "admins"].map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            <div className="flex items-end"><button onClick={create} disabled={busy || !form.title.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"><Plus className="w-4 h-4" />Publish</button></div>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">All announcements</h2></div>
        {!list ? <div className="p-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          : list.length === 0 ? <div className="p-10 text-center text-sm text-slate-400">No announcements yet</div>
            : <ul className="divide-y divide-slate-50">
              {list.map((a) => (
                <li key={a.id} className="px-5 py-3.5 flex items-start gap-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-0.5 ${levelColor(a.level)}`}>{a.level}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${a.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{a.title}</p>
                    {a.body && <p className="text-xs text-slate-400 mt-0.5">{a.body}</p>}
                    <p className="text-[10px] text-slate-300 mt-1">{a.audience} · {new Date(a.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <button onClick={() => post({ scope: "announcement", action: "toggle", id: a.id, active: !a.active })} className="p-1.5 text-slate-400 hover:text-slate-700" title={a.active ? "Deactivate" : "Activate"}>{a.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  <button onClick={() => { if (confirm("Delete this announcement?")) post({ scope: "announcement", action: "delete", id: a.id }); }} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>}
      </div>
    </div>
  );
}
