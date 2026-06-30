"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus, Trash2, Copy, Eye, EyeOff, ChevronUp, ChevronDown,
  Save, Rocket, Palette, Layers, Settings2, X, Loader2, Check, AlertCircle,
  GripVertical, Lock, ExternalLink, Monitor, Tablet, Smartphone, Pipette,
} from "lucide-react";
import { BLOCK_TYPES, SECTION_LIBRARY, newBlock, blockLabel, type Field } from "@/lib/site-schema";
import { parseTemplate, defaultsOf } from "@/lib/liquid";
import { Code2, ArrowLeft } from "lucide-react";

type Doc = { theme: any; header: any; sections: any[] };
type Target = { kind: "section"; id: string } | { kind: "theme" } | { kind: "header" } | null;
type Device = "desktop" | "tablet" | "mobile";
type MView = "layers" | "preview" | "inspector";

/* ---------------- immutable path helpers ---------------- */
function getIn(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[/^\d+$/.test(k) ? Number(k) : k]), obj);
}
function setIn(obj: any, parts: (string | number)[], val: any): any {
  if (parts.length === 0) return val;
  const [head, ...rest] = parts;
  const key = typeof head === "string" && /^\d+$/.test(head) ? Number(head) : head;
  const base = Array.isArray(obj) ? obj.slice() : { ...(obj || {}) };
  base[key as any] = setIn(obj ? obj[key as any] : undefined, rest, val);
  return base;
}
function setPath(obj: any, path: string, val: any): any { return setIn(obj, path.split("."), val); }
function blankItem(fields: Field[]): any {
  const o: any = {};
  for (const f of fields) {
    if (f.k === "int") o[f.path] = 0;
    else if (f.k === "bool") o[f.path] = false;
    else if (f.k === "strings" || f.k === "numbers") o[f.path] = [];
    else if (f.k === "select") o[f.path] = (f as any).options[0];
    else o[f.path] = "";
  }
  return o;
}
function groupFields(fields: Field[]): { name: string; fields: Field[] }[] {
  const out: { name: string; fields: Field[] }[] = [];
  for (const f of fields) {
    const g = f.group || "Content";
    const last = out[out.length - 1];
    if (last && last.name === g) last.fields.push(f);
    else out.push({ name: g, fields: [f] });
  }
  return out;
}

/* ---------------- shared styles ---------------- */
const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300";
const Lbl = ({ children }: { children: React.ReactNode }) => <label className="block text-[11px] font-semibold text-slate-500 mb-1">{children}</label>;

