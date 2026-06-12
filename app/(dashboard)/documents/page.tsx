"use client";
// Route: app/(dashboard)/documents/page.tsx
// Document Archive — PAN, Aadhaar, agreements, policies, employee docs

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Search, X, Loader2, CheckCircle2, AlertCircle,
  Upload, Trash2, Download,
  Calendar, FolderOpen, Users, Building2,
  ExternalLink, File,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

interface Doc { id: string; entity_type: string; entity_name: string | null; doc_type: string; doc_name: string; file_url: string | null; file_size: number | null; expiry_date: string | null; tags: string[] | null; notes: string | null; created_at: string; }

const DOC_TYPES = [
  { value: "pan_card", label: "PAN Card", icon: "🆔" },
  { value: "aadhaar", label: "Aadhaar Card", icon: "🪪" },
  { value: "gst_certificate", label: "GST Certificate", icon: "📋" },
  { value: "agreement", label: "Agreement / Contract", icon: "📝" },
  { value: "policy", label: "Company Policy", icon: "📜" },
  { value: "offer_letter", label: "Offer Letter", icon: "✉️" },
  { value: "id_proof", label: "ID Proof", icon: "🪪" },
  { value: "address_proof", label: "Address Proof", icon: "🏠" },
  { value: "bank_proof", label: "Bank Proof", icon: "🏦" },
  { value: "invoice", label: "Invoice / Bill", icon: "🧾" },
  { value: "tax_return", label: "Tax Return", icon: "📊" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "other", label: "Other", icon: "📎" },
];

