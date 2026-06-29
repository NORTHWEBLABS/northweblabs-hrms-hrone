"use client";

import { useEffect, useState } from "react";
import { Loader2, Wrench, Check, AlertCircle } from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";

export default function MaintenancePage() {
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/manage?view=settings").then(async (r) => {
      if (r.status === 403) { setDenied(true); return; }
      const j = await r.json();
      setEnabled(!!j.maintenance?.enabled); setMessage(j.maintenance?.message || ""); setLoaded(true);
    }).catch(() => setDenied(true));
  }, []);
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(null), 3000); return () => clearTimeout(t); } }, [status]);

  const save = async () => {
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/admin/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "settings", action: "maintenance", enabled, message }) });
      if (!r.ok) throw new Error();
      setStatus({ ok: true, msg: "Saved" });
    } catch { setStatus({ ok: false, msg: "Failed to save" }); }
    finally { setBusy(false); }
  };

  if (denied) return <Restricted />;
  if (!loaded) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1"><Wrench className="w-5 h-5 text-amber-500" /><h2 className="text-base font-bold text-slate-900">Maintenance mode</h2></div>
        <p className="text-sm text-slate-400 mb-5">When on, you can show a banner across tenant dashboards. (Display wiring is added where your app layout renders.)</p>

        <label className="flex items-center justify-between py-3 px-4 rounded-xl border border-slate-200 cursor-pointer mb-4">
          <div><p className="text-sm font-semibold text-slate-800">Enable maintenance banner</p><p className="text-xs text-slate-400">{enabled ? "Banner is ON" : "Banner is OFF"}</p></div>
          <button onClick={() => setEnabled((v) => !v)} className={`relative w-11 h-6 rounded-full transition ${enabled ? "bg-indigo-600" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${enabled ? "translate-x-5" : ""}`} />
          </button>
        </label>

        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Banner message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="e.g. Scheduled maintenance tonight 11pm–12am IST. Some features may be unavailable."
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-100" />

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save</button>
          {status && <span className={`text-sm font-medium flex items-center gap-1.5 ${status.ok ? "text-emerald-600" : "text-rose-600"}`}>{status.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{status.msg}</span>}
        </div>
      </div>
    </div>
  );
}
