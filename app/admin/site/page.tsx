"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus, Trash2, Copy, Eye, EyeOff, ChevronUp, ChevronDown, ChevronRight,
  Save, Rocket, Palette, Layers, Settings2, X, Loader2, Check, AlertCircle,
  GripVertical, Lock, ExternalLink,
} from "lucide-react";
import { BLOCK_TYPES, SECTION_LIBRARY, newBlock, blockLabel, type Field } from "@/lib/site-schema";

type Doc = { theme: any; header: any; sections: any[] };

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
function setPath(obj: any, path: string, val: any): any {
  return setIn(obj, path.split("."), val);
}
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

/* ---------------- small input atoms ---------------- */
const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300";
const labelCls = "block text-[11px] font-semibold text-slate-500 mb-1";

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

/* ---------------- field renderer ---------------- */
function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (path: string, v: any) => void }) {
  const v = value;
  if (field.k === "text") {
    return <div><Lbl>{field.label}</Lbl><input className={inputCls} value={v ?? ""} placeholder={(field as any).placeholder} onChange={(e) => onChange(field.path, e.target.value)} /></div>;
  }
  if (field.k === "area") {
    return <div><Lbl>{field.label}</Lbl><textarea rows={2} className={inputCls + " resize-y"} value={v ?? ""} onChange={(e) => onChange(field.path, e.target.value)} /></div>;
  }
  if (field.k === "select") {
    return (
      <div><Lbl>{field.label}</Lbl>
        <select className={inputCls} value={v ?? (field as any).options[0]} onChange={(e) => onChange(field.path, e.target.value)}>
          {(field as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.k === "bool") {
    return (
      <label className="flex items-center gap-2 cursor-pointer py-1">
        <input type="checkbox" checked={!!v} onChange={(e) => onChange(field.path, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
        <span className="text-sm text-slate-600">{field.label}</span>
      </label>
    );
  }
  if (field.k === "int") {
    return <div><Lbl>{field.label}</Lbl><input type="number" className={inputCls} value={Number.isFinite(v) ? v : 0} onChange={(e) => onChange(field.path, Number(e.target.value) || 0)} /></div>;
  }
  if (field.k === "strings") {
    const arr: string[] = Array.isArray(v) ? v : [];
    return <div><Lbl>{field.label}</Lbl><textarea rows={2} className={inputCls + " resize-y"} value={arr.join(", ")} placeholder="comma separated" onChange={(e) => onChange(field.path, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /><p className="text-[10px] text-slate-400 mt-0.5">Comma separated</p></div>;
  }
  if (field.k === "numbers") {
    const arr: number[] = Array.isArray(v) ? v : [];
    return <div><Lbl>{field.label}</Lbl><input className={inputCls} value={arr.join(", ")} placeholder="comma separated numbers" onChange={(e) => onChange(field.path, e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)))} /><p className="text-[10px] text-slate-400 mt-0.5">Comma separated numbers</p></div>;
  }
  if (field.k === "repeat") {
    const arr: any[] = Array.isArray(v) ? v : [];
    const setItem = (i: number, subpath: string, val: any) => onChange(`${field.path}.${i}.${subpath}`, val);
    const mutate = (next: any[]) => onChange(field.path, next);
    return (
      <div>
        <Lbl>{field.label}</Lbl>
        <div className="space-y-2">
          {arr.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400">{field.itemLabel} {i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { if (i > 0) { const n = arr.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; mutate(n); } }} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (i < arr.length - 1) { const n = arr.slice(); [n[i + 1], n[i]] = [n[i], n[i + 1]]; mutate(n); } }} disabled={i === arr.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => mutate(arr.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-2">
                {field.fields.map((sf) => (
                  <FieldInput key={sf.path} field={sf} value={getIn(item, sf.path)} onChange={(sp, val) => setItem(i, sp, val)} />
                ))}
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

/* ---------------- per-section form (grouped) ---------------- */
function SectionForm({ type, data, onChange }: { type: string; data: any; onChange: (path: string, v: any) => void }) {
  const def = BLOCK_TYPES[type];
  if (!def) return <p className="text-xs text-slate-400">No editable fields for “{type}”.</p>;
  const groups: { name: string | null; fields: Field[] }[] = [];
  for (const f of def.fields) {
    const g = f.group || null;
    const last = groups[groups.length - 1];
    if (last && last.name === g) last.fields.push(f);
    else groups.push({ name: g, fields: [f] });
  }
  return (
    <div className="space-y-4">
      {groups.map((grp, gi) => (
        <div key={gi}>
          {grp.name && <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2 pb-1 border-b border-slate-100">{grp.name}</div>}
          <div className="space-y-3">
            {grp.fields.map((f) => <FieldInput key={f.path} field={f} value={getIn(data, f.path)} onChange={onChange} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- theme + header panels ---------------- */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-md" />
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer p-0.5" />
      </div>
    </div>
  );
}

/* ---------------- main editor ---------------- */
export default function SiteEditor() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"sections" | "theme" | "header">("sections");
  const [showLibrary, setShowLibrary] = useState(false);
  const [saving, setSaving] = useState<"" | "save" | "publish">("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // load
  useEffect(() => {
    fetch("/api/site")
      .then((r) => r.json())
      .then((j) => {
        setDoc(j.doc);
        setCanEdit(!!j.canEdit);
        if (j.doc?.sections?.[0]) setSelected(j.doc.sections[0].id);
      })
      .catch(() => { setCanEdit(false); });
  }, []);

  // push doc to iframe whenever it changes
  const pushToIframe = useCallback((d: Doc | null) => {
    if (!d) return;
    iframeRef.current?.contentWindow?.postMessage({ source: "nwl-editor", type: "doc", doc: d }, window.location.origin);
  }, []);
  useEffect(() => { pushToIframe(doc); }, [doc, pushToIframe]);

  // resend when preview reports ready
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source === "nwl-preview" && e.data.type === "ready") pushToIframe(doc);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [doc, pushToIframe]);

  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(null), 3500); return () => clearTimeout(t); } }, [status]);

  /* ---- mutators ---- */
  const sections = doc?.sections || [];
  const updateSectionData = (id: string, path: string, val: any) => {
    setDoc((d) => d ? { ...d, sections: d.sections.map((s) => s.id === id ? { ...s, data: setPath(s.data, path, val) } : s) } : d);
  };
  const toggleEnabled = (id: string) => setDoc((d) => d ? { ...d, sections: d.sections.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s) } : d);
  const move = (id: string, dir: -1 | 1) => setDoc((d) => {
    if (!d) return d;
    const i = d.sections.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.sections.length) return d;
    const n = d.sections.slice(); [n[i], n[j]] = [n[j], n[i]];
    return { ...d, sections: n };
  });
  const duplicate = (id: string) => setDoc((d) => {
    if (!d) return d;
    const i = d.sections.findIndex((s) => s.id === id);
    if (i < 0) return d;
    const src = d.sections[i];
    const copy = { ...JSON.parse(JSON.stringify(src)), id: `${src.type}-${Date.now().toString(36)}` };
    const n = d.sections.slice(); n.splice(i + 1, 0, copy);
    return { ...d, sections: n };
  });
  const remove = (id: string) => setDoc((d) => d ? { ...d, sections: d.sections.filter((s) => s.id !== id) } : d);
  const addSection = (type: string) => {
    const b = newBlock(type);
    setDoc((d) => d ? { ...d, sections: [...d.sections, b] } : d);
    setSelected(b.id);
    setShowLibrary(false);
    setTab("sections");
  };
  const updateTheme = (path: string, val: any) => setDoc((d) => d ? { ...d, theme: setPath(d.theme, path, val) } : d);
  const updateHeader = (path: string, val: any) => setDoc((d) => d ? { ...d, header: setPath(d.header, path, val) } : d);

  /* ---- save / publish ---- */
  const save = async (action: "save" | "publish") => {
    if (!doc) return;
    setSaving(action);
    setStatus(null);
    try {
      const r = await fetch("/api/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, doc }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setStatus({ ok: true, msg: action === "publish" ? "Published — live homepage updated" : "Draft saved" });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message || "Failed to save" });
    } finally {
      setSaving("");
    }
  };

  /* ---- gates ---- */
  if (canEdit === null || doc === null) {
    return <div className="fixed inset-0 flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;
  }
  if (!canEdit) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6 text-slate-400" /></div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Restricted</h1>
          <p className="text-sm text-slate-500 mb-5">The site editor is available to the super admin only. Sign in with the owner account to continue.</p>
          <a href="/login?from=/admin/site" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">Go to login</a>
        </div>
      </div>
    );
  }

  const sel = sections.find((s) => s.id === selected) || null;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 text-slate-900">
      {/* top bar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white grid place-items-center text-xs font-bold">N</span>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-bold truncate">Site editor</div>
            <div className="text-[11px] text-slate-400 truncate">Homepage</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${status.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {status.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{status.msg}
            </span>
          )}
          <a href="/preview" target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"><ExternalLink className="w-3.5 h-3.5" />Open preview</a>
          <button onClick={() => save("save")} disabled={!!saving} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
            {saving === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save draft
          </button>
          <button onClick={() => save("publish")} disabled={!!saving} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving === "publish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}Publish
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* left rail tabs */}
        <nav className="w-14 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-1">
          {[
            { id: "sections", icon: Layers, label: "Sections" },
            { id: "theme", icon: Palette, label: "Theme" },
            { id: "header", icon: Settings2, label: "Header" },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === (t.id as any);
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)} title={t.label}
                className={`w-10 h-10 rounded-xl grid place-items-center transition ${active ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
                <Icon className="w-[18px] h-[18px]" />
              </button>
            );
          })}
        </nav>

        {/* control panel */}
        <aside className="w-[360px] max-w-[82vw] shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-0">
          {tab === "sections" && (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold">Sections</h2>
                <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"><Plus className="w-3.5 h-3.5" />Add</button>
              </div>
              <div className="overflow-y-auto flex-1">
                {/* list */}
                <ul className="p-2 space-y-1">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <div className={`group rounded-lg border px-2 py-2 flex items-center gap-1.5 cursor-pointer ${selected === s.id ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`} onClick={() => setSelected(s.id)}>
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${s.enabled ? "text-slate-800" : "text-slate-400 line-through"}`}>{blockLabel(s.type)}</div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); move(s.id, -1); }} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); move(s.id, 1); }} disabled={i === sections.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); toggleEnabled(s.id); }} className="p-1 text-slate-400 hover:text-slate-700" title={s.enabled ? "Hide" : "Show"}>{s.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                          <button onClick={(e) => { e.stopPropagation(); duplicate(s.id); }} className="p-1 text-slate-400 hover:text-slate-700" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete the “${blockLabel(s.type)}” section?`)) { remove(s.id); if (selected === s.id) setSelected(null); } }} className="p-1 text-slate-400 hover:text-rose-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {sections.length === 0 && <li className="text-center text-xs text-slate-400 py-8">No sections. Click “Add”.</li>}
                </ul>

                {/* selected section form */}
                {sel && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold">{blockLabel(sel.type)}</h3>
                    </div>
                    <SectionForm type={sel.type} data={sel.data} onChange={(path, val) => updateSectionData(sel.id, path, val)} />
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "theme" && doc && (
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <h2 className="text-sm font-bold">Theme</h2>
              <div className="space-y-3">
                <ColorRow label="Brand colour" value={doc.theme.brand || ""} onChange={(v) => updateTheme("brand", v)} />
                <ColorRow label="Ink (text)" value={doc.theme.ink || ""} onChange={(v) => updateTheme("ink", v)} />
                <ColorRow label="Background" value={doc.theme.bg || ""} onChange={(v) => updateTheme("bg", v)} />
              </div>
              <div>
                <Lbl>Font</Lbl>
                <select className={inputCls} value={doc.theme.font || "system"} onChange={(e) => updateTheme("font", e.target.value)}>
                  {["system", "inter", "geist"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div><Lbl>Logo text</Lbl><input className={inputCls} value={doc.theme.logoText || ""} onChange={(e) => updateTheme("logoText", e.target.value)} /></div>
                <div><Lbl>Logo accent</Lbl><input className={inputCls} value={doc.theme.logoAccent || ""} onChange={(e) => updateTheme("logoAccent", e.target.value)} /></div>
                <div><Lbl>Logo image URL</Lbl><input className={inputCls} value={doc.theme.logoUrl || ""} onChange={(e) => updateTheme("logoUrl", e.target.value)} placeholder="/logo-nwl.png" /></div>
              </div>
            </div>
          )}

          {tab === "header" && doc && (
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <h2 className="text-sm font-bold">Header &amp; nav</h2>
              <FieldInput
                field={{ k: "repeat", path: "nav", label: "Nav links", itemLabel: "Link", fields: [{ k: "text", path: "label", label: "Label" }, { k: "text", path: "href", label: "Link" }] }}
                value={doc.header.nav}
                onChange={(path, val) => updateHeader(path, val)}
              />
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div><Lbl>Sign-in label</Lbl><input className={inputCls} value={doc.header.signinLabel || ""} onChange={(e) => updateHeader("signinLabel", e.target.value)} /></div>
                <div><Lbl>CTA label</Lbl><input className={inputCls} value={doc.header.ctaLabel || ""} onChange={(e) => updateHeader("ctaLabel", e.target.value)} /></div>
                <div><Lbl>CTA link</Lbl><input className={inputCls} value={doc.header.ctaHref || ""} onChange={(e) => updateHeader("ctaHref", e.target.value)} /></div>
              </div>
            </div>
          )}
        </aside>

        {/* live preview */}
        <main className="flex-1 min-w-0 bg-slate-200/60 p-3 sm:p-5">
          <div className="h-full w-full rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm">
            <iframe ref={iframeRef} src="/preview" title="Live preview" className="w-full h-full border-0" />
          </div>
        </main>
      </div>

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