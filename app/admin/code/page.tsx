"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Loader2, Code2, FilePlus2, RotateCcw, Check, AlertCircle, Settings2, Eye, EyeOff,
  ArrowLeft, Maximize2, Minimize2, FileEdit,
} from "lucide-react";
import { Restricted } from "@/components/admin/AdminShell";
import { parseTemplate, defaultsOf, renderLiquid, DEFAULT_SECTION_TEMPLATE } from "@/lib/liquid";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full grid place-items-center bg-white"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>,
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
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelFull, setPanelFull] = useState(false);
  const [tab, setTab] = useState<"preview" | "settings">("preview");

  useEffect(() => {
    fetch("/api/site").then(async (r) => { const j = await r.json(); setCanEdit(!!j.canEdit); }).catch(() => setCanEdit(false));
    // preview collapsed by default on tablet / small screens
    if (typeof window !== "undefined") setPanelOpen(window.innerWidth >= 1024);
  }, []);
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(null), 4000); return () => clearTimeout(t); } }, [status]);

  const { body, schema, error } = useMemo(() => parseTemplate(template), [template]);
  const values = useMemo(() => ({ ...defaultsOf(schema), ...overrides }), [schema, overrides]);
  const html = useMemo(() => renderLiquid(body, values), [body, values]);
  const srcDoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${html}</body></html>`;

  const onEdit = (v?: string) => { setTemplate(v || ""); setSaved(false); };

  const addToDraft = async () => {
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/site"); const j = await r.json();
      const doc = j.doc;
      if (!doc?.sections) throw new Error("Couldn't load the site draft");
      doc.sections = [...doc.sections, { id: `custom-${Date.now().toString(36)}`, type: "custom", enabled: true, data: { template, settings: overrides } }];
      const sr = await fetch("/api/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", doc }) });
      const sj = await sr.json();
      if (!sr.ok) throw new Error(sj.error || "Save failed");
      setSaved(true);
      setStatus({ ok: true, msg: "Added to homepage draft — open Site editor to position & publish." });
    } catch (e: any) { setStatus({ ok: false, msg: e.message || "Failed" }); }
    finally { setBusy(false); }
  };

  if (canEdit === null) return <div className="fixed inset-0 grid place-items-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  if (!canEdit) return <Restricted />;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 text-slate-900">
      {/* top bar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <a href="/admin" className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="Back to console"><ArrowLeft className="w-4 h-4" /></a>
          <Code2 className="w-5 h-5 text-indigo-500 shrink-0" />
          <span className="text-sm font-bold truncate hidden sm:block">Code editor</span>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
            <FileEdit className="w-3 h-3" />{saved ? "In draft" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {status && <span className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${status.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{status.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{status.msg}</span>}
          <button onClick={() => setPanelOpen((v) => !v)} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50" title={panelOpen ? "Hide preview" : "Show preview"}>
            {panelOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}<span className="hidden sm:inline">Preview</span>
          </button>
          <button onClick={() => { setTemplate(DEFAULT_SECTION_TEMPLATE); setOverrides({}); setSaved(false); }} className="w-9 h-9 grid place-items-center text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50" title="Reset"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={addToDraft} disabled={busy} className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}<span className="hidden sm:inline">Add to draft</span></button>
        </div>
      </header>

      {status && <div className={`md:hidden px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${status.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{status.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{status.msg}</div>}

      <div className="flex-1 flex min-h-0 relative">
        {/* editor */}
        <div className={`${panelFull ? "hidden" : "flex"} flex-1 min-w-0 p-3`}>
          <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 bg-white">
            <Monaco height="100%" defaultLanguage="html" theme="vs" value={template} onChange={onEdit} options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false, tabSize: 2, padding: { top: 12 }, lineNumbersMinChars: 3 }} />
          </div>
        </div>

        {/* backdrop on small screens when panel open */}
        {panelOpen && !panelFull && <div className="lg:hidden absolute inset-0 bg-black/30 z-10" onClick={() => setPanelOpen(false)} />}

        {/* preview / settings panel */}
        {panelOpen && (
          <aside className={`flex flex-col bg-white border-l border-slate-200 min-h-0 z-20
            ${panelFull ? "flex-1" : "absolute lg:static inset-y-0 right-0 w-full sm:w-[480px] shadow-2xl lg:shadow-none"}`}>
            <div className="h-11 shrink-0 border-b border-slate-100 flex items-center justify-between px-2.5">
              <div className="flex gap-1">
                {([["preview", "Preview"], ["settings", "Settings"]] as [typeof tab, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === k ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {error && <span className="text-[11px] text-rose-500 flex items-center gap-1 mr-1"><AlertCircle className="w-3.5 h-3.5" />schema</span>}
                <button onClick={() => setPanelFull((v) => !v)} className="hidden lg:grid w-8 h-8 place-items-center text-slate-400 hover:text-slate-700 rounded-lg" title={panelFull ? "Split view" : "Full-screen preview"}>{panelFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                <button onClick={() => setPanelOpen(false)} className="lg:hidden w-8 h-8 grid place-items-center text-slate-400 rounded-lg"><EyeOff className="w-4 h-4" /></button>
              </div>
            </div>

            {tab === "preview" ? (
              <iframe title="preview" srcDoc={srcDoc} className="flex-1 w-full bg-white" />
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1"><Settings2 className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">{schema?.name || "Settings"}</span></div>
                {error && <p className="text-xs text-rose-500">{error}</p>}
                {(schema?.settings || []).length === 0 ? <p className="text-xs text-slate-400">No settings in the schema yet.</p> :
                  (schema!.settings).map((s: any) => <SettingField key={s.id} s={s} value={values[s.id]} onChange={(v) => setOverrides((o) => ({ ...o, [s.id]: v }))} />)}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}