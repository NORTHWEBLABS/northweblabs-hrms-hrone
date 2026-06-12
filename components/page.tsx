"use client";
// Route: app/(dashboard)/store/page.tsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, Search, X, Loader2, CheckCircle2, AlertCircle,
  Package, ShoppingCart, IndianRupee, Globe, Store,
  Minus, Trash2, TrendingUp, BarChart3, Users,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

interface Product { id: string; name: string; description: string | null; sku: string | null; category: string | null; price: number; cost_price: number; stock_qty: number; min_stock: number; unit: string; image_url: string | null; is_active: boolean; channel: string; created_at: string; }
interface Order { id: string; order_number: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null; channel: string; items: any[]; subtotal: number; tax_amount: number; discount_amount: number; total: number; payment_method: string | null; payment_status: string; order_status: string; notes: string | null; created_at: string; }
interface CartItem { product: Product; qty: number; }

const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
const UNITS = ["piece", "kg", "litre", "box", "pack", "set"];
const CHANNELS = [{ value: "both", label: "Online + Offline" }, { value: "online", label: "Online Only" }, { value: "offline", label: "Offline Only" }];

async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) {
    const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle();
    if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; }
  }
  return "";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function Stat({ icon, label, value, sub, trend, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: { value: number; label: string }; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "12", color }}>{icon}</div>
        {trend && (
          <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${trend.value >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Add Product Modal ─────────────────────────────────────────────────────────
function AddProductModal({ onSave, onClose }: { onSave: (p: Product) => void; onClose: () => void }) {
  const sb = useSB();
  const [f, setF] = useState({ name: "", description: "", sku: "", category: "", price: "", cost_price: "", stock_qty: "0", min_stock: "5", unit: "piece", channel: "both" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) { setError("Product name required"); return; }
    if (!f.price || Number(f.price) <= 0) { setError("Selling price required"); return; }
    setSaving(true);
    const orgId = await getOrgId(sb);
    if (!orgId) { setError("No organization found"); setSaving(false); return; }
    const { data, error: e } = await sb.from("store_products").insert({
      org_id: orgId, name: f.name.trim(), description: f.description || null,
      sku: f.sku || null, category: f.category || null,
      price: Number(f.price), cost_price: Number(f.cost_price || 0),
      stock_qty: Number(f.stock_qty || 0), min_stock: Number(f.min_stock || 5),
      unit: f.unit, channel: f.channel, is_active: true,
    }).select().single();
    if (e) { setError(e.message); setSaving(false); return; }
    onSave(data as Product); onClose();
  };

  const margin = Number(f.price) > 0 && Number(f.cost_price) > 0 ? Math.round(((Number(f.price) - Number(f.cost_price)) / Number(f.price)) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-500" />Add Product</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product Name *</label>
            <input value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. Wireless Mouse" autoFocus
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Selling Price (₹) *</label>
              <input type="number" value={f.price} onChange={e => s("price", e.target.value)} placeholder="1499"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cost Price (₹)</label>
              <input type="number" value={f.cost_price} onChange={e => s("cost_price", e.target.value)} placeholder="1000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          {margin > 0 && (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center justify-between">
              <span>Profit margin</span>
              <span className="font-bold">{margin}% · {fmtINR(Number(f.price) - Number(f.cost_price))} per unit</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock</label><input type="number" value={f.stock_qty} onChange={e => s("stock_qty", e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit</label><select value={f.unit} onChange={e => s("unit", e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">SKU</label><input value={f.sku} onChange={e => s("sku", e.target.value)} placeholder="SKU001" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label><input value={f.category} onChange={e => s("category", e.target.value)} placeholder="Electronics" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Channel</label><select value={f.channel} onChange={e => s("channel", e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">{CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label><textarea value={f.description} onChange={e => s("description", e.target.value)} placeholder="Product details…" rows={2} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" /></div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm text-white bg-indigo-600 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add Product
          </button>
        </div>
      </div>
    </div>
  );
}

// ── POS / New Order ───────────────────────────────────────────────────────────
function NewOrderModal({ products, onSave, onClose }: { products: Product[]; onSave: (o: Order) => void; onClose: () => void }) {
  const sb = useSB();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [channel, setChannel] = useState("offline");
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const addToCart = (p: Product) => {
    setCart(prev => { const ex = prev.find(c => c.product.id === p.id); if (ex) return prev.map(c => c.product.id === p.id ? { ...c, qty: Math.min(c.qty + 1, p.stock_qty) } : c); return [...prev, { product: p, qty: 1 }]; });
  };
  const updateQty = (pid: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== pid) return c;
      const newQty = Math.max(0, Math.min(c.qty + delta, c.product.stock_qty));
      return { ...c, qty: newQty };
    }).filter(c => c.qty > 0));
  };

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const discountAmt = Number(discount) || 0;
  const taxable = subtotal - discountAmt;
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalProfit = cart.reduce((s, c) => s + (c.product.price - c.product.cost_price) * c.qty, 0);
  const filtered = products.filter(p => p.is_active && p.stock_qty > 0 && (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())));

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    const orgId = await getOrgId(sb);
    const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await sb.from("store_orders").insert({
      org_id: orgId || null, order_number: orderNum,
      customer_name: customer.name || null, customer_phone: customer.phone || null, customer_email: customer.email || null,
      channel, items: cart.map(c => ({ product_id: c.product.id, name: c.product.name, sku: c.product.sku, price: c.product.price, cost_price: c.product.cost_price, qty: c.qty, unit: c.product.unit, line_total: c.product.price * c.qty })),
      subtotal, tax_amount: tax, discount_amount: discountAmt, total,
      payment_method: payment, payment_status: "paid", order_status: "confirmed", notes: notes || null,
    }).select().single();
    if (!error && data) {
      for (const c of cart) { await sb.from("store_products").update({ stock_qty: Math.max(0, c.product.stock_qty - c.qty) }).eq("id", c.product.id); }
      onSave(data as Order);
    }
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden">
        {/* Left — Products */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-500" />New Order</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(p => {
                const inCart = cart.find(c => c.product.id === p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className={`text-left p-3 rounded-xl border transition-all hover:shadow-sm ${inCart ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                      {inCart && <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ml-1">{inCart.qty}</span>}
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {p.sku && <span className="text-xs text-gray-400 font-mono">{p.sku}</span>}
                      {p.category && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{p.category}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-indigo-600">{fmtINR(p.price)}</span>
                      <span className={`text-xs ${p.stock_qty <= p.min_stock ? "text-red-500 font-semibold" : "text-gray-400"}`}>{p.stock_qty} {p.unit}</span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="col-span-full text-center py-10 text-sm text-gray-400">No products found</div>}
            </div>
          </div>
        </div>

        {/* Right — Cart */}
        <div className="w-[340px] flex flex-col bg-gray-50">
          <div className="px-5 py-4 border-b border-gray-100 bg-white">
            <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
              Cart <span className="text-xs font-normal text-gray-400">{totalItems} items</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && <div className="text-center py-12"><ShoppingCart className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">Tap products to add</p></div>}
            {cart.map(c => (
              <div key={c.product.id} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{c.product.name}</p>
                    <p className="text-xs text-gray-400">{fmtINR(c.product.price)} × {c.qty}</p>
                  </div>
                  <button onClick={() => setCart(p => p.filter(x => x.product.id !== c.product.id))} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-100 rounded-lg">
                    <button onClick={() => updateQty(c.product.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-l-lg"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-8 text-center">{c.qty}</span>
                    <button onClick={() => updateQty(c.product.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-r-lg"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{fmtINR(c.product.price * c.qty)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Customer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-2">
            <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Customer name"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="grid grid-cols-2 gap-2">
              <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Phone" type="tel"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Discount ₹" type="number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div className="flex gap-1.5">
              {["cash", "card", "upi"].map(m => (
                <button key={m} onClick={() => setPayment(m)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition ${payment === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}>{m.toUpperCase()}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {[{ v: "offline", icon: <Store className="w-3 h-3" />, l: "Walk-in" }, { v: "online", icon: <Globe className="w-3 h-3" />, l: "Online" }].map(c => (
                <button key={c.v} onClick={() => setChannel(c.v)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1 ${channel === c.v ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200"}`}>{c.icon}{c.l}</button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs text-gray-500"><span>Subtotal ({totalItems} items)</span><span>{fmtINR(subtotal)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-xs text-emerald-600"><span>Discount</span><span>-{fmtINR(discountAmt)}</span></div>}
              <div className="flex justify-between text-xs text-gray-500"><span>GST (18%)</span><span>{fmtINR(tax)}</span></div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span>{fmtINR(total)}</span></div>
              {totalProfit > 0 && <div className="flex justify-between text-xs text-emerald-600"><span>Est. profit</span><span>+{fmtINR(totalProfit)}</span></div>}
            </div>
            <button onClick={placeOrder} disabled={saving || cart.length === 0}
              className="w-full py-3 text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200/40 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Place Order · {fmtINR(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Order {order.order_number}</h2>
            <p className="text-xs text-gray-400">{fmtDate(order.created_at)} · {fmtTime(order.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {/* Customer */}
          {(order.customer_name || order.customer_phone) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer</p>
              {order.customer_name && <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>}
              {order.customer_phone && <p className="text-xs text-gray-500">{order.customer_phone}</p>}
            </div>
          )}
          {/* Items */}
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items ({order.items?.length || 0})</p>
          <div className="space-y-2 mb-4">
            {(order.items || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.qty} × {fmtINR(item.price)}{item.sku ? ` · ${item.sku}` : ""}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{fmtINR(item.line_total || item.total || item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{fmtINR(order.subtotal)}</span></div>
            {order.discount_amount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{fmtINR(order.discount_amount)}</span></div>}
            <div className="flex justify-between text-sm text-gray-500"><span>Tax</span><span>{fmtINR(order.tax_amount)}</span></div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{fmtINR(order.total)}</span></div>
          </div>
          {/* Meta */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${order.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{order.payment_method?.toUpperCase() || "—"} · {order.payment_status}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${order.channel === "online" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{order.channel === "online" ? "🌐 Online" : "🏪 Walk-in"}</span>
          </div>
          {order.notes && <p className="mt-3 text-xs text-gray-500 italic">Note: {order.notes}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Store Page ───────────────────────────────────────────────────────────
export default function StorePage() {
  const sb = useSB();
  const [tab, setTab] = useState<"products" | "orders" | "analytics">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    const [{ data: prods }, { data: ords }] = await Promise.all([
      sb.from("store_products").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
      sb.from("store_orders").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
    ]);
    setProducts((prods || []) as Product[]);
    setOrders((ords || []) as Order[]);
    setLoading(false);
  }, [sb]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Analytics
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalProfit = paidOrders.reduce((s, o) => {
    return s + (o.items || []).reduce((ps: number, item: any) => ps + ((item.price - (item.cost_price || 0)) * item.qty), 0);
  }, 0);
  const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stock_qty <= p.min_stock && p.is_active);
  const totalStock = products.reduce((s, p) => s + p.stock_qty, 0);
  const onlineOrders = paidOrders.filter(o => o.channel === "online");
  const offlineOrders = paidOrders.filter(o => o.channel === "offline");
  const uniqueCustomers = new Set(orders.filter(o => o.customer_name).map(o => o.customer_name)).size;

  // Top products by units sold
  const productSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    paidOrders.forEach(o => (o.items || []).forEach((item: any) => {
      const key = item.name || item.product_id;
      if (!map[key]) map[key] = { name: item.name, qty: 0, revenue: 0 };
      map[key].qty += item.qty;
      map[key].revenue += item.line_total || item.total || item.price * item.qty;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders]);

  const filteredProducts = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = orders.filter(o => !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showAddProduct && <AddProductModal onSave={p => { setProducts(prev => [p, ...prev]); setToast({ msg: `${p.name} added`, type: "success" }); }} onClose={() => setShowAddProduct(false)} />}
      {showNewOrder && <NewOrderModal products={products} onSave={o => { setOrders(prev => [o, ...prev]); setToast({ msg: `Order ${o.order_number} placed!`, type: "success" }); fetchData(); }} onClose={() => setShowNewOrder(false)} />}
      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-900">Store</h1><p className="text-sm text-gray-400 mt-0.5">Products, orders & analytics</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewOrder(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200/40"><ShoppingCart className="w-4 h-4" />New Sale</button>
          <button onClick={() => setShowAddProduct(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200/40"><Plus className="w-4 h-4" />Add Product</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat icon={<IndianRupee className="w-5 h-5" />} label="Total Revenue" value={fmtINR(totalRevenue)} sub={`${paidOrders.length} orders`} color="#6366F1" />
        <Stat icon={<TrendingUp className="w-5 h-5" />} label="Today" value={fmtINR(todayRevenue)} sub={`${todayOrders.length} orders`} color="#22C55E" />
        <Stat icon={<BarChart3 className="w-5 h-5" />} label="Avg Order" value={fmtINR(avgOrderValue)} sub={`${uniqueCustomers} customers`} color="#8B5CF6" />
        <Stat icon={<Package className="w-5 h-5" />} label="Products" value={products.length.toString()} sub={`${lowStock.length} low stock · ${totalStock} units`} color="#F59E0B" />
        <Stat icon={<Users className="w-5 h-5" />} label="Channels" value={`${onlineOrders.length} / ${offlineOrders.length}`} sub="Online / Offline" color="#06B6D4" />
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: "products" as const, label: "Products", icon: <Package className="w-4 h-4" />, count: products.length },
            { id: "orders" as const, label: "Orders", icon: <ShoppingCart className="w-4 h-4" />, count: orders.length },
            { id: "analytics" as const, label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.icon}{t.label}{t.count !== undefined && <span className="text-xs text-gray-400 ml-0.5">({t.count})</span>}
            </button>
          ))}
        </div>
        {tab !== "analytics" && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}…`}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        )}
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
          : filteredProducts.length === 0 ? (
            <div className="text-center py-16"><Package className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">No products yet</p><button onClick={() => setShowAddProduct(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1"><Plus className="w-4 h-4" />Add first product</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {["Product", "SKU", "Selling Price", "Cost", "Margin", "Stock", "Channel", "Status"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => {
                    const margin = p.price > 0 && p.cost_price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5"><p className="text-sm font-semibold text-gray-900">{p.name}</p>{p.category && <p className="text-xs text-gray-400">{p.category}</p>}</td>
                        <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{p.sku || "—"}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{fmtINR(p.price)}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{p.cost_price ? fmtINR(p.cost_price) : "—"}</td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-semibold ${margin > 30 ? "text-emerald-600" : margin > 0 ? "text-amber-600" : "text-gray-400"}`}>{margin > 0 ? `${margin}%` : "—"}</span></td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold ${p.stock_qty <= p.min_stock ? "text-red-600" : "text-gray-700"}`}>{p.stock_qty} {p.unit}</span>
                          {p.stock_qty <= p.min_stock && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded font-semibold">Low</span>}
                        </td>
                        <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.channel === "online" ? "bg-blue-100 text-blue-700" : p.channel === "offline" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>{p.channel === "both" ? "On+Off" : p.channel}</span></td>
                        <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.is_active ? "Active" : "Off"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
          : filteredOrders.length === 0 ? (
            <div className="text-center py-16"><ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">No orders yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {["Order", "Customer", "Items", "Total", "Payment", "Channel", "Status", "Date"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                      <td className="px-5 py-3.5 text-sm font-mono font-semibold text-indigo-600">{o.order_number}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-900 font-medium">{o.customer_name || "Walk-in"}</p>
                        {o.customer_phone && <p className="text-xs text-gray-400">{o.customer_phone}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-[200px]">
                          {(o.items || []).slice(0, 2).map((item: any, i: number) => (
                            <p key={i} className="text-xs text-gray-600 truncate">{item.qty}× {item.name}</p>
                          ))}
                          {(o.items || []).length > 2 && <p className="text-xs text-gray-400">+{o.items.length - 2} more</p>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{fmtINR(o.total)}</td>
                      <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{o.payment_method?.toUpperCase() || "—"}</span></td>
                      <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.channel === "online" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{o.channel === "online" ? "Online" : "Walk-in"}</span></td>
                      <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.order_status === "confirmed" ? "bg-emerald-100 text-emerald-700" : o.order_status === "cancelled" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"}`}>{o.order_status}</span></td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}<br />{fmtTime(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">{filteredOrders.length} orders · Revenue: {fmtINR(totalRevenue)}</p>
                <p className="text-xs text-gray-400">Click order for details</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={<IndianRupee className="w-5 h-5" />} label="Gross Profit" value={fmtINR(totalProfit)} sub={`${totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0}% margin`} color="#22C55E" />
            <Stat icon={<ShoppingCart className="w-5 h-5" />} label="Total Orders" value={paidOrders.length.toString()} sub={`Avg ${fmtINR(avgOrderValue)}`} color="#6366F1" />
            <Stat icon={<Users className="w-5 h-5" />} label="Customers" value={uniqueCustomers.toString()} sub={`${Math.round(paidOrders.length / Math.max(uniqueCustomers, 1) * 10) / 10} orders/customer`} color="#8B5CF6" />
            <Stat icon={<Package className="w-5 h-5" />} label="Inventory Value" value={fmtINR(products.reduce((s, p) => s + p.cost_price * p.stock_qty, 0))} sub={`${totalStock} units in stock`} color="#F59E0B" />
          </div>

          {/* Top products */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Top Products by Revenue</h3>
            {productSales.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No sales data yet</p> : (
              <div className="space-y-3">
                {productSales.slice(0, 10).map((p, i) => {
                  const pct = productSales[0].revenue > 0 ? (p.revenue / productSales[0].revenue) * 100 : 0;
                  return (
                    <div key={p.name} className="flex items-center gap-4">
                      <span className="w-6 text-xs font-bold text-gray-400 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-500">{p.qty} sold</span>
                            <span className="text-sm font-bold text-gray-900">{fmtINR(p.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Channel breakdown + Payment breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Sales by Channel</h3>
              <div className="space-y-4">
                {[
                  { label: "Online", orders: onlineOrders, icon: <Globe className="w-4 h-4" />, color: "#3B82F6" },
                  { label: "Offline / Walk-in", orders: offlineOrders, icon: <Store className="w-4 h-4" />, color: "#F59E0B" },
                ].map(ch => {
                  const rev = ch.orders.reduce((s, o) => s + o.total, 0);
                  const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
                  return (
                    <div key={ch.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2"><span style={{ color: ch.color }}>{ch.icon}</span><span className="text-sm font-medium text-gray-700">{ch.label}</span></div>
                        <div className="text-right"><span className="text-sm font-bold text-gray-900">{fmtINR(rev)}</span><span className="text-xs text-gray-400 ml-2">{pct}%</span></div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: ch.color }} /></div>
                      <p className="text-xs text-gray-400 mt-1">{ch.orders.length} orders · Avg {ch.orders.length > 0 ? fmtINR(Math.round(rev / ch.orders.length)) : "₹0"}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Methods</h3>
              <div className="space-y-3">
                {["cash", "card", "upi"].map(method => {
                  const mOrders = paidOrders.filter(o => o.payment_method === method);
                  const mRevenue = mOrders.reduce((s, o) => s + o.total, 0);
                  const pct = totalRevenue > 0 ? Math.round((mRevenue / totalRevenue) * 100) : 0;
                  return (
                    <div key={method} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg">{method === "cash" ? "💵" : method === "card" ? "💳" : "📱"}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><p className="text-sm font-semibold text-gray-800 capitalize">{method}</p><p className="text-sm font-bold text-gray-900">{fmtINR(mRevenue)}</p></div>
                        <p className="text-xs text-gray-400">{mOrders.length} transactions · {pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Low Stock Alert ({lowStock.length} products)</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {lowStock.map(p => (
                  <div key={p.id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-red-600 font-semibold mt-1">{p.stock_qty} {p.unit} left (min: {p.min_stock})</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="w-4 h-4" />{toast.msg}<button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}