/* ---------------- advanced colour field ---------------- */
const SWATCHES = ["#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#db2777", "#e11d48", "#f59e0b", "#16a34a", "#10b981", "#14b8a6", "#0ea5e9", "#0b1220", "#475569", "#94a3b8", "#ffffff"];
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = value || "";
  const valid = /^#[0-9a-fA-F]{6}$/.test(hex);
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
  const pickEye = async () => {
    try { const r = await new (window as any).EyeDropper().open(); if (r?.sRGBHex) onChange(r.sRGBHex); } catch {}
  };
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div className="flex items-center gap-2">
        <div className="relative w-9 h-9 shrink-0 rounded-lg border border-slate-200 overflow-hidden">
          <input type="color" value={valid ? hex : "#000000"} onChange={(e) => onChange(e.target.value)} className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer p-0 border-0" />
        </div>
        <input value={hex} onChange={(e) => onChange(e.target.value)} className={inputCls + " font-mono"} placeholder="#2563eb" />
        {hasEyeDropper && (
          <button onClick={pickEye} title="Pick from screen" className="w-9 h-9 shrink-0 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Pipette className="w-4 h-4" /></button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {SWATCHES.map((c) => (
          <button key={c} onClick={() => onChange(c)} title={c}
            className={`w-6 h-6 rounded-md border transition ${hex.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-indigo-500 border-transparent" : "border-slate-200 hover:scale-110"}`}
            style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- generic field input ---------------- */
function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (path: string, v: any) => void }) {
  const v = value;
  if (field.k === "text") return <div><Lbl>{field.label}</Lbl><input className={inputCls} value={v ?? ""} placeholder={(field as any).placeholder} onChange={(e) => onChange(field.path, e.target.value)} /></div>;
  if (field.k === "area") return <div><Lbl>{field.label}</Lbl><textarea rows={2} className={inputCls + " resize-y"} value={v ?? ""} onChange={(e) => onChange(field.path, e.target.value)} /></div>;
  if (field.k === "select") return (
    <div><Lbl>{field.label}</Lbl>
      <select className={inputCls} value={v ?? (field as any).options[0]} onChange={(e) => onChange(field.path, e.target.value)}>
        {(field as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  if (field.k === "bool") return (
    <label className="flex items-center gap-2 cursor-pointer py-0.5">
      <input type="checkbox" checked={!!v} onChange={(e) => onChange(field.path, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
      <span className="text-sm text-slate-600">{field.label}</span>
    </label>
  );
  if (field.k === "int") return <div><Lbl>{field.label}</Lbl><input type="number" className={inputCls} value={Number.isFinite(v) ? v : 0} onChange={(e) => onChange(field.path, Number(e.target.value) || 0)} /></div>;
  if (field.k === "strings") {
    const arr: string[] = Array.isArray(v) ? v : [];
    return <div><Lbl>{field.label}</Lbl><textarea rows={2} className={inputCls + " resize-y"} value={arr.join(", ")} onChange={(e) => onChange(field.path, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /><p className="text-[10px] text-slate-400 mt-0.5">Comma separated</p></div>;
  }
  if (field.k === "numbers") {
    const arr: number[] = Array.isArray(v) ? v : [];
    return <div><Lbl>{field.label}</Lbl><input className={inputCls} value={arr.join(", ")} onChange={(e) => onChange(field.path, e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)))} /><p className="text-[10px] text-slate-400 mt-0.5">Comma separated numbers</p></div>;
  }
  if (field.k === "repeat") {
    const arr: any[] = Array.isArray(v) ? v : [];
    const mutate = (next: any[]) => onChange(field.path, next);
    return (
      <div>
        <Lbl>{field.label}</Lbl>
        <div className="space-y-2">
          {arr.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400">{field.itemLabel} {i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { if (i > 0) { const n = arr.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; mutate(n); } }} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (i < arr.length - 1) { const n = arr.slice(); [n[i + 1], n[i]] = [n[i], n[i + 1]]; mutate(n); } }} disabled={i === arr.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => mutate(arr.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-2">
                {field.fields.map((sf) => <FieldInput key={sf.path} field={sf} value={getIn(item, sf.path)} onChange={(sp, val) => onChange(`${field.path}.${i}.${sp}`, val)} />)}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => mutate([...arr, blankItem(field.fields)])} className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50">
          <Plus className="w-3.5 h-3.5" /> Add {field.itemLabel.toLowerCase()}
        </button>
      </div>
    );
  }
  return null;
}

/* ---------------- accordion (single-open) ---------------- */
function Accordion({ items }: { items: { name: string; body: React.ReactNode }[] }) {
  const key = items.map((i) => i.name).join("|");
  const [open, setOpen] = useState<string | null>(items[0]?.name ?? null);
  useEffect(() => { setOpen(items[0]?.name ?? null); }, [key]); // reset when target changes
  return (
    <div>
      {items.map((it) => {
        const isOpen = open === it.name;
        return (
          <div key={it.name} className="border-b border-slate-100 last:border-0">
            <button onClick={() => setOpen(isOpen ? null : it.name)} className="w-full flex items-center justify-between py-3 text-left">
              <span className="text-[12px] font-bold uppercase tracking-wide text-slate-600">{it.name}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="pb-4 space-y-3">{it.body}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- custom section inspector (schema-driven) ---------------- */
function SettingField({ s, value, onChange }: { s: any; value: any; onChange: (v: any) => void }) {
  const t = s.type;
  if (t === "checkbox") return (
    <label className="flex items-center justify-between py-1"><span className="text-sm text-slate-600">{s.label || s.id}</span>
      <button onClick={() => onChange(!value)} className={`relative w-10 h-5.5 rounded-full transition ${value ? "bg-indigo-600" : "bg-slate-300"}`} style={{ height: 22, width: 40 }}><span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${value ? "translate-x-[18px]" : ""}`} /></button>
    </label>
  );
  if (t === "select") return (<div><Lbl>{s.label || s.id}</Lbl><select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{(s.options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label || o.value}</option>)}</select></div>);
  if (t === "color") return (<div><Lbl>{s.label || s.id}</Lbl><div className="flex gap-2"><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg border border-slate-200 p-0.5" /><input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div></div>);
  if (t === "number") return (<div><Lbl>{s.label || s.id}</Lbl><input type="number" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>);
  if (t === "textarea" || t === "richtext") return (<div><Lbl>{s.label || s.id}</Lbl><textarea rows={3} className={inputCls + " resize-y"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>);
  return (<div><Lbl>{s.label || s.id}</Lbl><input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />{s.info && <p className="text-[10px] text-slate-400 mt-0.5">{s.info}</p>}</div>);
}
function CustomEditor({ data, onChange }: { data: any; onChange: (path: string, v: any) => void }) {
  const template = String(data?.template || "");
  const { schema, error } = parseTemplate(template);
  const settings = schema?.settings || [];
  const defs = defaultsOf(schema);
  const overrides = data?.settings || {};
  return (
    <div className="space-y-3 py-2">
      <a href={data?.file ? `/admin/code?file=${encodeURIComponent(data.file)}` : "/admin/code"} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
        <Code2 className="w-3.5 h-3.5" />{data?.file ? `Edit ${data.file}` : "Open Code editor"}
      </a>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      {settings.length === 0 ? (
        <p className="text-xs text-slate-400">No <code className="px-1 bg-slate-100 rounded">{"{% schema %}"}</code> settings found. Add some in the Code editor.</p>
      ) : (
        settings.map((s: any) => <SettingField key={s.id} s={s} value={overrides[s.id] ?? defs[s.id]} onChange={(v) => onChange(`settings.${s.id}`, v)} />)
      )}
    </div>
  );
}

/* ============================================================
   Editor
   ============================================================ */
export default function SiteEditor() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [mView, setMView] = useState<MView>("preview");
  const [showLibrary, setShowLibrary] = useState(false);
  const [saving, setSaving] = useState<"" | "save" | "publish">("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    fetch("/api/site").then((r) => r.json()).then((j) => {
      setDoc(j.doc); setCanEdit(!!j.canEdit);
      if (j.doc?.sections?.[0]) setTarget({ kind: "section", id: j.doc.sections[0].id });
    }).catch(() => setCanEdit(false));
  }, []);

  const pushToIframe = useCallback((d: Doc | null) => {
    if (!d) return;
    iframeRef.current?.contentWindow?.postMessage({ source: "nwl-editor", type: "doc", doc: d }, window.location.origin);
  }, []);
  useEffect(() => { pushToIframe(doc); }, [doc, pushToIframe]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.source === "nwl-preview" && e.data.type === "ready") pushToIframe(doc); };
    window.addEventListener("message", onMsg); return () => window.removeEventListener("message", onMsg);
  }, [doc, pushToIframe]);
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(null), 3500); return () => clearTimeout(t); } }, [status]);

  const sections = doc?.sections || [];

  /* mutators */
  const updateSectionData = (id: string, path: string, val: any) => setDoc((d) => d ? { ...d, sections: d.sections.map((s) => s.id === id ? { ...s, data: setPath(s.data, path, val) } : s) } : d);
  const toggleEnabled = (id: string) => setDoc((d) => d ? { ...d, sections: d.sections.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s) } : d);
  const move = (id: string, dir: -1 | 1) => setDoc((d) => {
    if (!d) return d;
    const i = d.sections.findIndex((s) => s.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= d.sections.length) return d;
    const n = d.sections.slice(); [n[i], n[j]] = [n[j], n[i]]; return { ...d, sections: n };
  });
  const duplicate = (id: string) => setDoc((d) => {
    if (!d) return d;
    const i = d.sections.findIndex((s) => s.id === id); if (i < 0) return d;
    const src = d.sections[i];
    const copy = { ...JSON.parse(JSON.stringify(src)), id: `${src.type}-${Date.now().toString(36)}` };
    const n = d.sections.slice(); n.splice(i + 1, 0, copy); return { ...d, sections: n };
  });
  const remove = (id: string) => setDoc((d) => d ? { ...d, sections: d.sections.filter((s) => s.id !== id) } : d);
  const addSection = (type: string) => {
    const b = newBlock(type);
    setDoc((d) => d ? { ...d, sections: [...d.sections, b] } : d);
    setTarget({ kind: "section", id: b.id }); setShowLibrary(false); setMView("inspector");
  };
  const updateTheme = (path: string, val: any) => setDoc((d) => d ? { ...d, theme: setPath(d.theme, path, val) } : d);
  const updateHeader = (path: string, val: any) => setDoc((d) => d ? { ...d, header: setPath(d.header, path, val) } : d);

  const selectSection = (id: string) => { setTarget({ kind: "section", id }); setMView("inspector"); };
  const openTheme = () => { setTarget({ kind: "theme" }); setMView("inspector"); };
  const openHeader = () => { setTarget({ kind: "header" }); setMView("inspector"); };

  const save = async (action: "save" | "publish") => {
    if (!doc) return;
    setSaving(action); setStatus(null);
    try {
      const r = await fetch("/api/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, doc }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setStatus({ ok: true, msg: action === "publish" ? "Published — live homepage updated" : "Draft saved" });
    } catch (e: any) { setStatus({ ok: false, msg: e.message || "Failed to save" }); }
    finally { setSaving(""); }
  };

  /* gates */
  if (canEdit === null || doc === null)
    return <div className="fixed inset-0 grid place-items-center bg-slate-50"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;
  if (!canEdit)
    return (
      <div className="fixed inset-0 grid place-items-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl grid place-items-center mx-auto mb-4"><Lock className="w-6 h-6 text-slate-400" /></div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Restricted</h1>
          <p className="text-sm text-slate-500 mb-5">The site editor is available to the super admin only.</p>
          <a href="/login?from=/admin/site" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">Go to login</a>
        </div>
      </div>
    );

  const sel = target?.kind === "section" ? sections.find((s) => s.id === target.id) || null : null;
  const deviceW = device === "mobile" ? 390 : device === "tablet" ? 834 : 0; // 0 = full width

  const inspectorTitle = target?.kind === "theme" ? "Theme" : target?.kind === "header" ? "Header & nav" : sel ? blockLabel(sel.type) : "Inspector";
  const inspectorBody = (() => {
    if (target?.kind === "theme") {
      return (
        <Accordion items={[
          { name: "Colours", body: (<>
            <ColorField label="Brand colour" value={doc.theme.brand || ""} onChange={(v) => updateTheme("brand", v)} />
            <ColorField label="Ink (text)" value={doc.theme.ink || ""} onChange={(v) => updateTheme("ink", v)} />
            <ColorField label="Background" value={doc.theme.bg || ""} onChange={(v) => updateTheme("bg", v)} />
          </>) },
          { name: "Typography", body: (<div><Lbl>Font</Lbl><select className={inputCls} value={doc.theme.font || "system"} onChange={(e) => updateTheme("font", e.target.value)}>{["system", "inter", "geist"].map((f) => <option key={f} value={f}>{f}</option>)}</select></div>) },
          { name: "Logo", body: (<>
            <div><Lbl>Logo text</Lbl><input className={inputCls} value={doc.theme.logoText || ""} onChange={(e) => updateTheme("logoText", e.target.value)} /></div>
            <div><Lbl>Logo accent</Lbl><input className={inputCls} value={doc.theme.logoAccent || ""} onChange={(e) => updateTheme("logoAccent", e.target.value)} /></div>
            <div><Lbl>Logo image URL</Lbl><input className={inputCls} value={doc.theme.logoUrl || ""} onChange={(e) => updateTheme("logoUrl", e.target.value)} placeholder="/logo-nwl.png" /></div>
          </>) },
        ]} />
      );
    }
    if (target?.kind === "header") {
      return (
        <Accordion items={[
          { name: "Navigation", body: (<FieldInput field={{ k: "repeat", path: "nav", label: "Nav links", itemLabel: "Link", fields: [{ k: "text", path: "label", label: "Label" }, { k: "text", path: "href", label: "Link" }] }} value={doc.header.nav} onChange={(p, v) => updateHeader(p, v)} />) },
          { name: "Buttons", body: (<>
            <div><Lbl>Sign-in label</Lbl><input className={inputCls} value={doc.header.signinLabel || ""} onChange={(e) => updateHeader("signinLabel", e.target.value)} /></div>
            <div><Lbl>CTA label</Lbl><input className={inputCls} value={doc.header.ctaLabel || ""} onChange={(e) => updateHeader("ctaLabel", e.target.value)} /></div>
            <div><Lbl>CTA link</Lbl><input className={inputCls} value={doc.header.ctaHref || ""} onChange={(e) => updateHeader("ctaHref", e.target.value)} /></div>
          </>) },
        ]} />
      );
    }
    if (sel) {
      const def = BLOCK_TYPES[sel.type];
      if (sel.type === "custom") return <CustomEditor data={sel.data} onChange={(p, v) => updateSectionData(sel.id, p, v)} />;
      if (!def) return <p className="text-xs text-slate-400 py-6 text-center">No editable fields.</p>;
      const groups = groupFields(def.fields);
      return <Accordion items={groups.map((g) => ({ name: g.name, body: <div className="space-y-3">{g.fields.map((f) => <FieldInput key={f.path} field={f} value={getIn(sel.data, f.path)} onChange={(p, v) => updateSectionData(sel.id, p, v)} />)}</div> }))} />;
    }
    return <p className="text-xs text-slate-400 py-6 text-center">Select a section to edit.</p>;
  })();

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 text-slate-900">
      {/* top bar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <a href="/admin" className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 shrink-0" title="Back to console"><ArrowLeft className="w-4 h-4" /></a>
          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white grid place-items-center text-xs font-bold shrink-0">N</span>
          <div className="text-sm font-bold truncate hidden sm:block">Site editor</div>
        </div>

        <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as [Device, any][]).map(([d, Icon]) => (
            <button key={d} onClick={() => setDevice(d)} title={d} className={`w-8 h-8 grid place-items-center rounded-md transition ${device === d ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}><Icon className="w-4 h-4" /></button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {status && <span className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${status.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{status.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{status.msg}</span>}
          <a href="/preview" target="_blank" rel="noreferrer" className="hidden md:grid w-9 h-9 place-items-center text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50" title="Open preview in new tab"><ExternalLink className="w-4 h-4" /></a>
          <button onClick={() => save("save")} disabled={!!saving} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">{saving === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}<span className="hidden sm:inline">Save</span></button>
          <button onClick={() => save("publish")} disabled={!!saving} className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving === "publish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}Publish</button>
        </div>
      </header>

      {status && <div className={`md:hidden px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${status.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{status.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{status.msg}</div>}

      <div className="flex-1 flex min-h-0">
        {/* LEFT — layers */}
        <aside className={`${mView === "layers" ? "flex" : "hidden"} lg:flex w-full lg:w-[260px] shrink-0 bg-white border-r border-slate-200 flex-col min-h-0`}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5"><Layers className="w-4 h-4 text-slate-400" />Layers</h2>
            <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"><Plus className="w-3.5 h-3.5" />Add</button>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            <ul className="space-y-1">
              {sections.map((s, i) => {
                const active = target?.kind === "section" && target.id === s.id;
                return (
                  <li key={s.id}>
                    <div className={`group rounded-lg border px-2 py-2 flex items-center gap-1 cursor-pointer ${active ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 hover:border-slate-300"}`} onClick={() => selectSection(s.id)}>
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className={`flex-1 min-w-0 text-sm font-medium truncate ${s.enabled ? "text-slate-800" : "text-slate-400 line-through"}`}>{blockLabel(s.type)}</span>
                      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); move(s.id, -1); }} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); move(s.id, 1); }} disabled={i === sections.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleEnabled(s.id); }} className="p-1 text-slate-400 hover:text-slate-700">{s.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                        <button onClick={(e) => { e.stopPropagation(); duplicate(s.id); }} className="p-1 text-slate-400 hover:text-slate-700"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete \u201c${blockLabel(s.type)}\u201d?`)) { remove(s.id); if (active) setTarget(null); } }} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {sections.length === 0 && <li className="text-center text-xs text-slate-400 py-8">No sections. Tap “Add”.</li>}
            </ul>
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
              <button onClick={openTheme} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium ${target?.kind === "theme" ? "bg-indigo-50/60 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}><Palette className="w-4 h-4" />Theme</button>
              <button onClick={openHeader} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium ${target?.kind === "header" ? "bg-indigo-50/60 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}><Settings2 className="w-4 h-4" />Header &amp; nav</button>
            </div>
          </div>
        </aside>

        {/* CENTER — preview */}
        <main className={`${mView === "preview" ? "flex" : "hidden"} lg:flex flex-1 min-w-0 bg-slate-200/60 flex-col min-h-0`}>
          <div className="lg:hidden flex items-center justify-center gap-1 bg-white/70 border-b border-slate-200 py-1.5">
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as [Device, any][]).map(([d, Icon]) => (
              <button key={d} onClick={() => setDevice(d)} className={`w-8 h-8 grid place-items-center rounded-md ${device === d ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}><Icon className="w-4 h-4" /></button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-3 sm:p-5 flex justify-center items-start">
            <div className="h-full bg-white rounded-xl overflow-hidden border border-slate-300 shadow-sm transition-all" style={{ width: deviceW ? deviceW : "100%", maxWidth: "100%" }}>
              <iframe ref={iframeRef} src="/preview" title="Live preview" className="w-full h-full border-0" style={{ minHeight: 480 }} />
            </div>
          </div>
        </main>

        {/* RIGHT — inspector */}
        <aside className={`${mView === "inspector" ? "flex" : "hidden"} lg:flex w-full lg:w-[348px] shrink-0 bg-white border-l border-slate-200 flex-col min-h-0`}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold truncate flex-1">{inspectorTitle}</h2>
          </div>
          <div className="overflow-y-auto flex-1 px-4">{inspectorBody}</div>
        </aside>
      </div>

      {/* mobile bottom nav */}
      <nav className="lg:hidden h-14 shrink-0 bg-white border-t border-slate-200 grid grid-cols-3">
        {([["layers", Layers, "Layers"], ["preview", Monitor, "Preview"], ["inspector", Settings2, "Inspector"]] as [MView, any, string][]).map(([v, Icon, label]) => (
          <button key={v} onClick={() => setMView(v)} className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${mView === v ? "text-indigo-600" : "text-slate-400"}`}><Icon className="w-5 h-5" />{label}</button>
        ))}
      </nav>

      {/* add-section library */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLibrary(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold">Add a section</h2>
              <button onClick={() => setShowLibrary(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5 max-h-[70vh] overflow-y-auto">
              {SECTION_LIBRARY.map((b) => (
                <button key={b.type} onClick={() => addSection(b.type)} className="text-left rounded-xl border border-slate-200 p-3.5 hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                  <div className="text-sm font-semibold text-slate-800">{b.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{b.type}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