const ENTITY_TYPES = [
  { value: "employee", label: "Employee", icon: <Users className="w-4 h-4" /> },
  { value: "organization", label: "Organization", icon: <Building2 className="w-4 h-4" /> },
  { value: "vendor", label: "Vendor", icon: <FolderOpen className="w-4 h-4" /> },
  { value: "customer", label: "Customer", icon: <Users className="w-4 h-4" /> },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onSave, onClose }: { onSave: (d: Doc) => void; onClose: () => void }) {
  const sb = useSB();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [f, setF] = useState({ entity_type: "employee", entity_name: "", doc_type: "pan_card", doc_name: "", expiry_date: "", tags: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError("Max 10MB"); return; }
    setFile(file);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
    if (!f.doc_name) s("doc_name", file.name.replace(/\.[^.]+$/, ""));
  };

  const save = async () => {
    if (!f.doc_name.trim()) { setError("Document name required"); return; }
    setSaving(true);
    const orgId = await getOrgId(sb);
    if (!orgId) { setError("No org"); setSaving(false); return; }
    let fileUrl = "";
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/${f.doc_type}/${Date.now()}.${ext}`;
      const { error: ue } = await sb.storage.from("documents").upload(path, file, { upsert: true });
      if (ue) { setError("Upload failed: " + ue.message); setSaving(false); return; }
      const { data: urlData } = sb.storage.from("documents").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }
    const { data, error: ie } = await sb.from("document_archive").insert({
      org_id: orgId, entity_type: f.entity_type, entity_name: f.entity_name || null,
      doc_type: f.doc_type, doc_name: f.doc_name.trim(), file_url: fileUrl || null,
      file_size: file?.size || null, expiry_date: f.expiry_date || null,
      tags: f.tags ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
      notes: f.notes || null,
    }).select().single();
    if (ie) { setError(ie.message); setSaving(false); return; }
    onSave(data as Doc); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold flex items-center gap-2"><Upload className="w-5 h-5" />Upload document</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          {/* File upload */}
          {file ? (
            <div className="relative">
              {preview ? <img src={preview} alt="" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                : <div className="w-full h-24 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center gap-3"><File className="w-6 h-6 text-gray-400" /><div><p className="text-sm font-medium text-gray-900">{file.name}</p><p className="text-xs text-gray-400">{fmtSize(file.size)}</p></div></div>}
              <button onClick={() => { setFile(null); setPreview(""); }} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white shadow"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 transition flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-500">
              <Upload className="w-6 h-6" /><span className="text-xs font-medium">Click to upload</span><span className="text-[10px]">PDF, JPG, PNG (max 10MB)</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Document type</label>
              <select value={f.doc_type} onChange={e => s("doc_type", e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Belongs to</label>
              <select value={f.entity_type} onChange={e => s("entity_type", e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Document name *</label><input value={f.doc_name} onChange={e => s("doc_name", e.target.value)} placeholder="e.g. Rahul PAN Card" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Person / Entity name</label><input value={f.entity_name} onChange={e => s("entity_name", e.target.value)} placeholder="Rahul Sharma" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Expiry date</label><input type="date" value={f.expiry_date} onChange={e => s("expiry_date", e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tags (comma separated)</label><input value={f.tags} onChange={e => s("tags", e.target.value)} placeholder="hr, finance" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><input value={f.notes} onChange={e => s("notes", e.target.value)} placeholder="Optional" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm text-white bg-indigo-600 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Upload</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const sb = useSB();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [preview, setPreview] = useState<Doc | null>(null);

  const fetchDocs = useCallback(async () => {
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    const { data } = await sb.from("document_archive").select("*").eq("org_id", oid).order("created_at", { ascending: false });
    setDocs((data || []) as Doc[]);
    setLoading(false);
  }, [sb]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const deletDoc = async (id: string) => {
    await sb.from("document_archive").delete().eq("id", id);
    setDocs(p => p.filter(d => d.id !== id));
    setToast({ msg: "Document deleted", type: "success" });
  };

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.doc_name.toLowerCase().includes(q) || d.entity_name?.toLowerCase().includes(q) || d.doc_type.includes(q))
      && (!typeFilter || d.doc_type === typeFilter)
      && (!entityFilter || d.entity_type === entityFilter);
  });

  // Stats
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    docs.forEach(d => { map[d.doc_type] = (map[d.doc_type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [docs]);

  const expiringSoon = docs.filter(d => {
    if (!d.expiry_date) return false;
    const diff = new Date(d.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  });

  const expired = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date());

  return (
    <div className="max-w-7xl mx-auto">
      {showUpload && <UploadModal onSave={d => { setDocs(p => [d, ...p]); setToast({ msg: "Document uploaded", type: "success" }); }} onClose={() => setShowUpload(false)} />}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div><h3 className="text-sm font-bold text-gray-900">{preview.doc_name}</h3><p className="text-xs text-gray-400">{DOC_TYPES.find(t => t.value === preview.doc_type)?.label} · {preview.entity_name || preview.entity_type}</p></div>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              {preview.file_url ? (
                preview.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <img src={preview.file_url} alt={preview.doc_name} className="w-full max-h-[60vh] object-contain rounded-xl" />
                : <div className="text-center py-10"><File className="w-12 h-12 text-gray-300 mx-auto mb-3" /><a href={preview.file_url} target="_blank" rel="noopener" className="text-sm text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1"><ExternalLink className="w-4 h-4" />Open file</a></div>
              ) : <p className="text-sm text-gray-400 text-center py-10">No file attached</p>}
            </div>
            {preview.notes && <div className="px-6 pb-4"><p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{preview.notes}</p></div>}
            {preview.tags && preview.tags.length > 0 && <div className="px-6 pb-4 flex gap-1">{preview.tags.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{t}</span>)}</div>}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-900">Documents</h1><p className="text-sm text-gray-400">Archive & manage all company and employee documents</p></div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200/40"><Upload className="w-4 h-4" />Upload</button>
      </div>

      {/* Alerts */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {expired.length > 0 && <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-500 mt-0.5" /><div><p className="text-sm font-semibold text-red-800">{expired.length} expired document{expired.length > 1 ? "s" : ""}</p><p className="text-xs text-red-600 mt-0.5">{expired.map(d => d.doc_name).join(", ")}</p></div></div>}
          {expiringSoon.length > 0 && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"><Calendar className="w-5 h-5 text-amber-500 mt-0.5" /><div><p className="text-sm font-semibold text-amber-800">{expiringSoon.length} expiring within 30 days</p><p className="text-xs text-amber-600 mt-0.5">{expiringSoon.map(d => d.doc_name).join(", ")}</p></div></div>}
        </div>
      )}

      {/* Stats by type */}
      <div className="flex flex-wrap gap-2 mb-5">
        {byType.slice(0, 8).map(([type, count]) => {
          const dt = DOC_TYPES.find(t => t.value === type);
          return <button key={type} onClick={() => setTypeFilter(typeFilter === type ? "" : type)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${typeFilter === type ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>{dt?.icon} {dt?.label || type} ({count})</button>;
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="">All entities</option>{ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(search || typeFilter || entityFilter) && <button onClick={() => { setSearch(""); setTypeFilter(""); setEntityFilter(""); }} className="text-xs text-gray-500 flex items-center gap-1 hover:bg-gray-100 px-2 py-1.5 rounded-lg"><X className="w-3 h-3" />Clear</button>}
      </div>

      {/* Documents grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
        : filtered.length === 0 ? (
          <div className="text-center py-16"><FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">{docs.length === 0 ? "No documents uploaded yet" : "No matching documents"}</p>{docs.length === 0 && <button onClick={() => setShowUpload(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1"><Upload className="w-4 h-4" />Upload first</button>}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["Document", "Type", "Entity", "Expiry", "Size", "Uploaded", "Actions"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(d => {
                  const dt = DOC_TYPES.find(t => t.value === d.doc_type);
                  const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date();
                  const isExpiring = d.expiry_date && !isExpired && new Date(d.expiry_date).getTime() - Date.now() < 30 * 86400000;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setPreview(d)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-lg">{dt?.icon || "📎"}</div>
                          <div><p className="text-sm font-semibold text-gray-900">{d.doc_name}</p>{d.tags && d.tags.length > 0 && <div className="flex gap-1 mt-0.5">{d.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{t}</span>)}</div>}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">{dt?.label || d.doc_type}</span></td>
                      <td className="px-5 py-3.5"><p className="text-sm text-gray-700">{d.entity_name || "—"}</p><p className="text-xs text-gray-400 capitalize">{d.entity_type}</p></td>
                      <td className="px-5 py-3.5">
                        {d.expiry_date ? <span className={`text-xs font-semibold ${isExpired ? "text-red-600" : isExpiring ? "text-amber-600" : "text-gray-500"}`}>{fmtDate(d.expiry_date)}{isExpired ? " ⛔" : isExpiring ? " ⚠️" : ""}</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{d.file_size ? fmtSize(d.file_size) : "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{fmtDate(d.created_at)}</td>
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {d.file_url && <a href={d.file_url} target="_blank" rel="noopener" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"><Download className="w-4 h-4" /></a>}
                          <button onClick={() => deletDoc(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100"><p className="text-xs text-gray-500">{filtered.length} documents</p></div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="w-4 h-4" />{toast.msg}<button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}