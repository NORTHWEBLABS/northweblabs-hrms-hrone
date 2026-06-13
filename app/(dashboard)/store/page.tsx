"use client";
// Route: app/(dashboard)/store/page.tsx
// Shopify-style Store — Complete clone with Products, Orders, Customers, POS, Analytics
// All features: images, inventory adjust, bulk actions, order timeline, refund/cancel,
// customer profiles, POS with receipt/hold/discount, analytics with today-vs-yesterday
// CSV import/export, inventory log, hold orders, print receipt from any order
// Total: 14 components, 4 tabs, 7 modals, 6 KPI cards, 11 chart types
// Supports: product images, stock adjustment, bulk select/archive/delete, order cancel/refund
// POS: hold orders, customer info, discount (fixed/%), GST calc, profit estimate, receipt print

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, Search, X, Loader2, CheckCircle2, AlertCircle,
  Package, ShoppingCart, IndianRupee, Store,
  Minus, Trash2, BarChart3, Edit2,
  Upload, Save, ChevronLeft, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Copy,
  Percent, Users, TrendingUp, MoreVertical,
  Archive, RotateCcw, Globe, Smartphone,
  Ban, Undo2,
  Truck, PackageCheck, Hash,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, AreaChart, Area,
} from "recharts";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

interface Product { id: string; name: string; description: string | null; sku: string | null; barcode: string | null; category: string | null; price: number; cost_price: number; compare_at_price: number | null; stock_qty: number; min_stock: number; unit: string; image_url: string | null; images: string[] | null; is_active: boolean; channel: string; vendor: string | null; tags: string[] | null; weight: number | null; weight_unit: string | null; created_at: string; }
interface Order { id: string; order_number: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null; channel: string; items: any[]; subtotal: number; tax_amount: number; discount_amount: number; total: number; payment_method: string | null; payment_status: string; order_status: string; notes: string | null; created_at: string; }
interface CartItem { product: Product; qty: number; }
interface CustomerProfile { name: string; phone: string; email: string; orders: Order[]; totalSpent: number; avgOrder: number; firstOrder: string; lastOrder: string; }

