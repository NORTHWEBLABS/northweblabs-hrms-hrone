"use client";
// Route: app/(dashboard)/cashflow/page.tsx
// Cashflow Master — Inflow/Outflow tracking, burn rate, runway, P&L, budgets

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, Search, X, Loader2, CheckCircle2, AlertCircle,
  TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  ArrowDown, ArrowUp, BarChart3, PieChart, Wallet, Clock,
  RefreshCw, ChevronLeft, ChevronRight,
  Repeat,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

interface Entry { id: string; type: string; category: string; title: string; amount: number; date: string; description: string | null; payment_method: string | null; party_name: string | null; is_recurring: boolean; reference_number: string | null; created_at: string; }
interface Category { id: string; name: string; type: string; icon: string | null; color: string | null; }

const fmtINR = (n: number) => (n < 0 ? "-" : "") + "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "upi", "card", "cheque"];

async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function Stat({ icon, label, value, sub, trend, color, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: number; color: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${accent ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-indigo-500" : "bg-white border-gray-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "bg-white/20" : ""}`} style={!accent ? { background: color + "12", color } : undefined}>{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${accent ? "bg-white/20 text-white" : trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${accent ? "text-indigo-200" : "text-gray-400"}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-white" : "text-gray-900"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-indigo-200" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

// ── Add Entry Modal ───────────────────────────────────────────────────────────
function AddEntryModal({ categories, type, onSave, onClose }: { categories: Category[]; type: "inflow" | "outflow"; onSave: (e: Entry) => void; onClose: () => void }) {
  const sb = useSB();
  const [f, setF] = useState({ title: "", amount: "", category: "", date: new Date().toISOString().split("T")[0], description: "", payment_method: "bank_transfer", party_name: "", reference_number: "", is_recurring: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const filtered = categories.filter(c => c.type === type);

  const save = async () => {
    if (!f.title.trim()) { setError("Title required"); return; }
    if (!f.amount || Number(f.amount) <= 0) { setError("Amount required"); return; }
    setSaving(true);
    const orgId = await getOrgId(sb);
    if (!orgId) { setError("No org found"); setSaving(false); return; }
    const { data, error: e } = await sb.from("cashflow_entries").insert({
      org_id: orgId, type, title: f.title.trim(), amount: Number(f.amount),
      category: f.category || null, date: f.date, description: f.description || null,
      payment_method: f.payment_method || null, party_name: f.party_name || null,
      reference_number: f.reference_number || null, is_recurring: f.is_recurring,
    }).select().single();
    if (e) { setError(e.message); setSaving(false); return; }
    onSave(data as Entry); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`px-6 py-5 flex items-center justify-between ${type === "inflow" ? "bg-emerald-600" : "bg-red-500"} text-white`}>
          <div className="flex items-center gap-3">
            {type === "inflow" ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
            <h2 className="text-base font-bold">{type === "inflow" ? "Record Inflow" : "Record Outflow"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
            <input value={f.title} onChange={e => s("title", e.target.value)} placeholder={type === "inflow" ? "e.g. Client payment received" : "e.g. Office rent payment"} autoFocus
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₹) *</label>
              <input type="number" value={f.amount} onChange={e => s("amount", e.target.value)} placeholder="50000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
              <input type="date" value={f.date} onChange={e => s("date", e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {filtered.map(c => (
                <button key={c.id} onClick={() => s("category", f.category === c.name ? "" : c.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${f.category === c.name ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Party / Vendor</label>
              <input value={f.party_name} onChange={e => s("party_name", e.target.value)} placeholder="Company name"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
              <select value={f.payment_method} onChange={e => s("payment_method", e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reference / Invoice #</label>
            <input value={f.reference_number} onChange={e => s("reference_number", e.target.value)} placeholder="INV-001"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
            <input type="checkbox" checked={f.is_recurring} onChange={e => s("is_recurring", e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            <div><p className="text-xs font-semibold text-gray-800 flex items-center gap-1"><Repeat className="w-3.5 h-3.5" />Recurring entry</p><p className="text-xs text-gray-400">This amount repeats monthly</p></div>
          </label>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea value={f.description} onChange={e => s("description", e.target.value)} placeholder="Additional details…" rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl font-medium">Cancel</button>
          <button onClick={save} disabled={saving}
            className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${type === "inflow" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add {type === "inflow" ? "Inflow" : "Outflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Cashflow Page ────────────────────────────────────────────────────────
export default function CashflowPage() {
  const sb = useSB();
  const now = new Date();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState<"inflow" | "outflow" | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Date range
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const fetchData = useCallback(async () => {
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-31`;
    const [{ data: ents }, { data: cats }] = await Promise.all([
      sb.from("cashflow_entries").select("*").eq("org_id", oid).gte("date", startDate).lte("date", endDate).order("date", { ascending: false }),
      sb.from("cashflow_categories").select("*").eq("org_id", oid).order("name"),
    ]);
    setEntries((ents || []) as Entry[]);
    setCategories((cats || []) as Category[]);
    setLoading(false);
  }, [sb, viewMonth, viewYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  // Analytics
  const inflows = entries.filter(e => e.type === "inflow");
  const outflows = entries.filter(e => e.type === "outflow");
  const totalIn = inflows.reduce((s, e) => s + e.amount, 0);
  const totalOut = outflows.reduce((s, e) => s + e.amount, 0);
  const netCashflow = totalIn - totalOut;
  const burnRate = outflows.length > 0 ? Math.round(totalOut / Math.max(1, new Set(outflows.map(e => e.date)).size) * 30) : 0;
  const runway = burnRate > 0 && netCashflow > 0 ? Math.round(netCashflow / (burnRate / 30)) : 0;

  // Category breakdowns
  const inflowByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    inflows.forEach(e => { map[e.category || "Uncategorized"] = (map[e.category || "Uncategorized"] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [inflows]);

  const outflowByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    outflows.forEach(e => { map[e.category || "Uncategorized"] = (map[e.category || "Uncategorized"] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [outflows]);

  // Daily cashflow for mini chart
  const dailyFlow = useMemo(() => {
    const map: Record<string, { inflow: number; outflow: number }> = {};
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = { inflow: 0, outflow: 0 };
      map[e.date][e.type as "inflow" | "outflow"] += e.amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    entries.forEach(e => {
      const m = e.payment_method || "other";
      if (!map[m]) map[m] = { count: 0, amount: 0 };
      map[m].count++; map[m].amount += e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [entries]);

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return (!q || e.title.toLowerCase().includes(q) || (e.party_name?.toLowerCase().includes(q)) || (e.category?.toLowerCase().includes(q)))
      && (!typeFilter || e.type === typeFilter);
  });

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.name, c])), [categories]);

  return (
    <div className="max-w-7xl mx-auto">
      {addType && <AddEntryModal type={addType} categories={categories} onSave={e => { setEntries(p => [e, ...p]); setToast({ msg: `${e.type === "inflow" ? "Inflow" : "Outflow"} recorded`, type: "success" }); }} onClose={() => setAddType(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cashflow Master</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track every rupee in and out of your business</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAddType("inflow")} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200/40">
            <ArrowDown className="w-4 h-4" />Inflow
          </button>
          <button onClick={() => setAddType("outflow")} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 shadow-md shadow-red-200/40">
            <ArrowUp className="w-4 h-4" />Outflow
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
        <h2 className="text-base font-bold text-gray-900 min-w-[140px] text-center">{MONTHS[viewMonth]} {viewYear}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
        <button onClick={() => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); }} className="text-xs text-indigo-600 font-semibold hover:underline ml-2">Today</button>
        <div className="flex-1" />
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat icon={<ArrowDown className="w-5 h-5 text-emerald-500" />} label="Total Inflow" value={fmtINR(totalIn)} sub={`${inflows.length} transactions`} color="#22C55E" />
        <Stat icon={<ArrowUp className="w-5 h-5 text-red-500" />} label="Total Outflow" value={fmtINR(totalOut)} sub={`${outflows.length} transactions`} color="#EF4444" />
        <Stat icon={<TrendingUp className="w-5 h-5 text-white" />} label="Net Cashflow" value={fmtINR(netCashflow)} sub={netCashflow >= 0 ? "Positive" : "Negative"} trend={totalIn > 0 ? Math.round(((totalIn - totalOut) / totalIn) * 100) : 0} color="#6366F1" accent />
        <Stat icon={<Clock className="w-5 h-5" />} label="Monthly Burn" value={fmtINR(burnRate)} sub="Projected monthly spend" color="#F59E0B" />
        <Stat icon={<Calendar className="w-5 h-5" />} label="Runway" value={runway > 0 ? `${runway} days` : "—"} sub="At current burn rate" color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Daily mini chart */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" />Daily Cashflow</h3>
          {dailyFlow.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No transactions this month</p> : (
            <div className="flex items-end gap-1 h-40">
              {dailyFlow.map(([date, flow]) => {
                const maxVal = Math.max(...dailyFlow.map(([, f]) => Math.max(f.inflow, f.outflow)), 1);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: 140 }}>
                      <div className="bg-emerald-400 rounded-t" style={{ height: `${(flow.inflow / maxVal) * 100}%`, minHeight: flow.inflow > 0 ? 2 : 0 }} />
                      <div className="bg-red-400 rounded-b" style={{ height: `${(flow.outflow / maxVal) * 100}%`, minHeight: flow.outflow > 0 ? 2 : 0 }} />
                    </div>
                    <span className="text-[9px] text-gray-400">{new Date(date).getDate()}</span>
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-xl">
                      <p className="font-semibold">{fmtDate(date)}</p>
                      {flow.inflow > 0 && <p className="text-emerald-300">↓ {fmtINR(flow.inflow)}</p>}
                      {flow.outflow > 0 && <p className="text-red-300">↑ {fmtINR(flow.outflow)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-emerald-400 rounded" />Inflow</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-400 rounded" />Outflow</span>
          </div>
        </div>

        {/* P&L Summary */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-violet-500" />P&L Summary</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Revenue (Inflow)</span><span className="font-bold text-emerald-600">{fmtINR(totalIn)}</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalIn + totalOut > 0 ? (totalIn / (totalIn + totalOut)) * 100 : 50}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Expenses (Outflow)</span><span className="font-bold text-red-500">{fmtINR(totalOut)}</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${totalIn + totalOut > 0 ? (totalOut / (totalIn + totalOut)) * 100 : 50}%` }} /></div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm"><span className="font-semibold text-gray-700">Net Profit/Loss</span><span className={`font-bold text-lg ${netCashflow >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtINR(netCashflow)}</span></div>
              <p className="text-xs text-gray-400 mt-0.5">Margin: {totalIn > 0 ? Math.round((netCashflow / totalIn) * 100) : 0}%</p>
            </div>
            {/* Payment methods */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">By Payment Method</p>
              {paymentBreakdown.slice(0, 4).map(([method, data]) => (
                <div key={method} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-600 capitalize">{method.replace("_", " ")}</span>
                  <span className="text-xs font-semibold text-gray-800">{fmtINR(data.amount)} <span className="text-gray-400">({data.count})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Inflow categories */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Inflow by Category</h3>
          {inflowByCategory.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No inflows</p> : (
            <div className="space-y-3">
              {inflowByCategory.map(([cat, amount]) => {
                const c = catMap[cat];
                const pct = totalIn > 0 ? Math.round((amount / totalIn) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 flex items-center gap-1.5">{c?.icon} {cat}</span>
                      <span className="text-sm font-bold text-gray-900">{fmtINR(amount)} <span className="text-xs text-gray-400">{pct}%</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Outflow categories */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Outflow by Category</h3>
          {outflowByCategory.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No outflows</p> : (
            <div className="space-y-3">
              {outflowByCategory.map(([cat, amount]) => {
                const c = catMap[cat];
                const pct = totalOut > 0 ? Math.round((amount / totalOut) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 flex items-center gap-1.5">{c?.icon} {cat}</span>
                      <span className="text-sm font-bold text-gray-900">{fmtINR(amount)} <span className="text-xs text-gray-400">{pct}%</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filters + Transactions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex gap-1.5">
          {["", "inflow", "outflow"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all
                ${typeFilter === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
              {t === "" ? "All" : t === "inflow" ? "↓ Inflows" : "↑ Outflows"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
        : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{entries.length === 0 ? "No transactions this month" : "No matching transactions"}</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => setAddType("inflow")} className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1"><ArrowDown className="w-3.5 h-3.5" />Add Inflow</button>
              <button onClick={() => setAddType("outflow")} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1"><ArrowUp className="w-3.5 h-3.5" />Add Outflow</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["", "Transaction", "Category", "Party", "Payment", "Date", "Amount"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(e => {
                  const cat = catMap[e.category || ""];
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 w-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${e.type === "inflow" ? "bg-emerald-100" : "bg-red-100"}`}>
                          {e.type === "inflow" ? <ArrowDown className="w-4 h-4 text-emerald-600" /> : <ArrowUp className="w-4 h-4 text-red-500" />}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                        {e.reference_number && <p className="text-xs text-gray-400">Ref: {e.reference_number}</p>}
                        {e.is_recurring && <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 font-medium"><Repeat className="w-3 h-3" />Recurring</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {e.category ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border" style={cat?.color ? { background: cat.color + "12", color: cat.color, borderColor: cat.color + "30" } : { background: "#f3f4f6", color: "#6b7280" }}>
                            {cat?.icon} {e.category}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{e.party_name || "—"}</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium capitalize">{e.payment_method?.replace("_", " ") || "—"}</span></td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-bold font-mono ${e.type === "inflow" ? "text-emerald-600" : "text-red-500"}`}>
                          {e.type === "inflow" ? "+" : "-"}{fmtINR(e.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">{filtered.length} transactions · Net: <span className={netCashflow >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{fmtINR(netCashflow)}</span></p>
            </div>
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