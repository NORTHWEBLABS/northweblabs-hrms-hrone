"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Code2, Plus, RotateCcw, Check, AlertCircle, Settings2 } from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";
import { parseTemplate, defaultsOf, renderLiquid, DEFAULT_SECTION_TEMPLATE } from "@/lib/liquid";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full grid place-items-center bg-slate-900"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>,
});

const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100";
const Lbl = ({ children }: { children: React.ReactNode }) => <label className="block text-[11px] font-semibold text-slate-500 mb-1">{children}</label>;

function SettingField({ s, value, onChange }: { s: any; value: any; onChange: (v: any) => void }) {
  const t = s.type;
  if (t === "checkbox") return (
    <label className="flex items-center justify-between py-1"><span className="text-sm text-slate-600">{s.label || s.id}</span>
      <button onClick={() => onChange(!value)} className={`relative rounded-full transition ${value ? "bg-indigo-600" : "bg-slate-300"}`} style={{ height: 22, width: 40 }}><span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${value ? "translate-x-[18px]" : ""}`} /></button>
    </label>
  );
  if (t === "select") return (<div><Lbl>{s.label || s.id}</Lbl><select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{(s.options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label || o.value}</option>)}</select></div>);
  if (t === "color") return (<div><Lbl>{s.label || s.id}</Lbl><div className="flex gap-2"><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg border border-slate-200 p-0.5" /><input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div></div>);
  if (t === "number") return (<div><Lbl>{s.label || s.id}</Lbl><input type="number" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>);
  if (t === "textarea" || t === "richtext") return (<div><Lbl>{s.label || s.id}</Lbl><textarea rows={3} className={inputCls + " resize-y"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>);
  return (<div><Lbl>{s.label || s.id}</Lbl><input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>);
}

export default function CodeEditorPage() {
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [template, setTemplate] = useState(DEFAULT_SECTION_TEMPLATE);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tab, setTab] = useState<"settings" | "preview">("preview");

  useEffect(() => {
    fetch("/api/site").then(async (r) => { const j = await r.json(); setCanEdit(!!j.canEdit); }).catch(() => setCanEdit(false));
  }, []);
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(null), 4000); return () => clearTimeout(t); } }, [status]);

  const { body, schema, error } = useMemo(() => parseTemplate(template), [template]);
  const values = useMemo(() => ({ ...defaultsOf(schema), ...overrides }), [schema, overrides]);
  const html = useMemo(() => renderLiquid(body, values), [body, values]);
  const srcDoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${html}</body></html>`;

  const addToHomepage = async () => {
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/site"); const j = await r.json();
      const doc = j.doc;
      if (!doc?.sections) throw new Error("Couldn't load the site draft");
      doc.sections = [...doc.sections, { id: `custom-${Date.now().toString(36)}`, type: "custom", enabled: true, data: { template, settings: overrides } }];
      const sr = await fetch("/api/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", doc }) });
      const sj = await sr.json();
      if (!sr.ok) throw new Error(sj.error || "Save failed");
      setStatus({ ok: true, msg: "Added to homepage draft — open Site editor to position & publish." });
    } catch (e: any) { setStatus({ ok: false, msg: e.message || "Failed" }); }
    finally { setBusy(false); }
  };

  if (canEdit === null) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  if (!canEdit) return <Restricted />;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2"><Code2 className="w-5 h-5 text-indigo-500" /><div><h2 className="text-sm font-bold text-slate-900">Section code editor</h2><p className="text-xs text-slate-400">Write Liquid + HTML with a {"{% schema %}"} block.</p></div></div>
        <div className="flex items-center gap-2">
          {status && <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${status.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{status.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{status.msg}</span>}
          <button onClick={() => { setTemplate(DEFAULT_SECTION_TEMPLATE); setOverrides({}); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"><RotateCcw className="w-3.5 h-3.5" />Reset</button>
          <button onClick={addToHomepage} disabled={busy} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add to homepage</button>
        </div>
      </div>
      {status && <div className={`sm:hidden mb-3 text-xs font-medium px-3 py-2 rounded-lg ${status.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{status.msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* editor */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 h-[560px]">
          <Monaco height="560px" defaultLanguage="html" theme="vs-dark" value={template} onChange={(v) => setTemplate(v || "")} options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false, tabSize: 2 }} />
        </div>

        {/* right: settings + preview */}
        <div className="flex flex-col h-[560px]">
          <div className="flex gap-1 mb-3">
            {([["preview", "Preview"], ["settings", "Settings"]] as [typeof tab, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === k ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{label}</button>
            ))}
            {error && <span className="ml-auto text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</span>}
          </div>

          {tab === "preview" ? (
            <iframe title="preview" srcDoc={srcDoc} className="flex-1 w-full rounded-xl border border-slate-200 bg-white" />
          ) : (
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1"><Settings2 className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">{schema?.name || "Settings"}</span></div>
              {(schema?.settings || []).length === 0 ? <p className="text-xs text-slate-400">No settings in the schema yet.</p> :
                (schema!.settings).map((s: any) => <SettingField key={s.id} s={s} value={values[s.id]} onChange={(v) => setOverrides((o) => ({ ...o, [s.id]: v }))} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