const fmtINR = (n: number) => (n < 0 ? "-" : "") + "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtDateTime = (d: string) => `${fmtDate(d)} ${fmtTime(d)}`;
const COLORS = ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#14B8A6"];
const UNITS = ["piece","kg","g","litre","ml","box","pack","set","meter","pair","dozen"];
const CHANNELS = [{ v: "both", l: "All channels" }, { v: "online", l: "Online only" }, { v: "offline", l: "In-store only" }];
const ORDER_STATUSES = ["draft","confirmed","processing","shipped","delivered","cancelled","refunded"];
const CustomTooltip = ({ active, payload, label }: any) => { if (!active || !payload?.length) return null; return <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-gray-700"><p className="font-semibold mb-1">{label}</p>{payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.value > 100 ? fmtINR(p.value) : p.value}</p>)}</div>; };

async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT DETAIL — Full Shopify product editor
// ══════════════════════════════════════════════════════════════════════════════
function ProductDetail({ product: initial, onSave, onClose, onDelete, onDuplicate }: {
  product: Product | null; onSave: (p: Product) => void; onClose: () => void;
  onDelete?: (id: string) => void; onDuplicate?: (p: Product) => void;
}) {
  const sb = useSB();
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !initial;
  const [f, setF] = useState({
    name: initial?.name || "", description: initial?.description || "", sku: initial?.sku || "",
    barcode: initial?.barcode || "", category: initial?.category || "", price: initial?.price?.toString() || "",
    cost_price: initial?.cost_price?.toString() || "", compare_at_price: initial?.compare_at_price?.toString() || "",
    stock_qty: initial?.stock_qty?.toString() || "0", min_stock: initial?.min_stock?.toString() || "5",
    unit: initial?.unit || "piece", channel: initial?.channel || "both", vendor: initial?.vendor || "",
    tags: initial?.tags?.join(", ") || "", weight: initial?.weight?.toString() || "",
    weight_unit: initial?.weight_unit || "kg", is_active: initial?.is_active ?? true,
  });
  const [images, setImages] = useState<string[]>(initial?.images || (initial?.image_url ? [initial.image_url] : []));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [stockAdj, setStockAdj] = useState("");
  const [stockReason, setStockReason] = useState("recount");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB per image"); return; }
    setUploading(true);
    const orgId = await getOrgId(sb);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: ue } = await sb.storage.from("product-images").upload(path, file, { upsert: true });
    if (ue) { setError("Upload failed: " + ue.message); setUploading(false); return; }
    const { data: urlData } = sb.storage.from("product-images").getPublicUrl(path);
    setImages(p => [...p, urlData.publicUrl]);
    setUploading(false);
  };

  const margin = Number(f.price) > 0 && Number(f.cost_price) > 0 ? Math.round(((Number(f.price) - Number(f.cost_price)) / Number(f.price)) * 100) : 0;
  const profitPerUnit = Number(f.price) - Number(f.cost_price || 0);
  const discount = Number(f.compare_at_price) > Number(f.price) ? Math.round(((Number(f.compare_at_price) - Number(f.price)) / Number(f.compare_at_price)) * 100) : 0;

  const adjustStock = () => {
    const adj = Number(stockAdj);
    if (!adj) return;
    s("stock_qty", String(Math.max(0, Number(f.stock_qty || 0) + adj)));
    setStockAdj("");
  };

  const save = async () => {
    setError("");
    if (!f.name.trim()) { setError("Product name required"); return; }
    if (!f.price || Number(f.price) <= 0) { setError("Price required"); return; }
    setSaving(true);
    const orgId = await getOrgId(sb);
    const payload = {
      org_id: orgId, name: f.name.trim(), description: f.description || null,
      sku: f.sku || null, barcode: f.barcode || null, category: f.category || null,
      price: Number(f.price), cost_price: Number(f.cost_price || 0),
      compare_at_price: f.compare_at_price ? Number(f.compare_at_price) : null,
      stock_qty: Number(f.stock_qty || 0), min_stock: Number(f.min_stock || 5),
      unit: f.unit, channel: f.channel, vendor: f.vendor || null,
      tags: f.tags ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
      weight: f.weight ? Number(f.weight) : null, weight_unit: f.weight_unit,
      is_active: f.is_active, image_url: images[0] || null, images,
    };
    let result;
    if (isNew) result = await sb.from("store_products").insert(payload).select().single();
    else result = await sb.from("store_products").update(payload).eq("id", initial!.id).select().single();
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    onSave(result.data as Product); onClose();
  };

  const handleDelete = async () => {
    if (!initial || !onDelete) return;
    await sb.from("store_products").delete().eq("id", initial.id);
    onDelete(initial.id); onClose();
  };

  const handleDuplicate = () => {
    if (!initial || !onDuplicate) return;
    const dup = { ...initial, name: initial.name + " (Copy)", id: "", sku: initial.sku ? initial.sku + "-COPY" : null };
    onDuplicate(dup);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{isNew ? "Add product" : "Edit product"}</h2>
              {!isNew && <p className="text-[10px] text-gray-400">{initial?.sku || "No SKU"} · Created {fmtDate(initial!.created_at)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* More menu */}
            {!isNew && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-400" /></button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10">
                    <button onClick={handleDuplicate} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"><Copy className="w-4 h-4 text-gray-400" />Duplicate product</button>
                    <button onClick={() => { s("is_active", false); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"><Archive className="w-4 h-4 text-gray-400" />Archive</button>
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={() => { setShowConfirmDelete(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"><Trash2 className="w-4 h-4" />Delete product</button>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => s("is_active", !f.is_active)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${f.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
              {f.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}{f.is_active ? "Active" : "Draft"}
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-indigo-700 transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
            </button>
          </div>
        </div>

        {/* Body — 2 column */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* LEFT — Main content */}
            <div className="lg:col-span-2 px-6 py-5 space-y-5 lg:border-r border-gray-100">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X className="w-3.5 h-3.5" /></button></div>}

              {/* Title + Desc */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
                <input value={f.name} onChange={e => s("name", e.target.value)} placeholder="Short sleeve t-shirt" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea value={f.description} onChange={e => s("description", e.target.value)} rows={4} placeholder="Product details, materials, sizing…" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              </div>

              {/* Media */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Media</label>
                <div className="flex gap-3 flex-wrap">
                  {images.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                        <button onClick={() => setImages(p => p.filter((_, j) => j !== i))} className="p-1.5 bg-white rounded-full shadow"><X className="w-3 h-3 text-gray-600" /></button>
                        {i > 0 && <button onClick={() => { const n = [...images]; [n[0], n[i]] = [n[i], n[0]]; setImages(n); }} className="p-1.5 bg-white rounded-full shadow" title="Set as main"><ArrowUpRight className="w-3 h-3 text-gray-600" /></button>}
                      </div>
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-indigo-600/90 text-white text-[7px] text-center font-bold py-0.5 uppercase">Main</span>}
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition cursor-pointer">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[9px] mt-1">Add image</span></>}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files || []).forEach(uploadImage); e.target.value = ""; }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Accepts JPG, PNG up to 5MB. Click arrow icon to set as main image.</p>
              </div>

              {/* Pricing */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3">Pricing</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div><label className="block text-[10px] text-gray-500 mb-1">Price *</label><div className="relative"><span className="absolute left-3 top-2 text-sm text-gray-400">₹</span><input type="number" value={f.price} onChange={e => s("price", e.target.value)} className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Compare at (MRP)</label><div className="relative"><span className="absolute left-3 top-2 text-sm text-gray-400">₹</span><input type="number" value={f.compare_at_price} onChange={e => s("compare_at_price", e.target.value)} placeholder="MRP" className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Cost per item</label><div className="relative"><span className="absolute left-3 top-2 text-sm text-gray-400">₹</span><input type="number" value={f.cost_price} onChange={e => s("cost_price", e.target.value)} className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div></div>
                </div>
                {(margin > 0 || discount > 0) && (
                  <div className="flex gap-2 flex-wrap">
                    {margin > 0 && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg font-semibold">Margin: {margin}% ({fmtINR(profitPerUnit)}/unit)</span>}
                    {discount > 0 && <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-semibold">{discount}% off MRP</span>}
                  </div>
                )}
              </div>

              {/* Inventory */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3">Inventory</p>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div><label className="block text-[10px] text-gray-500 mb-1">SKU</label><input value={f.sku} onChange={e => s("sku", e.target.value)} placeholder="SKU-001" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Barcode</label><input value={f.barcode} onChange={e => s("barcode", e.target.value)} placeholder="EAN/UPC" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Quantity</label><input type="number" value={f.stock_qty} onChange={e => s("stock_qty", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Low stock at</label><input type="number" value={f.min_stock} onChange={e => s("min_stock", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
                </div>
                {/* Stock adjustment */}
                {!isNew && (
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
                    <RotateCcw className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <select value={stockReason} onChange={e => setStockReason(e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white appearance-none">
                      <option value="recount">Recount</option><option value="received">Received</option><option value="return">Return</option><option value="damaged">Damaged</option><option value="theft">Theft/loss</option>
                    </select>
                    <input type="number" value={stockAdj} onChange={e => setStockAdj(e.target.value)} placeholder="+10 or -5" className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    <button onClick={adjustStock} disabled={!stockAdj} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md font-semibold disabled:opacity-30 hover:bg-indigo-700 transition">Adjust</button>
                    <span className="text-xs text-gray-400 ml-auto">Current: <strong className="text-gray-700">{f.stock_qty}</strong></span>
                  </div>
                )}
              </div>

              {/* Shipping */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3">Shipping</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-[10px] text-gray-500 mb-1">Weight</label>
                    <div className="flex"><input type="number" value={f.weight} onChange={e => s("weight", e.target.value)} placeholder="0.5" className="flex-1 px-3 py-2 border border-gray-200 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /><select value={f.weight_unit} onChange={e => s("weight_unit", e.target.value)} className="w-14 px-1 py-2 border border-gray-200 rounded-r-lg text-xs bg-white appearance-none border-l-0"><option>kg</option><option>g</option><option>lb</option><option>oz</option></select></div>
                  </div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Unit</label><select value={f.unit} onChange={e => s("unit", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Channel</label><select value={f.channel} onChange={e => s("channel", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">{CHANNELS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}</select></div>
                </div>
              </div>
            </div>

            {/* RIGHT — Sidebar */}
            <div className="px-5 py-5 space-y-4 bg-gray-50/50">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Product status</p>
                <select value={f.is_active ? "active" : "draft"} onChange={e => s("is_active", e.target.value === "active")} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="active">Active</option><option value="draft">Draft</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1.5">{f.is_active ? "Visible in store and POS" : "Hidden from customers"}</p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Organization</p>
                <div className="space-y-3">
                  <div><label className="block text-[10px] text-gray-500 mb-1">Category</label><input value={f.category} onChange={e => s("category", e.target.value)} placeholder="Apparel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
                  <div><label className="block text-[10px] text-gray-500 mb-1">Vendor / Supplier</label><input value={f.vendor} onChange={e => s("vendor", e.target.value)} placeholder="Vendor name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Tags</label>
                    <input value={f.tags} onChange={e => s("tags", e.target.value)} placeholder="summer, sale, new" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    {f.tags && <div className="flex flex-wrap gap-1 mt-1.5">{f.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full font-medium">{t}</span>)}</div>}
                  </div>
                </div>
              </div>

              {!isNew && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Quick stats</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Inventory value</span><span className="font-semibold text-gray-900">{fmtINR(Number(f.cost_price || 0) * Number(f.stock_qty || 0))}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Retail value</span><span className="font-semibold text-gray-900">{fmtINR(Number(f.price || 0) * Number(f.stock_qty || 0))}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Potential profit</span><span className="font-semibold text-emerald-600">{fmtINR(profitPerUnit * Number(f.stock_qty || 0))}</span></div>
                    {Number(f.stock_qty) <= Number(f.min_stock) && <div className="p-2 bg-red-50 rounded-lg text-xs text-red-600 font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />Low stock warning</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete confirmation */}
        {showConfirmDelete && (
          <div className="px-6 py-4 border-t border-red-200 bg-red-50 flex items-center justify-between">
            <p className="text-sm text-red-700">Delete <strong>{f.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmDelete(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">Yes, delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ORDER DETAIL — Timeline, refund, cancel, notes
// ══════════════════════════════════════════════════════════════════════════════
function OrderDetail({ order, onUpdate, onClose }: { order: Order; onUpdate: (o: Order) => void; onClose: () => void }) {
  const sb = useSB();
  const [status, setStatus] = useState(order.order_status);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmt, setRefundAmt] = useState(order.total.toString());
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(order.notes || "");

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    const upd: any = { order_status: newStatus };
    if (newStatus === "cancelled") upd.notes = (note ? note + "\n" : "") + "Cancelled: " + (cancelReason || "No reason");
    if (newStatus === "refunded") { upd.payment_status = "refunded"; upd.notes = (note ? note + "\n" : "") + "Refunded: " + fmtINR(Number(refundAmt)); }
    await sb.from("store_orders").update(upd).eq("id", order.id);
    // Restock on cancel/refund
    if (newStatus === "cancelled" || newStatus === "refunded") {
      for (const item of (order.items || [])) {
        if (item.product_id) {
          const { data: prod } = await sb.from("store_products").select("stock_qty").eq("id", item.product_id).maybeSingle();
          if (prod) await sb.from("store_products").update({ stock_qty: (prod.stock_qty || 0) + (item.qty || 0) }).eq("id", item.product_id);
        }
      }
    }
    setStatus(newStatus);
    onUpdate({ ...order, order_status: newStatus, payment_status: newStatus === "refunded" ? "refunded" : order.payment_status, notes: upd.notes || note });
    setSaving(false); setShowCancel(false); setShowRefund(false);
  };

  const saveNote = async () => {
    await sb.from("store_orders").update({ notes: note }).eq("id", order.id);
    onUpdate({ ...order, notes: note });
  };

  const timeline = [
    { s: "confirmed", icon: <CheckCircle2 className="w-4 h-4" />, label: "Confirmed" },
    { s: "processing", icon: <Package className="w-4 h-4" />, label: "Processing" },
    { s: "shipped", icon: <Truck className="w-4 h-4" />, label: "Shipped" },
    { s: "delivered", icon: <PackageCheck className="w-4 h-4" />, label: "Delivered" },
  ];
  const statusIdx = timeline.findIndex(t => t.s === status);
  const isCancelled = status === "cancelled";
  const isRefunded = status === "refunded";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div><h2 className="text-base font-bold text-gray-900">Order {order.order_number}</h2><p className="text-xs text-gray-400">{fmtDateTime(order.created_at)}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isCancelled ? "bg-red-100 text-red-700" : isRefunded ? "bg-orange-100 text-orange-700" : status === "delivered" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{status}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${order.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : order.payment_status === "refunded" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{order.payment_method?.toUpperCase()} · {order.payment_status}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{order.channel === "online" ? "Online" : "Walk-in"}</span>
          </div>

          {/* Timeline */}
          {!isCancelled && !isRefunded && (
            <div className="flex items-center gap-1">
              {timeline.map((t, i) => {
                const done = i <= statusIdx;
                const current = i === statusIdx;
                return (
                  <div key={t.s} className="flex items-center flex-1">
                    <button onClick={() => !saving && updateStatus(t.s)} disabled={saving}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition w-full justify-center
                        ${current ? "bg-indigo-600 text-white shadow-sm" : done ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
                      {t.icon}<span className="hidden sm:inline">{t.label}</span>
                    </button>
                    {i < timeline.length - 1 && <div className={`w-4 h-0.5 flex-shrink-0 ${done ? "bg-indigo-400" : "bg-gray-200"}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Customer */}
          {(order.customer_name || order.customer_phone) && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Customer</p>
              <p className="text-sm font-semibold text-gray-900">{order.customer_name || "Walk-in"}</p>
              {order.customer_phone && <p className="text-xs text-gray-500">{order.customer_phone}</p>}
              {order.customer_email && <p className="text-xs text-gray-500">{order.customer_email}</p>}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Items ({(order.items || []).reduce((s: number, i: any) => s + (i.qty || 0), 0)})</p>
            <div className="space-y-2">{(order.items || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{item.name}</p><p className="text-xs text-gray-400">{item.qty} x {fmtINR(item.price)}{item.sku ? ` · ${item.sku}` : ""}</p></div>
                <span className="text-sm font-bold text-gray-900">{fmtINR(item.line_total || item.price * item.qty)}</span>
              </div>
            ))}</div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{fmtINR(order.subtotal)}</span></div>
            {order.discount_amount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{fmtINR(order.discount_amount)}</span></div>}
            <div className="flex justify-between text-sm text-gray-500"><span>Tax</span><span>{fmtINR(order.tax_amount)}</span></div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{fmtINR(order.total)}</span></div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Order notes</label>
            <div className="flex gap-2"><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Internal notes…" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              <button onClick={saveNote} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 self-end">Save</button>
            </div>
          </div>

          {/* Cancel section */}
          {showCancel && !isCancelled && !isRefunded && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-red-700">Cancel this order?</p>
              <p className="text-xs text-red-600">Stock will be returned to inventory automatically.</p>
              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation…" className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowCancel(false)} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg">Back</button>
                <button onClick={() => updateStatus("cancelled")} disabled={saving} className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1">{saving && <Loader2 className="w-3 h-3 animate-spin" />}Confirm cancel</button>
              </div>
            </div>
          )}

          {/* Refund section */}
          {showRefund && !isRefunded && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-orange-700">Refund this order?</p>
              <p className="text-xs text-orange-600">Stock will be returned to inventory automatically.</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Amount:</span>
                <div className="relative flex-1"><span className="absolute left-3 top-1.5 text-sm text-gray-400">₹</span><input type="number" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} max={order.total} className="w-full pl-7 pr-3 py-1.5 border border-orange-200 rounded-lg text-sm focus:outline-none" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRefund(false)} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg">Back</button>
                <button onClick={() => updateStatus("refunded")} disabled={saving} className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1">{saving && <Loader2 className="w-3 h-3 animate-spin" />}Process refund</button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* Print receipt — always available */}
            <button onClick={() => {
              const w = window.open("", "_blank", "width=380,height=600");
              if (!w) return;
              const items = (order.items || []).map((i: any) => `<tr><td style="padding:3px 0;font-size:12px">${i.name}</td><td style="text-align:center;font-size:12px">${i.qty}</td><td style="text-align:right;font-size:12px">${fmtINR(i.line_total || i.price * i.qty)}</td></tr>`).join("");
              w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:monospace;margin:20px;max-width:340px}table{width:100%;border-collapse:collapse}hr{border:none;border-top:1px dashed #ccc;margin:8px 0}.c{text-align:center}</style></head><body><div class="c"><h3 style="margin:0">Store</h3></div><hr><p style="font-size:11px">Order: <strong>${order.order_number}</strong><br>${fmtDateTime(order.created_at)}${order.customer_name ? "<br>Customer: " + order.customer_name : ""}</p><hr><table>${items}</table><hr><div style="font-size:12px"><div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtINR(order.subtotal)}</span></div>${order.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;color:green"><span>Discount</span><span>-${fmtINR(order.discount_amount)}</span></div>` : ""}<div style="display:flex;justify-content:space-between"><span>Tax</span><span>${fmtINR(order.tax_amount)}</span></div><hr><div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px"><span>Total</span><span>${fmtINR(order.total)}</span></div></div><hr><div class="c" style="font-size:11px;color:#666"><p>Paid via ${(order.payment_method || "").toUpperCase()}</p><p>Thank you!</p></div></body></html>`);
              w.document.close(); setTimeout(() => w.print(), 500);
            }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>Print receipt
            </button>
          </div>
          {!showCancel && !showRefund && !isCancelled && !isRefunded && (
            <div className="flex gap-2">
              <button onClick={() => setShowCancel(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"><Ban className="w-3.5 h-3.5" />Cancel order</button>
              {order.payment_status === "paid" && <button onClick={() => setShowRefund(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50"><Undo2 className="w-3.5 h-3.5" />Refund</button>}
            </div>
          )}
          {(isCancelled || isRefunded) && (
            <div className={`p-3 rounded-xl ${isCancelled ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"}`}>
              <p className={`text-sm font-semibold ${isCancelled ? "text-red-700" : "text-orange-700"}`}>{isCancelled ? "Order cancelled" : "Order refunded"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Stock has been returned to inventory.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CUSTOMER DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function CustomerDetail({ profile, onClose }: { profile: CustomerProfile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">{profile.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900">{profile.name}</p>{profile.phone && <p className="text-xs text-gray-400">{profile.phone}</p>}{profile.email && <p className="text-xs text-gray-400">{profile.email}</p>}</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-bold text-gray-900">{profile.orders.length}</p><p className="text-[10px] text-gray-400 uppercase">Orders</p></div>
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-bold text-gray-900">{fmtINR(profile.totalSpent)}</p><p className="text-[10px] text-gray-400 uppercase">Spent</p></div>
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-bold text-gray-900">{fmtINR(profile.avgOrder)}</p><p className="text-[10px] text-gray-400 uppercase">Avg order</p></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500"><span>First order</span><span className="font-medium text-gray-700">{fmtDate(profile.firstOrder)}</span></div>
          <div className="flex justify-between text-xs text-gray-500"><span>Last order</span><span className="font-medium text-gray-700">{fmtDate(profile.lastOrder)}</span></div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase mt-2">Order history</p>
          <div className="space-y-2">{profile.orders.map(o => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div><p className="text-xs font-mono text-indigo-600 font-semibold">{o.order_number}</p><p className="text-[10px] text-gray-400">{fmtDate(o.created_at)} · {(o.items || []).length} items</p></div>
              <div className="text-right"><p className="text-sm font-bold text-gray-900">{fmtINR(o.total)}</p><span className={`text-[10px] font-semibold ${o.order_status === "delivered" ? "text-emerald-600" : o.order_status === "cancelled" ? "text-red-500" : "text-gray-500"}`}>{o.order_status}</span></div>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  RECEIPT / INVOICE PREVIEW — Shown after POS order or from order detail
// ══════════════════════════════════════════════════════════════════════════════
function ReceiptModal({ order, orgName, onClose }: { order: Order; orgName?: string; onClose: () => void }) {
  const printReceipt = () => {
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    const items = (order.items || []).map((i: any) =>
      `<tr><td style="padding:4px 0;font-size:12px">${i.name}</td><td style="text-align:center;font-size:12px">${i.qty}</td><td style="text-align:right;font-size:12px">${fmtINR(i.price)}</td><td style="text-align:right;font-size:12px">${fmtINR(i.line_total || i.price * i.qty)}</td></tr>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:monospace;margin:20px;max-width:340px}table{width:100%;border-collapse:collapse}hr{border:none;border-top:1px dashed #ccc;margin:8px 0}.center{text-align:center}.right{text-align:right}.bold{font-weight:bold}</style></head><body>
      <div class="center"><h3 style="margin:0">${orgName || "Store"}</h3><p style="font-size:11px;color:#666;margin:4px 0">Receipt</p></div><hr>
      <p style="font-size:11px">Order: <strong>${order.order_number}</strong></p>
      <p style="font-size:11px">Date: ${fmtDateTime(order.created_at)}</p>
      ${order.customer_name ? `<p style="font-size:11px">Customer: ${order.customer_name}${order.customer_phone ? " · " + order.customer_phone : ""}</p>` : ""}
      <hr><table><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;font-size:11px;padding:4px 0">Item</th><th style="text-align:center;font-size:11px">Qty</th><th style="text-align:right;font-size:11px">Price</th><th style="text-align:right;font-size:11px">Total</th></tr></thead><tbody>${items}</tbody></table><hr>
      <div style="font-size:12px"><div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtINR(order.subtotal)}</span></div>
      ${order.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a"><span>Discount</span><span>-${fmtINR(order.discount_amount)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between"><span>GST</span><span>${fmtINR(order.tax_amount)}</span></div><hr>
      <div style="display:flex;justify-content:space-between;font-size:16px" class="bold"><span>Total</span><span>${fmtINR(order.total)}</span></div></div><hr>
      <div class="center" style="font-size:11px;color:#666"><p>Payment: ${(order.payment_method || "").toUpperCase()}</p><p>Channel: ${order.channel}</p><p style="margin-top:12px">Thank you for your purchase!</p></div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Receipt</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Mini receipt */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-xs space-y-2">
            <div className="text-center"><p className="font-bold text-sm text-gray-900">{orgName || "Store"}</p><p className="text-gray-400">--- Receipt ---</p></div>
            <div className="space-y-0.5">
              <p className="text-gray-600">Order: <span className="font-bold text-indigo-600">{order.order_number}</span></p>
              <p className="text-gray-500">{fmtDateTime(order.created_at)}</p>
              {order.customer_name && <p className="text-gray-600">Customer: {order.customer_name}</p>}
            </div>
            <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
              {(order.items || []).map((item: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-700 flex-1 truncate">{item.qty}x {item.name}</span>
                  <span className="text-gray-900 font-semibold ml-2">{fmtINR(item.line_total || item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtINR(order.subtotal)}</span></div>
              {order.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtINR(order.discount_amount)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>GST</span><span>{fmtINR(order.tax_amount)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-dashed border-gray-300"><span>TOTAL</span><span>{fmtINR(order.total)}</span></div>
            </div>
            <div className="text-center pt-2 border-t border-dashed border-gray-300 text-gray-400">
              <p>Paid via {(order.payment_method || "").toUpperCase()}</p>
              <p className="mt-1">Thank you!</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          <button onClick={printReceipt} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print receipt
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT IMPORT FROM CSV
// ══════════════════════════════════════════════════════════════════════════════
function ProductImportModal({ onImport, onClose }: { onImport: (rows: any[]) => void; onClose: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    setError("");
    const lines = text.trim().split("\n");
    if (lines.length < 2) { setError("Need header row + at least 1 data row"); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const nameIdx = headers.findIndex(h => h === "name" || h === "title" || h === "product");
    const priceIdx = headers.findIndex(h => h === "price" || h === "sell_price" || h === "selling_price");
    if (nameIdx === -1 || priceIdx === -1) { setError("CSV must have 'Name' and 'Price' columns"); return; }
    const costIdx = headers.findIndex(h => h.includes("cost"));
    const skuIdx = headers.findIndex(h => h === "sku");
    const categoryIdx = headers.findIndex(h => h === "category" || h === "type");
    const stockIdx = headers.findIndex(h => h.includes("stock") || h.includes("qty") || h.includes("quantity"));
    const barcodeIdx = headers.findIndex(h => h === "barcode" || h === "ean" || h === "upc");
    const vendorIdx = headers.findIndex(h => h === "vendor" || h === "supplier");
    const descIdx = headers.findIndex(h => h.includes("desc"));

    const rows = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return {
        name: cols[nameIdx] || "", price: Number(cols[priceIdx]) || 0,
        cost_price: costIdx >= 0 ? Number(cols[costIdx]) || 0 : 0,
        sku: skuIdx >= 0 ? cols[skuIdx] : null,
        category: categoryIdx >= 0 ? cols[categoryIdx] : null,
        stock_qty: stockIdx >= 0 ? Number(cols[stockIdx]) || 0 : 0,
        barcode: barcodeIdx >= 0 ? cols[barcodeIdx] : null,
        vendor: vendorIdx >= 0 ? cols[vendorIdx] : null,
        description: descIdx >= 0 ? cols[descIdx] : null,
      };
    }).filter(r => r.name && r.price > 0);
    setPreview(rows);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCSV(text); };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-sm font-bold text-gray-900">Import products from CSV</h2><p className="text-xs text-gray-400">Required columns: Name, Price. Optional: SKU, Cost, Category, Stock, Barcode, Vendor</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700"><Upload className="w-4 h-4" />Upload CSV</button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
            <span className="text-xs text-gray-400 self-center">or paste below</span>
          </div>
          <textarea value={csvText} onChange={e => { setCsvText(e.target.value); if (e.target.value.trim()) parseCSV(e.target.value); }} rows={5} placeholder={"Name,Price,Cost,SKU,Category,Stock\nT-shirt,499,200,TSH-001,Apparel,50\nJeans,1299,600,JNS-001,Apparel,30"} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Preview ({preview.length} products)</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                  {["Name", "Price", "Cost", "SKU", "Category", "Stock"].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-500 px-3 py-2">{h}</th>)}
                </tr></thead><tbody className="divide-y divide-gray-100">
                  {preview.slice(0, 10).map((r, i) => (
                    <tr key={i}><td className="px-3 py-1.5 text-xs text-gray-900">{r.name}</td><td className="px-3 py-1.5 text-xs text-gray-900">{fmtINR(r.price)}</td><td className="px-3 py-1.5 text-xs text-gray-500">{fmtINR(r.cost_price)}</td><td className="px-3 py-1.5 text-xs text-gray-500">{r.sku || "—"}</td><td className="px-3 py-1.5 text-xs text-gray-500">{r.category || "—"}</td><td className="px-3 py-1.5 text-xs text-gray-500">{r.stock_qty}</td></tr>
                  ))}
                </tbody></table>
                {preview.length > 10 && <p className="text-xs text-gray-400 text-center py-2">+{preview.length - 10} more</p>}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onImport(preview); onClose(); }} disabled={preview.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40">Import {preview.length} products</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT HELPERS — CSV export for products and orders
// ══════════════════════════════════════════════════════════════════════════════
function exportProductsCSV(products: Product[]) {
  const headers = ["Name", "SKU", "Barcode", "Category", "Price", "Cost Price", "Compare At", "Stock", "Min Stock", "Unit", "Channel", "Vendor", "Status", "Tags", "Created"];
  const rows = products.map(p => [
    `"${(p.name || "").replace(/"/g, '""')}"`, p.sku || "", p.barcode || "", p.category || "",
    p.price, p.cost_price, p.compare_at_price || "", p.stock_qty, p.min_stock, p.unit,
    p.channel, `"${(p.vendor || "").replace(/"/g, '""')}"`, p.is_active ? "Active" : "Draft",
    `"${(p.tags || []).join(", ")}"`, fmtDate(p.created_at),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCSV(csv, `products-${new Date().toISOString().split("T")[0]}.csv`);
}

function exportOrdersCSV(orders: Order[]) {
  const headers = ["Order#", "Date", "Customer", "Phone", "Channel", "Items", "Subtotal", "Discount", "Tax", "Total", "Payment", "Status"];
  const rows = orders.map(o => [
    o.order_number, fmtDateTime(o.created_at), `"${(o.customer_name || "Walk-in").replace(/"/g, '""')}"`,
    o.customer_phone || "", o.channel, (o.items || []).length,
    o.subtotal, o.discount_amount, o.tax_amount, o.total,
    `${o.payment_method || ""} (${o.payment_status})`, o.order_status,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCSV(csv, `orders-${new Date().toISOString().split("T")[0]}.csv`);
}

function exportCustomersCSV(customers: { name: string; phone: string; orders: any[]; totalSpent: number; avgOrder: number; lastOrder: string }[]) {
  const headers = ["Name", "Phone", "Orders", "Total Spent", "Avg Order", "Last Order"];
  const rows = customers.map(c => [`"${c.name.replace(/"/g, '""')}"`, c.phone, c.orders.length, c.totalSpent, Math.round(c.avgOrder), fmtDate(c.lastOrder)]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCSV(csv, `customers-${new Date().toISOString().split("T")[0]}.csv`);
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
//  INVENTORY ADJUSTMENT LOG
// ══════════════════════════════════════════════════════════════════════════════
function InventoryLogModal({ product, onClose }: { product: Product; onClose: () => void }) {
  // In a real app this would query an inventory_logs table
  // For now, show current inventory details with calculations
  const margin = product.price > 0 && product.cost_price > 0 ? Math.round(((product.price - product.cost_price) / product.price) * 100) : 0;
  const invValue = product.cost_price * product.stock_qty;
  const retailValue = product.price * product.stock_qty;
  const potentialProfit = retailValue - invValue;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-400">{product.sku || "No SKU"} · {product.category || "Uncategorized"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Current stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${product.stock_qty <= product.min_stock ? "text-red-600" : "text-gray-900"}`}>{product.stock_qty}</p>
              <p className="text-xs text-gray-400 mt-1">In stock ({product.unit})</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{product.min_stock}</p>
              <p className="text-xs text-gray-400 mt-1">Reorder point</p>
            </div>
          </div>

          {/* Valuation */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Valuation</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500">Cost price</span><span className="text-xs font-bold text-gray-900">{fmtINR(product.cost_price)}</span></div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500">Sell price</span><span className="text-xs font-bold text-gray-900">{fmtINR(product.price)}</span></div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500">Inv. value</span><span className="text-xs font-bold text-gray-900">{fmtINR(invValue)}</span></div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500">Retail value</span><span className="text-xs font-bold text-gray-900">{fmtINR(retailValue)}</span></div>
            </div>
            <div className="flex justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-700 font-semibold">Potential profit</span>
              <span className="text-xs font-bold text-emerald-700">{fmtINR(potentialProfit)} ({margin}% margin)</span>
            </div>
          </div>

          {/* Product details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Details</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {product.barcode && <div className="flex justify-between"><span className="text-gray-500">Barcode</span><span className="font-mono text-gray-900">{product.barcode}</span></div>}
              {product.vendor && <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span className="text-gray-900">{product.vendor}</span></div>}
              {product.weight && <div className="flex justify-between"><span className="text-gray-500">Weight</span><span className="text-gray-900">{product.weight} {product.weight_unit}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Channel</span><span className="text-gray-900">{product.channel}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={product.is_active ? "text-emerald-600" : "text-gray-500"}>{product.is_active ? "Active" : "Draft"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-900">{fmtDate(product.created_at)}</span></div>
            </div>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <div className="flex justify-between text-xs p-2 bg-red-50 rounded-lg"><span className="text-red-600">MRP discount</span><span className="text-red-600 font-bold">{Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% off ({fmtINR(product.compare_at_price)} MRP)</span></div>
            )}
          </div>

          {product.stock_qty <= product.min_stock && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div><p className="text-xs font-semibold text-red-700">Low stock alert</p><p className="text-[10px] text-red-600">Current stock ({product.stock_qty}) is at or below reorder point ({product.min_stock}). Consider restocking.</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  POS — Full point of sale with discount, receipt, channel
// ══════════════════════════════════════════════════════════════════════════════
function POSModal({ products, onSave, onClose }: { products: Product[]; onSave: () => void; onClose: () => void }) {
  const sb = useSB();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [channel, setChannel] = useState("offline");
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState("");
  const [heldOrders, setHeldOrders] = useState<{ cart: CartItem[]; customer: typeof customer; notes: string; heldAt: string }[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  const holdOrder = () => { if (cart.length === 0) return; setHeldOrders(p => [...p, { cart: [...cart], customer: { ...customer }, notes, heldAt: new Date().toISOString() }]); setCart([]); setCustomer({ name: "", phone: "", email: "" }); setNotes(""); setDiscount(""); };
  const resumeHeld = (i: number) => { const h = heldOrders[i]; setCart(h.cart); setCustomer(h.customer); setNotes(h.notes); setHeldOrders(p => p.filter((_, j) => j !== i)); setShowHeld(false); };
  const removeHeld = (i: number) => setHeldOrders(p => p.filter((_, j) => j !== i));

  const addToCart = (p: Product) => setCart(prev => { const ex = prev.find(c => c.product.id === p.id); if (ex) return prev.map(c => c.product.id === p.id ? { ...c, qty: Math.min(c.qty + 1, p.stock_qty) } : c); return [...prev, { product: p, qty: 1 }]; });
  const updateQty = (pid: string, delta: number) => setCart(prev => prev.map(c => c.product.id !== pid ? c : { ...c, qty: Math.max(0, Math.min(c.qty + delta, c.product.stock_qty)) }).filter(c => c.qty > 0));
  const setQty = (pid: string, qty: number) => setCart(prev => prev.map(c => c.product.id !== pid ? c : { ...c, qty: Math.max(0, Math.min(qty, c.product.stock_qty)) }).filter(c => c.qty > 0));

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const discountAmt = discountType === "percent" ? Math.round(subtotal * (Number(discount) || 0) / 100) : Number(discount) || 0;
  const taxable = Math.max(0, subtotal - discountAmt);
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalCost = cart.reduce((s, c) => s + c.product.cost_price * c.qty, 0);
  const profitEst = total - totalCost - tax;
  const categories = [...new Set(products.filter(p => p.category).map(p => p.category!))];
  const filtered = products.filter(p => p.is_active && p.stock_qty > 0 && (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())) && (!catFilter || p.category === catFilter));

  const placeOrder = async () => {
    if (cart.length === 0) return; setSaving(true);
    const orgId = await getOrgId(sb);
    const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await sb.from("store_orders").insert({
      org_id: orgId, order_number: orderNum, customer_name: customer.name || null,
      customer_phone: customer.phone || null, customer_email: customer.email || null,
      channel, items: cart.map(c => ({ product_id: c.product.id, name: c.product.name, sku: c.product.sku, price: c.product.price, cost_price: c.product.cost_price, qty: c.qty, unit: c.product.unit, line_total: c.product.price * c.qty })),
      subtotal, tax_amount: tax, discount_amount: discountAmt, total,
      payment_method: payment, payment_status: "paid", order_status: "confirmed", notes: notes || null,
    }).select().single();
    if (!error) { for (const c of cart) await sb.from("store_products").update({ stock_qty: Math.max(0, c.product.stock_qty - c.qty) }).eq("id", c.product.id); onSave(); }
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex overflow-hidden">
        {/* LEFT — Products */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2"><h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-500" />Point of Sale</h2><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button></div>
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or scan barcode…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
              {categories.length > 1 && <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="">All</option>{categories.map(c => <option key={c}>{c}</option>)}</select>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map(p => {
                const inCart = cart.find(c => c.product.id === p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)} className={`text-left p-2.5 rounded-xl border transition ${inCart ? "border-indigo-300 bg-indigo-50/80 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}>
                    <div className="flex items-start gap-2">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-gray-300" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-indigo-600 font-bold">{fmtINR(p.price)}</p>
                        {p.compare_at_price && p.compare_at_price > p.price && <p className="text-[10px] text-gray-400 line-through">{fmtINR(p.compare_at_price)}</p>}
                        <p className="text-[10px] text-gray-400">{p.stock_qty} in stock</p>
                      </div>
                      {inCart && <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0">{inCart.qty}</span>}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="col-span-full text-center py-12 text-sm text-gray-400">No products found</div>}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart */}
        <div className="w-[340px] flex flex-col bg-gray-50">
          <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900">Cart</h3><span className="text-xs text-gray-400">{totalItems} items</span></div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {cart.length === 0 && <div className="text-center py-12"><ShoppingCart className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-xs text-gray-400">Tap products to add</p></div>}
            {cart.map(c => (
              <div key={c.product.id} className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-1"><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900 truncate">{c.product.name}</p><p className="text-[10px] text-gray-400">{fmtINR(c.product.price)} each</p></div><button onClick={() => setCart(p => p.filter(x => x.product.id !== c.product.id))} className="p-0.5 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-100 rounded-md"><button onClick={() => updateQty(c.product.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-l-md"><Minus className="w-3 h-3" /></button><input type="number" value={c.qty} onChange={e => setQty(c.product.id, Number(e.target.value))} className="text-xs font-bold w-8 text-center bg-transparent outline-none" /><button onClick={() => updateQty(c.product.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-r-md"><Plus className="w-3 h-3" /></button></div>
                  <span className="text-sm font-bold text-gray-900">{fmtINR(c.product.price * c.qty)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-3 border-t border-gray-200 bg-white space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Customer name" className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Phone" className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <input value={customer.email} onChange={e => setCustomer(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="flex gap-1.5 items-center"><Percent className="w-3.5 h-3.5 text-gray-400" /><input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Discount" className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" /><button onClick={() => setDiscountType(discountType === "fixed" ? "percent" : "fixed")} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 font-bold text-gray-600 hover:bg-gray-100">{discountType === "fixed" ? "₹" : "%"}</button></div>
            <div className="flex gap-1">{["cash","card","upi","gateway"].map(m => <button key={m} onClick={() => setPayment(m)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition ${payment === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}>{m.toUpperCase()}</button>)}</div>
            <div className="flex gap-1">{[{ v: "offline", l: "Walk-in", ic: <Store className="w-3 h-3" /> }, { v: "online", l: "Online", ic: <Globe className="w-3 h-3" /> }, { v: "whatsapp", l: "WhatsApp", ic: <Smartphone className="w-3 h-3" /> }].map(c => <button key={c.v} onClick={() => setChannel(c.v)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border flex items-center justify-center gap-1 ${channel === c.v ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200"}`}>{c.ic}{c.l}</button>)}</div>
            <div className="space-y-1 pt-1 border-t border-gray-100 text-xs">
              <div className="flex justify-between text-gray-500"><span>Subtotal ({totalItems})</span><span>{fmtINR(subtotal)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtINR(discountAmt)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>GST 18%</span><span>{fmtINR(tax)}</span></div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>{fmtINR(total)}</span></div>
              {profitEst > 0 && <div className="flex justify-between text-emerald-600"><span>Est. profit</span><span>+{fmtINR(profitEst)}</span></div>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={holdOrder} disabled={cart.length === 0} className="flex-shrink-0 px-3 py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 transition" title="Hold order">Hold</button>
              <button onClick={placeOrder} disabled={saving || cart.length === 0} className="flex-1 py-2.5 text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200/30 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Place order {total > 0 ? fmtINR(total) : ""}
            </button>
            </div>
            {heldOrders.length > 0 && (
              <button onClick={() => setShowHeld(!showHeld)} className="w-full py-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 transition">
                {heldOrders.length} held order{heldOrders.length > 1 ? "s" : ""} {showHeld ? "▲" : "▼"}
              </button>
            )}
            {showHeld && heldOrders.map((h, i) => (
              <div key={i} className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{h.customer.name || "Walk-in"} · {h.cart.length} items</span>
                  <span className="text-[10px] text-gray-400">{fmtTime(h.heldAt)}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-1.5 truncate">{h.cart.map(c => `${c.qty}x ${c.product.name}`).join(", ")}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => resumeHeld(i)} className="flex-1 py-1 text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-50">Resume</button>
                  <button onClick={() => removeHeld(i)} className="py-1 px-2 text-[10px] font-bold text-red-500 bg-white border border-red-200 rounded hover:bg-red-50">Discard</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN STORE PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function StorePage() {
  const sb = useSB();
  const [tab, setTab] = useState<"products" | "orders" | "customers" | "analytics">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null | "new">(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [showPOS, setShowPOS] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const fetchData = useCallback(async () => {
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    const [{ data: prods }, { data: ords }] = await Promise.all([
      sb.from("store_products").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
      sb.from("store_orders").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
    ]);
    setProducts((prods || []) as Product[]); setOrders((ords || []) as Order[]); setLoading(false);
  }, [sb]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOrderUpdate = (o: Order) => { setOrders(p => p.map(x => x.id === o.id ? o : x)); setSelectedOrder(o); };

  // Computed analytics
  const paid = orders.filter(o => o.payment_status === "paid");
  const totalRev = paid.reduce((s, o) => s + o.total, 0);
  const totalProfit = paid.reduce((s, o) => s + (o.items || []).reduce((ps: number, i: any) => ps + ((i.price - (i.cost_price || 0)) * i.qty), 0), 0);
  const avgOrder = paid.length > 0 ? totalRev / paid.length : 0;
  const todayPaid = paid.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRev = todayPaid.reduce((s, o) => s + o.total, 0);
  const yesterdayPaid = paid.filter(o => { const d = new Date(); d.setDate(d.getDate() - 1); return new Date(o.created_at).toDateString() === d.toDateString(); });
  const yesterdayRev = yesterdayPaid.reduce((s, o) => s + o.total, 0);
  const revChange = yesterdayRev > 0 ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100) : 0;
  const lowStock = products.filter(p => p.stock_qty <= p.min_stock && p.is_active);
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
  const retailValue = products.reduce((s, p) => s + p.price * p.stock_qty, 0);
  const totalItemsSold = paid.reduce((s, o) => s + (o.items || []).reduce((is: number, i: any) => is + (i.qty || 0), 0), 0);

  // Customers
  const customerData = useMemo(() => {
    const map: Record<string, CustomerProfile> = {};
    orders.forEach(o => {
      if (!o.customer_name) return;
      const k = (o.customer_name + (o.customer_phone || "")).toLowerCase();
      if (!map[k]) map[k] = { name: o.customer_name, phone: o.customer_phone || "", email: o.customer_email || "", orders: [], totalSpent: 0, avgOrder: 0, firstOrder: o.created_at, lastOrder: o.created_at };
      map[k].orders.push(o); map[k].totalSpent += o.total;
      if (o.created_at < map[k].firstOrder) map[k].firstOrder = o.created_at;
      if (o.created_at > map[k].lastOrder) map[k].lastOrder = o.created_at;
    });
    Object.values(map).forEach(c => { c.avgOrder = c.orders.length > 0 ? c.totalSpent / c.orders.length : 0; c.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Filtered/sorted products
  const sortedProducts = useMemo(() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      return (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.vendor?.toLowerCase().includes(q))
        && (!catFilter || p.category === catFilter)
        && (!statusFilter || (statusFilter === "active" ? p.is_active : !p.is_active));
    });
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortBy === "stock_asc") list.sort((a, b) => a.stock_qty - b.stock_qty);
    else if (sortBy === "stock_desc") list.sort((a, b) => b.stock_qty - a.stock_qty);
    return list;
  }, [products, search, catFilter, statusFilter, sortBy]);

  // Filtered orders
  const filteredOrders = useMemo(() => orders.filter(o => (!orderStatusFilter || o.order_status === orderStatusFilter) && (!search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase()))), [orders, orderStatusFilter, search]);

  // Bulk actions
  const toggleSelect = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(p => p.size === sortedProducts.length ? new Set() : new Set(sortedProducts.map(p => p.id)));
  const bulkDelete = async () => { for (const id of selectedIds) await sb.from("store_products").delete().eq("id", id); setProducts(p => p.filter(x => !selectedIds.has(x.id))); setSelectedIds(new Set()); setToast({ msg: `${selectedIds.size} products deleted`, type: "success" }); };
  const bulkArchive = async () => { for (const id of selectedIds) await sb.from("store_products").update({ is_active: false }).eq("id", id); setProducts(p => p.map(x => selectedIds.has(x.id) ? { ...x, is_active: false } : x)); setSelectedIds(new Set()); setToast({ msg: `${selectedIds.size} products archived`, type: "success" }); };

  // Chart data
  const dailyRev = useMemo(() => { const map: Record<string, number> = {}; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); map[d.toISOString().split("T")[0]] = 0; } paid.forEach(o => { const k = o.created_at.split("T")[0]; if (map[k] !== undefined) map[k] += o.total; }); return Object.entries(map).map(([k, v]) => ({ date: new Date(k).getDate().toString(), revenue: v })); }, [paid]);

  const hourlyToday = useMemo(() => {
    const now = new Date(); const curHour = now.getHours();
    return Array.from({ length: 24 }, (_, i) => {
      const label = i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`;
      let tCum = 0, yCum = 0;
      for (let h = 0; h <= i; h++) { tCum += todayPaid.filter(o => new Date(o.created_at).getHours() === h).reduce((s, o) => s + o.total, 0); yCum += yesterdayPaid.filter(o => new Date(o.created_at).getHours() === h).reduce((s, o) => s + o.total, 0); }
      return { hour: label, today: i <= curHour ? tCum : null, yesterday: yCum };
    });
  }, [todayPaid, yesterdayPaid]);

  const channelData = useMemo(() => { const m: Record<string, number> = {}; paid.forEach(o => { m[o.channel || "offline"] = (m[o.channel || "offline"] || 0) + o.total; }); return Object.entries(m).map(([n, v], i) => ({ name: n, value: v, fill: COLORS[i] })); }, [paid]);
  const paymentData = useMemo(() => { const m: Record<string, number> = {}; paid.forEach(o => { m[o.payment_method || "other"] = (m[o.payment_method || "other"] || 0) + o.total; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([n, v], i) => ({ name: n, value: v, fill: COLORS[i] })); }, [paid]);
  const categoryRev = useMemo(() => { const m: Record<string, number> = {}; paid.forEach(o => (o.items || []).forEach((i: any) => { const p = products.find(x => x.id === i.product_id); const c = p?.category || "Other"; m[c] = (m[c] || 0) + (i.line_total || i.price * i.qty); })); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([n, v], i) => ({ name: n, value: v, fill: COLORS[i] })); }, [paid, products]);
  const topProducts = useMemo(() => { const m: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {}; paid.forEach(o => (o.items || []).forEach((i: any) => { if (!m[i.name]) m[i.name] = { name: i.name, qty: 0, revenue: 0, cost: 0 }; m[i.name].qty += i.qty; m[i.name].revenue += i.line_total || i.price * i.qty; m[i.name].cost += (i.cost_price || 0) * i.qty; })); return Object.values(m).sort((a, b) => b.revenue - a.revenue).slice(0, 10); }, [paid]);
  const hourlySales = useMemo(() => { const h = Array.from({ length: 24 }, (_, i) => ({ hour: i < 12 ? `${i || 12}a` : `${i === 12 ? 12 : i - 12}p`, count: 0, revenue: 0 })); paid.forEach(o => { const hr = new Date(o.created_at).getHours(); h[hr].count++; h[hr].revenue += o.total; }); return h; }, [paid]);
  const stockForecast = useMemo(() => { const days = paid.length > 0 ? Math.max(1, Math.ceil((Date.now() - new Date(paid[paid.length - 1].created_at).getTime()) / 86400000)) : 30; const sm: Record<string, number> = {}; paid.forEach(o => (o.items || []).forEach((i: any) => { sm[i.name] = (sm[i.name] || 0) + i.qty; })); return products.filter(p => p.is_active).map(p => { const sold = sm[p.name] || 0; const daily = sold / days; return { ...p, dailyRate: Math.round(daily * 10) / 10, daysLeft: daily > 0 ? Math.round(p.stock_qty / daily) : 999, sold }; }).sort((a, b) => a.daysLeft - b.daysLeft); }, [products, paid]);

  return (
    <div className="max-w-7xl mx-auto">
      {receiptOrder && <ReceiptModal order={receiptOrder} orgName={typeof window !== "undefined" ? localStorage.getItem("activeOrgName") || "Store" : "Store"} onClose={() => setReceiptOrder(null)} />}
      {inventoryProduct && <InventoryLogModal product={inventoryProduct} onClose={() => setInventoryProduct(null)} />}
      {showImport && <ProductImportModal onImport={async (rows) => {
        const orgId = await getOrgId(sb);
        let count = 0;
        for (const r of rows) {
          const { error } = await sb.from("store_products").insert({
            org_id: orgId, name: r.name, price: r.price, cost_price: r.cost_price || 0,
            sku: r.sku, category: r.category, stock_qty: r.stock_qty || 0,
            barcode: r.barcode, vendor: r.vendor, description: r.description,
            min_stock: 5, unit: "piece", channel: "both", is_active: true,
          });
          if (!error) count++;
        }
        fetchData(); setToast({ msg: `Imported ${count} of ${rows.length} products`, type: "success" });
      }} onClose={() => setShowImport(false)} />}
      {editProduct !== null && <ProductDetail product={editProduct === "new" ? null : editProduct} onSave={p => { if (editProduct === "new") setProducts(prev => [p, ...prev]); else setProducts(prev => prev.map(x => x.id === p.id ? p : x)); setToast({ msg: "Product saved", type: "success" }); }} onDelete={id => { setProducts(p => p.filter(x => x.id !== id)); setToast({ msg: "Deleted", type: "success" }); }} onDuplicate={p => { setEditProduct(p as any); }} onClose={() => setEditProduct(null)} />}
      {selectedOrder && <OrderDetail order={selectedOrder} onUpdate={handleOrderUpdate} onClose={() => setSelectedOrder(null)} />}
      {selectedCustomer && <CustomerDetail profile={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
      {showPOS && <POSModal products={products} onSave={(order?: Order) => { fetchData(); setToast({ msg: "Order placed!", type: "success" }); }} onClose={() => setShowPOS(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div><h1 className="text-xl font-bold text-gray-900">Store</h1><p className="text-sm text-gray-400">{products.length} products · {paid.length} orders · {fmtINR(totalRev)} revenue</p></div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 hover:bg-gray-100 rounded-xl border border-gray-200 transition"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
          <button onClick={() => setShowPOS(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm transition"><ShoppingCart className="w-4 h-4" />New sale</button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 shadow-sm transition"><Upload className="w-4 h-4" />Import</button>
          <button onClick={() => setEditProduct("new")} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition"><Plus className="w-4 h-4" />Add product</button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        {[
          { l: "Today", v: fmtINR(todayRev), s: `${todayPaid.length} orders`, c: "#22C55E", ic: <IndianRupee className="w-4 h-4" />, trend: revChange },
          { l: "Revenue", v: fmtINR(totalRev), s: `${paid.length} orders`, c: "#6366F1", ic: <TrendingUp className="w-4 h-4" /> },
          { l: "Profit", v: fmtINR(totalProfit), s: `${totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0}% margin`, c: "#8B5CF6", ic: <BarChart3 className="w-4 h-4" /> },
          { l: "Avg order", v: fmtINR(avgOrder), s: `${totalItemsSold} items sold`, c: "#06B6D4", ic: <Hash className="w-4 h-4" /> },
          { l: "Inventory", v: fmtINR(inventoryValue), s: `Retail: ${fmtINR(retailValue)}`, c: "#F59E0B", ic: <Package className="w-4 h-4" /> },
          { l: "Low stock", v: lowStock.length.toString(), s: lowStock.length > 0 ? lowStock[0].name : "All healthy", c: lowStock.length > 0 ? "#EF4444" : "#22C55E", ic: <AlertCircle className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.c + "12", color: s.c }}>{s.ic}</div>{s.trend !== undefined && s.trend !== 0 && <span className={`text-[10px] font-bold flex items-center gap-0.5 ${s.trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>{s.trend >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}{Math.abs(s.trend)}%</span>}</div>
            <p className="text-[10px] text-gray-400 uppercase">{s.l}</p><p className="text-lg font-bold text-gray-900">{s.v}</p><p className="text-[10px] text-gray-400">{s.s}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([{ id: "products" as const, l: "Products", c: products.length }, { id: "orders" as const, l: "Orders", c: orders.length }, { id: "customers" as const, l: "Customers", c: customerData.length }, { id: "analytics" as const, l: "Analytics" }]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setCatFilter(""); setStatusFilter(""); setOrderStatusFilter(""); setSelectedIds(new Set()); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{t.l}{t.c !== undefined && <span className="text-xs text-gray-400">({t.c})</span>}</button>
          ))}
        </div>
        {tab === "products" && (
          <div className="flex gap-2 flex-wrap">
            <div className="relative w-44"><Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            {categories.length > 0 && <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="">All status</option><option value="active">Active</option><option value="draft">Draft</option></select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="created_at">Newest</option><option value="name">Name</option><option value="price_desc">Price ↓</option><option value="price_asc">Price ↑</option><option value="stock_asc">Stock ↑</option></select>
          </div>
        )}
        {tab === "orders" && (
          <div className="flex gap-2">
            <div className="relative w-44"><Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="">All statuses</option>{ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {tab === "products" && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl mb-3">
          <span className="text-sm font-semibold text-indigo-700">{selectedIds.size} selected</span>
          <button onClick={bulkArchive} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Archive className="w-3 h-3" />Archive</button>
          <button onClick={bulkDelete} className="px-3 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-gray-500 hover:text-gray-700">Clear</button>
        </div>
      )}

      {/* PRODUCTS */}
      {tab === "products" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
          : sortedProducts.length === 0 ? <div className="text-center py-16"><Package className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">{products.length === 0 ? "No products yet" : "No match"}</p><button onClick={() => setEditProduct("new")} className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4 inline mr-1" />Add product</button></div>
          : <><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-3 w-10"><input type="checkbox" checked={selectedIds.size === sortedProducts.length && sortedProducts.length > 0} onChange={toggleAll} className="rounded" /></th>
            {["", "Product", "Status", "Inventory", "Price", "Category", "Channel", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}
          </tr></thead><tbody className="divide-y divide-gray-100">
            {sortedProducts.map(p => {
              const margin = p.price > 0 && p.cost_price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0;
              return (
                <tr key={p.id} className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(p.id) ? "bg-indigo-50/50" : ""}`} onClick={() => setEditProduct(p)}>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" /></td>
                  <td className="px-4 py-3 w-14">{p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>}</td>
                  <td className="px-4 py-3"><p className="text-sm font-semibold text-gray-900">{p.name}</p><p className="text-xs text-gray-400">{p.sku || "No SKU"}{p.vendor ? ` · ${p.vendor}` : ""}</p>{p.tags && p.tags.length > 0 && <div className="flex gap-1 mt-0.5">{p.tags.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded">{t}</span>)}</div>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.is_active ? "Active" : "Draft"}</span></td>
                  <td className="px-4 py-3"><span className={`text-sm font-medium ${p.stock_qty <= p.min_stock ? "text-red-600" : "text-gray-700"}`}>{p.stock_qty}</span><span className="text-xs text-gray-400 ml-1">{p.unit}</span>{p.stock_qty <= p.min_stock && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] rounded font-bold">LOW</span>}</td>
                  <td className="px-4 py-3"><p className="text-sm font-bold text-gray-900">{fmtINR(p.price)}</p>{p.compare_at_price && p.compare_at_price > p.price && <p className="text-[10px] text-gray-400 line-through">{fmtINR(p.compare_at_price)}</p>}{margin > 0 && <p className="text-[10px] text-emerald-600">{margin}% margin</p>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.category || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.channel === "online" ? "bg-blue-100 text-blue-700" : p.channel === "offline" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>{p.channel === "both" ? "All" : p.channel}</span></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><button onClick={() => setEditProduct(p)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4 text-gray-400" /></button></td>
                </tr>
              );
            })}
          </tbody></table></div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between"><span>{sortedProducts.length} of {products.length} products</span><div className="flex items-center gap-3"><span>Inventory: {fmtINR(inventoryValue)} · Retail: {fmtINR(retailValue)}</span><button onClick={() => exportProductsCSV(products)} className="text-indigo-600 hover:text-indigo-700 font-semibold">Export CSV</button></div></div>
          </>}
        </div>
      )}

      {/* ORDERS */}
      {tab === "orders" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filteredOrders.length === 0 ? <div className="text-center py-16"><ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">{orders.length === 0 ? "No orders yet" : `No orders with status "${orderStatusFilter}"`}</p><p className="text-xs text-gray-400 mt-1">Orders from POS and online channels will appear here</p><button onClick={() => setShowPOS(true)} className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700"><ShoppingCart className="w-4 h-4 inline mr-1" />Create new sale</button></div> : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
              {["Order", "Customer", "Items", "Total", "Payment", "Status", "Channel", "Date", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-indigo-600">{o.order_number}</td>
                  <td className="px-5 py-3.5"><p className="text-sm text-gray-900">{o.customer_name || "Walk-in"}</p>{o.customer_phone && <p className="text-xs text-gray-400">{o.customer_phone}</p>}</td>
                  <td className="px-5 py-3.5"><div className="max-w-[160px]">{(o.items || []).slice(0, 2).map((i: any, idx: number) => <p key={idx} className="text-xs text-gray-600 truncate">{i.qty}x {i.name}</p>)}{(o.items || []).length > 2 && <p className="text-xs text-gray-400">+{o.items.length - 2} more</p>}</div></td>
                  <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{fmtINR(o.total)}</td>
                  <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : o.payment_status === "refunded" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{o.payment_method?.toUpperCase()} · {o.payment_status}</span></td>
                  <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.order_status === "delivered" ? "bg-emerald-100 text-emerald-700" : o.order_status === "cancelled" ? "bg-red-100 text-red-600" : o.order_status === "refunded" ? "bg-orange-100 text-orange-700" : o.order_status === "shipped" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{o.order_status}</span></td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{o.channel === "online" ? "Online" : o.channel === "whatsapp" ? "WhatsApp" : "Walk-in"}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}<br/>{fmtTime(o.created_at)}</td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setReceiptOrder(o)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="View receipt">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody></table>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
              <div className="flex items-center gap-4">
                <span>{filteredOrders.length} orders</span>
                <span>Revenue: {fmtINR(filteredOrders.filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total, 0))}</span>
                <span className="text-emerald-600">{filteredOrders.filter(o => o.order_status === "delivered").length} delivered</span>
                <span className="text-red-500">{filteredOrders.filter(o => o.order_status === "cancelled" || o.order_status === "refunded").length} cancelled/refunded</span>
              </div>
              <button onClick={() => exportOrdersCSV(orders)} className="text-indigo-600 hover:text-indigo-700 font-semibold">Export CSV</button>
            </div>
            </div>
          )}
        </div>
      )}

      {/* CUSTOMERS */}
      {tab === "customers" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {customerData.length === 0 ? <div className="text-center py-16"><Users className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">No customers yet</p><p className="text-xs text-gray-400 mt-1">Customer profiles are auto-created from orders with names</p></div> : (
            <><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
              {["Customer", "Orders", "Total spent", "Avg order", "Last order"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {customerData.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold">{c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}</div><div><p className="text-sm font-semibold text-gray-900">{c.name}</p>{c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}</div></div></td>
                  <td className="px-5 py-3.5"><span className="text-sm text-gray-700">{c.orders.length}</span>{c.orders.length > 1 && <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] rounded font-bold">REPEAT</span>}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{fmtINR(c.totalSpent)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{fmtINR(c.avgOrder)}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{fmtDate(c.lastOrder)}</td>
                </tr>
              ))}
            </tbody></table></div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between"><span>{customerData.length} customers · {customerData.filter(c => c.orders.length > 1).length} repeat · Avg LTV: {fmtINR(customerData.reduce((s, c) => s + c.totalSpent, 0) / Math.max(customerData.length, 1))}</span><button onClick={() => exportCustomersCSV(customerData)} className="text-indigo-600 hover:text-indigo-700 font-semibold">Export CSV</button></div>
            </>
          )}
        </div>
      )}

      {/* ANALYTICS */}
      {tab === "analytics" && (
        <div className="space-y-6">
          {/* Today vs Yesterday — Shopify style */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div><h3 className="text-sm font-bold text-gray-900">Sales today vs yesterday</h3><p className="text-xs text-gray-400">Cumulative hourly revenue comparison</p></div>
              <div className="text-right"><p className="text-2xl font-bold text-gray-900">{fmtINR(todayRev)}</p><span className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${revChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>{revChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(revChange)}% vs yesterday</span></div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyToday}><defs><linearGradient id="todayG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} /><stop offset="100%" stopColor="#6366F1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#9CA3AF" }} interval={2} /><YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v: number) => v > 999 ? `${Math.round(v / 1000)}k` : v.toString()} /><Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="yesterday" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="5 3" fill="none" name="Yesterday" dot={false} />
                <Area type="monotone" dataKey="today" stroke="#6366F1" strokeWidth={2.5} fill="url(#todayG)" name="Today" dot={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 30-day revenue */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue trend (30 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyRev}><defs><linearGradient id="revG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} /><stop offset="100%" stopColor="#22C55E" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} fill="url(#revG2)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly pattern */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Sales by hour of day</h3>
            <ResponsiveContainer width="100%" height={160}><BarChart data={hourlySales}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} /><YAxis tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" fill="#8B5CF6" radius={[3,3,0,0]} name="Orders" /></BarChart></ResponsiveContainer>
          </div>

          {/* Pies: channel, payment, category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[{ title: "By channel", data: channelData }, { title: "By payment", data: paymentData }, { title: "By category", data: categoryRev }].map(chart => (
              <div key={chart.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">{chart.title}</h3>
                {chart.data.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No data</p> :
                  <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>{chart.data.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer>
                }
              </div>
            ))}
          </div>

          {/* Top products + Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Top products by revenue</h3>
              {topProducts.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No data</p> :
                <div className="space-y-2.5">{topProducts.map((p, i) => {
                  const m = p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0;
                  return (<div key={p.name} className="flex items-center gap-3"><span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span><div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-0.5"><p className="text-sm text-gray-900 truncate font-medium">{p.name}</p><span className="text-sm font-bold text-gray-900 flex-shrink-0">{fmtINR(p.revenue)}</span></div><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }} /></div><span className="text-[10px] text-gray-400 flex-shrink-0">{p.qty} sold · {m}%</span></div></div></div>);
                })}</div>
              }
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Inventory forecast</h3>
              <p className="text-xs text-gray-400 mb-4">Estimated days until stockout</p>
              <div className="space-y-2">{stockForecast.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center gap-3 py-1.5">
                  <div className="flex-1 min-w-0"><p className="text-sm text-gray-900 truncate">{p.name}</p><p className="text-[10px] text-gray-400">{p.stock_qty} left · {p.dailyRate}/day avg</p></div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${p.daysLeft <= 7 ? "bg-red-100 text-red-700" : p.daysLeft <= 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{p.daysLeft > 365 ? "365+" : p.daysLeft}d</span>
                </div>
              ))}</div>
            </div>
          </div>

          {/* Low stock alerts */}
          {lowStock.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Low stock alerts ({lowStock.length})</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{lowStock.map(p => (
                <div key={p.id} className="p-3 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:shadow-sm transition" onClick={() => { setTab("products"); setEditProduct(p); }}>
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-red-600 font-semibold mt-1">{p.stock_qty} {p.unit} left (min: {p.min_stock})</p>
                </div>
              ))}</div>
            </div>
          )}

          {/* Customer insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Customer insights</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{customerData.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Total customers</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{customerData.filter(c => c.orders.length > 1).length}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Repeat customers</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{customerData.length > 0 ? Math.round((customerData.filter(c => c.orders.length > 1).length / customerData.length) * 100) : 0}%</p>
                  <p className="text-[10px] text-gray-400 uppercase">Repeat rate</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{fmtINR(customerData.length > 0 ? customerData.reduce((s, c) => s + c.totalSpent, 0) / customerData.length : 0)}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Avg LTV</p>
                </div>
              </div>
              {customerData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Top 5 customers</p>
                  <div className="space-y-2">{customerData.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-[9px] font-bold">{c.name[0]}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs text-gray-900 truncate">{c.name}</p></div>
                      <span className="text-xs font-bold text-gray-900">{fmtINR(c.totalSpent)}</span>
                      <span className="text-[10px] text-gray-400">{c.orders.length} orders</span>
                    </div>
                  ))}</div>
                </div>
              )}
            </div>

            {/* Order fulfillment breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Order fulfillment</h3>
              <div className="space-y-3">
                {ORDER_STATUSES.map(status => {
                  const count = orders.filter(o => o.order_status === status).length;
                  const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                  const colors: Record<string, string> = { draft: "#9CA3AF", confirmed: "#6366F1", processing: "#F59E0B", shipped: "#3B82F6", delivered: "#22C55E", cancelled: "#EF4444", refunded: "#F97316" };
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 capitalize">{status}</span>
                        <span className="text-xs font-semibold text-gray-900">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[status] || "#9CA3AF" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs">
                <span className="text-gray-500">Fulfillment rate</span>
                <span className="font-bold text-emerald-600">{orders.length > 0 ? Math.round((orders.filter(o => o.order_status === "delivered").length / orders.length) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Cancellation rate</span>
                <span className="font-bold text-red-500">{orders.length > 0 ? Math.round((orders.filter(o => o.order_status === "cancelled" || o.order_status === "refunded").length / orders.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Inventory valuation by category */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Inventory valuation by category</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-200">
                  {["Category", "SKUs", "Total stock", "Cost value", "Retail value", "Potential profit", "Low stock"].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-2">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {[...new Set(products.map(p => p.category || "Uncategorized"))].map(cat => {
                    const catProducts = products.filter(p => (p.category || "Uncategorized") === cat);
                    const skus = catProducts.length;
                    const totalStock = catProducts.reduce((s, p) => s + p.stock_qty, 0);
                    const costVal = catProducts.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
                    const retVal = catProducts.reduce((s, p) => s + p.price * p.stock_qty, 0);
                    const lowCount = catProducts.filter(p => p.stock_qty <= p.min_stock && p.is_active).length;
                    return (
                      <tr key={cat} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{cat}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{skus}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{totalStock}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{fmtINR(costVal)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{fmtINR(retVal)}</td>
                        <td className="px-4 py-2.5 text-sm text-emerald-600 font-semibold">{fmtINR(retVal - costVal)}</td>
                        <td className="px-4 py-2.5">{lowCount > 0 ? <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-bold">{lowCount}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{products.length}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{products.reduce((s, p) => s + p.stock_qty, 0)}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{fmtINR(inventoryValue)}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{fmtINR(retailValue)}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-emerald-600">{fmtINR(retailValue - inventoryValue)}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-red-600">{lowStock.length}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          {/* Revenue by day of week */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue by day of week</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={(() => {
                const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => ({ day: d, revenue: 0, orders: 0 }));
                paid.forEach(o => { const d = new Date(o.created_at).getDay(); days[d].revenue += o.total; days[d].orders++; });
                return days;
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#06B6D4" radius={[4,4,0,0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary stats bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 shadow-sm text-white">
            <h3 className="text-sm font-bold mb-4 opacity-90">Performance summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div><p className="text-2xl font-bold">{fmtINR(totalRev)}</p><p className="text-xs opacity-70">Total revenue</p></div>
              <div><p className="text-2xl font-bold">{fmtINR(totalProfit)}</p><p className="text-xs opacity-70">Gross profit</p></div>
              <div><p className="text-2xl font-bold">{paid.length}</p><p className="text-xs opacity-70">Orders fulfilled</p></div>
              <div><p className="text-2xl font-bold">{totalItemsSold}</p><p className="text-xs opacity-70">Items sold</p></div>
              <div><p className="text-2xl font-bold">{customerData.length}</p><p className="text-xs opacity-70">Unique customers</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border animate-in slide-in-from-bottom-5 ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="w-4 h-4" />{toast.msg}<button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}