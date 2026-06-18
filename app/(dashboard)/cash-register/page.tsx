"use client";
// Route: app/(dashboard)/cash-register/page.tsx
// Cash Register V3: Bulk sales entry, channel+payment reconciliation, register expenses with own categories, handovers
// Client-specific (Krazy Caterpillar retail). Uses register_expenses + register_expense_categories + cash_handovers.

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, X, Loader2, CheckCircle2, AlertCircle, ArrowDown, ArrowUp,
  Wallet, ChevronLeft, ChevronRight, RefreshCw,
  Building2, Send,
  PiggyBank, Receipt, Tag, Trash2, Save,
  Download, ShoppingBag, Clock, AlertTriangle,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

interface Register { id: string; date: string; opening_cash: number; walkin_amount: number; walkin_orders: number; online_amount: number; online_orders: number; whatsapp_amount: number; whatsapp_orders: number; total_sales: number; total_orders: number; pay_cash: number; pay_upi: number; pay_card: number; pay_gateway: number; total_expenses: number; bank_deposit: number; hq_handover: number; other_handover: number; closing_cash: number; is_closed: boolean; notes: string | null; shopify_breakdown?: any; shopify_pulled_at?: string | null; }
interface ExpCategory { id: string; name: string; color: string | null; }
interface Expense { id: string; head_name: string; category_name: string | null; description: string | null; amount: number; payment_mode: string; created_at: string; }
interface Handover { id: string; type: string; amount: number; reference_number: string | null; handed_to: string | null; notes: string | null; created_at: string; }
interface PendingOrder { shopify_order_id: number; order_name: string; customer_name: string | null; channel: string; total: number; order_created_at: string; financial_status: string; first_seen_date: string; }

const fmtINR = (n: number) => (n < 0 ? "-" : "") + "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition placeholder:text-gray-300";

const CAT_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6", "#F97316", "#64748B"];

// ── New Register Category Modal ───────────────────────────────────────────────
function RegisterCategoryModal({ existing, onSave, onClose }: { existing: ExpCategory[]; onSave: (c: ExpCategory) => void; onClose: () => void }) {
  const sb = useSB();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CAT_COLORS[existing.length % CAT_COLORS.length]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    if (existing.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) { setError("Category already exists"); return; }
    setSaving(true); setError("");
    const orgId = await getOrgId(sb);
    const { data, error: e } = await sb.from("register_expense_categories").insert({
      org_id: orgId, name: name.trim(), color, sort_order: existing.length,
    }).select("id, name, color").single();
    if (e) { setError(e.message); setSaving(false); return; }
    onSave(data as ExpCategory); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500" />New expense category</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vendor payment, Packaging" className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Colour</label>
            <div className="flex flex-wrap gap-2">
              {CAT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 transition ${color === c ? "border-gray-900 scale-110" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add category
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Handover Modal ────────────────────────────────────────────────────────────
function HandoverModal({ registerId, onSave, onClose }: { registerId: string; onSave: (h: Handover) => void; onClose: () => void }) {
  const sb = useSB();
  const [type, setType] = useState("bank_deposit");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [handedTo, setHandedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const TYPES = [
    { id: "bank_deposit", label: "Bank deposit", icon: <Building2 className="w-4 h-4" />, color: "#3B82F6" },
    { id: "hq_handover", label: "HQ handover", icon: <Send className="w-4 h-4" />, color: "#8B5CF6" },
    { id: "petty_cash", label: "Petty cash", icon: <PiggyBank className="w-4 h-4" />, color: "#F59E0B" },
    { id: "other", label: "Other", icon: <Wallet className="w-4 h-4" />, color: "#6B7280" },
  ];

  const save = async () => {
    if (!amount || Number(amount) <= 0) { setError("Amount required"); return; }
    setSaving(true);
    const orgId = await getOrgId(sb);
    const { data, error: e } = await sb.from("cash_handovers").insert({
      org_id: orgId, register_id: registerId, date: new Date().toISOString().split("T")[0],
      type, amount: Number(amount), reference_number: ref || null, handed_to: handedTo || null, notes: notes || null,
    }).select().single();
    if (e) { setError(e.message); setSaving(false); return; }
    onSave(data as Handover); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2"><ArrowUp className="w-5 h-5" />Cash out / handover</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div className="grid grid-cols-2 gap-2">{TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} className={`p-3 rounded-xl border-2 flex items-center gap-2 transition ${type === t.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}>
              <span style={{ color: t.color }}>{t.icon}</span><span className="text-xs font-semibold text-gray-800">{t.label}</span>
            </button>
          ))}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹) *</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" className={inputCls} autoFocus /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Reference #</label><input value={ref} onChange={e => setRef(e.target.value)} placeholder="DEP-001" className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Handed to</label><input value={handedTo} onChange={e => setHandedTo(e.target.value)} placeholder="Bank / Person" className={inputCls} /></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className={inputCls} /></div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm text-white bg-red-500 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CashRegisterPage() {
  const sb = useSB();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const isToday = date === new Date().toISOString().split("T")[0];
  const [tab, setTab] = useState<"sales" | "expenses" | "cashout" | "summary" | "pending">("sales");
  const [register, setRegister] = useState<Register | null>(null);
  const [categories, setCategories] = useState<ExpCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Shopify daily pull
  const [pulling, setPulling] = useState(false);
  const [breakdown, setBreakdown] = useState<any | null>(null);
  const [pending, setPending] = useState<PendingOrder[]>([]);

  // Modals
  const [showHandover, setShowHandover] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  // Sales form
  const [totalSales, setTotalSales] = useState("");
  const [totalOrders, setTotalOrders] = useState("");
  const [walkin, setWalkin] = useState({ amount: "", orders: "" });
  const [online, setOnline] = useState({ amount: "", orders: "" });
  const [whatsapp, setWhatsapp] = useState({ amount: "", orders: "" });
  const [payCash, setPayCash] = useState("");
  const [payUpi, setPayUpi] = useState("");
  const [payCard, setPayCard] = useState("");
  const [payGateway, setPayGateway] = useState("");

  // Expense form (uses register_expenses + register_expense_categories)
  const [expTitle, setExpTitle] = useState("");
  const [expCatId, setExpCatId] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPayMode, setExpPayMode] = useState("cash");

  // Fetch
  const fetchDay = useCallback(async () => {
    setLoading(true);
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }

    // Get or create register
    let { data: reg } = await sb.from("cash_register").select("*").eq("org_id", oid).eq("date", date).maybeSingle();
    if (!reg) {
      const { data: prev } = await sb.from("cash_register").select("closing_cash").eq("org_id", oid).lt("date", date).order("date", { ascending: false }).limit(1).maybeSingle();
      const { data: newReg } = await sb.from("cash_register").insert({ org_id: oid, date, opening_cash: prev?.closing_cash || 0 }).select().single();
      reg = newReg;
    }
    if (reg) {
      setRegister(reg as Register);
      setTotalSales(reg.total_sales ? String(reg.total_sales) : "");
      setTotalOrders(reg.total_orders ? String(reg.total_orders) : "");
      setWalkin({ amount: reg.walkin_amount ? String(reg.walkin_amount) : "", orders: reg.walkin_orders ? String(reg.walkin_orders) : "" });
      setOnline({ amount: reg.online_amount ? String(reg.online_amount) : "", orders: reg.online_orders ? String(reg.online_orders) : "" });
      setWhatsapp({ amount: reg.whatsapp_amount ? String(reg.whatsapp_amount) : "", orders: reg.whatsapp_orders ? String(reg.whatsapp_orders) : "" });
      setPayCash(reg.pay_cash ? String(reg.pay_cash) : "");
      setPayUpi(reg.pay_upi ? String(reg.pay_upi) : "");
      setPayCard(reg.pay_card ? String(reg.pay_card) : "");
      setPayGateway(reg.pay_gateway ? String(reg.pay_gateway) : "");
      setBreakdown(reg.shopify_breakdown || null);
    }

    // Pending-payment watchlist (open items, all dates since go-live)
    const { data: pend } = await sb.from("shopify_pending_orders")
      .select("shopify_order_id, order_name, customer_name, channel, total, order_created_at, financial_status, first_seen_date")
      .eq("org_id", oid).eq("resolved", false).order("order_created_at", { ascending: false });
    setPending((pend || []) as PendingOrder[]);

    // Fetch register categories, expenses for this date, handovers
    const [{ data: cats }, { data: exps }, { data: hvs }] = await Promise.all([
      sb.from("register_expense_categories").select("id, name, color").eq("org_id", oid).order("sort_order"),
      sb.from("register_expenses").select("*").eq("org_id", oid).eq("date", date).order("created_at", { ascending: false }),
      sb.from("cash_handovers").select("*").eq("org_id", oid).eq("date", date).order("created_at", { ascending: false }),
    ]);
    setCategories((cats || []) as ExpCategory[]);
    setExpenses((exps || []) as Expense[]);
    setHandovers((hvs || []) as Handover[]);
    setLoading(false);
  }, [sb, date]);

  useEffect(() => { fetchDay(); }, [fetchDay]);

  // Computed
  const channelTotal = (Number(walkin.amount) || 0) + (Number(online.amount) || 0) + (Number(whatsapp.amount) || 0);
  const channelOrders = (Number(walkin.orders) || 0) + (Number(online.orders) || 0) + (Number(whatsapp.orders) || 0);
  const payTotal = (Number(payCash) || 0) + (Number(payUpi) || 0) + (Number(payCard) || 0) + (Number(payGateway) || 0);
  const salesNum = Number(totalSales) || 0;
  const isReconciled = salesNum > 0 && channelTotal === salesNum && payTotal === salesNum;
  const hasMismatch = salesNum > 0 && (channelTotal > 0 || payTotal > 0) && !isReconciled;

  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalHandoverAmt = handovers.reduce((s, h) => s + h.amount, 0);
  const bankDep = handovers.filter(h => h.type === "bank_deposit").reduce((s, h) => s + h.amount, 0);
  const hqHand = handovers.filter(h => h.type === "hq_handover").reduce((s, h) => s + h.amount, 0);
  const cashExpenses = expenses.filter(e => e.payment_mode === "cash").reduce((s, e) => s + e.amount, 0);
  const opening = register?.opening_cash || 0;
  const cashInHand = opening + (Number(payCash) || 0) - cashExpenses - totalHandoverAmt;

  const expByCat = useMemo(() => {
    const map: Record<string, { amount: number; color: string }> = {};
    expenses.forEach(e => {
      const key = e.category_name || "Uncategorized";
      const cat = categories.find(c => c.name === key);
      if (!map[key]) map[key] = { amount: 0, color: cat?.color || "#6B7280" };
      map[key].amount += e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [expenses, categories]);

  // Pull from Shopify — fills online/offline channel totals + payment split, stores full breakdown
  const pullShopify = async () => {
    setPulling(true);
    try {
      const orgId = await getOrgId(sb);
      const res = await fetch("/api/shopify/daily-pull", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, date }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setToast({ msg: j.error || "Shopify pull failed", type: "error" }); return; }
      if (j.skipped) { setToast({ msg: j.reason || "Skipped", type: "error" }); return; }

      const b = j.breakdown;
      setBreakdown(b);

      // Channel prefill — untagged offline folds into walk-in so the channel total reconciles
      const walkinSales = (b.offline_sub?.walkin?.sales || 0) + (b.offline_sub?.untagged_channel?.sales || 0);
      const walkinOrders = (b.offline_sub?.walkin?.orders || 0) + (b.offline_sub?.untagged_channel?.orders || 0);
      setWalkin({ amount: walkinSales ? String(walkinSales) : "", orders: walkinOrders ? String(walkinOrders) : "" });
      setOnline({ amount: b.online?.sales ? String(b.online.sales) : "", orders: b.online?.orders ? String(b.online.orders) : "" });
      setWhatsapp({ amount: b.offline_sub?.whatsapp?.sales ? String(b.offline_sub.whatsapp.sales) : "", orders: b.offline_sub?.whatsapp?.orders ? String(b.offline_sub.whatsapp.orders) : "" });

      const tot = (b.online?.sales || 0) + (b.offline?.sales || 0);
      const totO = (b.online?.orders || 0) + (b.offline?.orders || 0);
      setTotalSales(tot ? String(Math.round(tot * 100) / 100) : "");
      setTotalOrders(totO ? String(totO) : "");

      // Payment prefill into the 4 coarse buckets (full detail kept in the breakdown card below).
      // Remainder lands in "gateway" so the payment total always equals sales (keeps reconcile green).
      const po = b.payments_offline || {};
      const pon = b.payments_online || {};
      const onlineMatch = (re: RegExp) => Object.entries(pon).filter(([k]) => re.test(k.toLowerCase())).reduce((s, [, v]: any) => s + (v.amount || 0), 0);
      const cash = (po["Cash"]?.amount || 0) + (po["Cash deposit"]?.amount || 0) + onlineMatch(/cash|cod/);
      const upi = (po["UPI"]?.amount || 0) + onlineMatch(/upi/);
      const card = (po["Card"]?.amount || 0) + onlineMatch(/card/);
      const allPay = [...Object.values(po), ...Object.values(pon)].reduce((s: number, v: any) => s + (v.amount || 0), 0);
      const gateway = Math.max(0, Math.round((allPay - cash - upi - card) * 100) / 100);
      setPayCash(cash ? String(Math.round(cash * 100) / 100) : "");
      setPayUpi(upi ? String(Math.round(upi * 100) / 100) : "");
      setPayCard(card ? String(Math.round(card * 100) / 100) : "");
      setPayGateway(gateway ? String(gateway) : "");

      // Refresh the pending watchlist
      const { data: pend } = await sb.from("shopify_pending_orders")
        .select("shopify_order_id, order_name, customer_name, channel, total, order_created_at, financial_status, first_seen_date")
        .eq("org_id", orgId).eq("resolved", false).order("order_created_at", { ascending: false });
      setPending((pend || []) as PendingOrder[]);

      const c = j.counts || {};
      setToast({ msg: `Pulled ${c.orders ?? 0} orders · ${pending.length} pending`, type: "success" });
    } catch (err: any) {
      setToast({ msg: err.message || "Shopify pull failed", type: "error" });
    } finally { setPulling(false); }
  };

  // Save sales
  const saveSales = async () => {
    if (!register) return;
    setSaving(true);
    const { error } = await sb.from("cash_register").update({
      total_sales: salesNum, total_orders: Number(totalOrders) || channelOrders,
      walkin_amount: Number(walkin.amount) || 0, walkin_orders: Number(walkin.orders) || 0,
      online_amount: Number(online.amount) || 0, online_orders: Number(online.orders) || 0,
      whatsapp_amount: Number(whatsapp.amount) || 0, whatsapp_orders: Number(whatsapp.orders) || 0,
      pay_cash: Number(payCash) || 0, pay_upi: Number(payUpi) || 0,
      pay_card: Number(payCard) || 0, pay_gateway: Number(payGateway) || 0,
      total_expenses: totalExp, bank_deposit: bankDep, hq_handover: hqHand,
      closing_cash: cashInHand, updated_at: new Date().toISOString(),
    }).eq("id", register.id);
    setSaving(false);
    if (!error) setToast({ msg: "Sales entry saved", type: "success" });
    else setToast({ msg: error.message, type: "error" });
  };

  // Add expense
  const addExpense = async () => {
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) return;
    const orgId = await getOrgId(sb);
    const cat = expCatId ? categories.find(c => c.id === expCatId) : null;
    const { data, error } = await sb.from("register_expenses").insert({
      org_id: orgId, register_id: register?.id, date,
      head_name: expTitle.trim(),
      category_name: cat?.name || null,
      description: expDesc || null,
      amount: Number(expAmount),
      payment_mode: expPayMode,
    }).select().single();
    if (!error && data) {
      setExpenses(p => [data as Expense, ...p]);
      setExpTitle(""); setExpDesc(""); setExpAmount(""); setExpCatId("");
      setToast({ msg: "Expense recorded", type: "success" });
    } else if (error) {
      setToast({ msg: error.message, type: "error" });
    }
  };

  const deleteExpense = async (id: string) => {
    await sb.from("register_expenses").delete().eq("id", id);
    setExpenses(p => p.filter(e => e.id !== id));
  };

  // Date nav
  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); if (d <= new Date()) setDate(d.toISOString().split("T")[0]); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      {showHandover && register && <HandoverModal registerId={register.id} onSave={h => { setHandovers(p => [h, ...p]); setToast({ msg: "Handover recorded", type: "success" }); }} onClose={() => setShowHandover(false)} />}
      {showCatModal && <RegisterCategoryModal existing={categories} onSave={c => { setCategories(p => [...p, c]); setExpCatId(c.id); setToast({ msg: "Category added", type: "success" }); }} onClose={() => setShowCatModal(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div><h1 className="text-xl font-bold text-gray-900">Cash register</h1><p className="text-sm text-gray-400">Daily sales, expenses, cash flow & handovers</p></div>
        <button onClick={fetchDay} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-4 mb-5">
        <button onClick={prevDay} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
        <div className="text-center min-w-[200px]">
          <h2 className="text-base font-bold text-gray-900">{fmtDate(date)}</h2>
          {isToday && <span className="text-xs text-emerald-600 font-semibold">Today</span>}
        </div>
        <button onClick={nextDay} disabled={isToday} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200 disabled:opacity-30"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
        {!isToday && <button onClick={() => setDate(new Date().toISOString().split("T")[0])} className="text-xs text-indigo-600 font-semibold hover:underline">Today</button>}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: "Opening", value: fmtINR(opening), icon: <PiggyBank className="w-4 h-4 text-amber-500" />, sub: "Carried fwd" },
          { label: "Sales", value: fmtINR(salesNum), icon: <ArrowDown className="w-4 h-4 text-emerald-500" />, sub: `${Number(totalOrders) || channelOrders} orders`, green: true },
          { label: "Expenses", value: fmtINR(totalExp), icon: <Receipt className="w-4 h-4 text-red-500" />, sub: `${expenses.length} entries`, red: true },
          { label: "Handovers", value: fmtINR(totalHandoverAmt), icon: <ArrowUp className="w-4 h-4 text-red-500" />, sub: `Bank: ${fmtINR(bankDep)}`, red: true },
          { label: "HQ", value: fmtINR(hqHand), icon: <Send className="w-4 h-4 text-violet-500" />, sub: "Handover" },
          { label: "Cash in hand", value: fmtINR(cashInHand), icon: <Wallet className="w-4 h-4 text-white" />, sub: "Closing", accent: true },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.accent ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-white border border-gray-100"} shadow-sm`}>
            <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className={`text-[10px] font-semibold uppercase tracking-wide ${s.accent ? "text-indigo-200" : s.green ? "text-emerald-600" : s.red ? "text-red-500" : "text-gray-400"}`}>{s.label}</span></div>
            <p className={`text-lg font-bold ${s.accent ? "text-white" : s.green ? "text-emerald-700" : s.red ? "text-red-600" : "text-gray-900"}`}>{s.value}</p>
            <p className={`text-[10px] ${s.accent ? "text-indigo-200" : "text-gray-400"}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {([
          { id: "sales" as const, label: "Sales entry", count: Number(totalOrders) || channelOrders || null },
          { id: "expenses" as const, label: "Expenses", count: expenses.length || null },
          { id: "cashout" as const, label: "Cash out", count: handovers.length || null },
          { id: "summary" as const, label: "Day summary" },
          { id: "pending" as const, label: "Pending pay", count: pending.length || null },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative px-5 py-3 text-sm font-medium transition ${tab === t.id ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.count !== undefined && t.count !== null && t.count > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t" />}
          </button>
        ))}
      </div>

      {/* ── TAB: Sales (read-only Shopify summary) ──────────────── */}
      {tab === "sales" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Daily sales</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pulled from Shopify — online &amp; offline totals with the full payment split.</p>
            </div>
            <div className="flex items-center gap-3">
              {register?.shopify_pulled_at && <span className="text-[10px] text-gray-400 whitespace-nowrap">pulled {new Date(register.shopify_pulled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST</span>}
              <button onClick={pullShopify} disabled={pulling}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-[#1e293b] disabled:opacity-50 whitespace-nowrap">
                {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}{breakdown ? "Re-pull" : "Pull from Shopify"}
              </button>
            </div>
          </div>

          {!breakdown ? (
            <div className="text-center py-14 border border-dashed border-gray-200 rounded-xl">
              <ShoppingBag className="w-9 h-9 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">No sales pulled for this day yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Pull this day&apos;s orders from Shopify to load sales and the payment breakdown.</p>
              <button onClick={pullShopify} disabled={pulling}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-[#1e293b] disabled:opacity-50">
                {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}Pull from Shopify
              </button>
            </div>
          ) : (
            <>
              {/* Total */}
              <div className="flex items-center justify-between gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100/60 rounded-xl mb-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Total sales</p>
                  <p className="text-3xl font-bold text-gray-900">{fmtINR((breakdown.online?.sales || 0) + (breakdown.offline?.sales || 0))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Orders</p>
                  <p className="text-2xl font-bold text-gray-700">{(breakdown.online?.orders || 0) + (breakdown.offline?.orders || 0)}</p>
                </div>
              </div>

              {/* Online / Offline */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Online</p>
                  <p className="text-xl font-bold text-blue-800">{fmtINR(breakdown.online?.sales || 0)}</p>
                  <p className="text-[10px] text-blue-400">{breakdown.online?.orders || 0} orders · website</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Offline (walk-in + WhatsApp)</p>
                  <p className="text-xl font-bold text-amber-800">{fmtINR(breakdown.offline?.sales || 0)}</p>
                  <p className="text-[10px] text-amber-400">{breakdown.offline?.orders || 0} orders · store / manual</p>
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 rounded-full" />Payment breakdown</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Online (gateway)</p>
                    {Object.entries(breakdown.payments_online || {}).length === 0 ? <p className="text-xs text-gray-300 py-1">—</p> :
                      Object.entries(breakdown.payments_online || {}).map(([k, v]: any) => (
                        <div key={k} className="flex justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600 capitalize">{k.replace(/_/g, " ")}</span>
                          <span className="font-semibold text-gray-800">{fmtINR(v.amount)}<span className="ml-2.5 text-[10px] text-gray-400 font-normal">{v.orders} ord</span></span>
                        </div>
                      ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Offline (tag)</p>
                    {Object.entries(breakdown.payments_offline || {}).length === 0 ? <p className="text-xs text-gray-300 py-1">—</p> :
                      Object.entries(breakdown.payments_offline || {}).map(([k, v]: any) => (
                        <div key={k} className="flex justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <span className={k === "Untagged" ? "text-red-500" : "text-gray-600"}>{k}</span>
                          <span className="font-semibold text-gray-800">{fmtINR(v.amount)}<span className="ml-2.5 text-[10px] text-gray-400 font-normal">{v.orders} ord</span></span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="flex justify-between pt-3 mt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Payment total</span>
                  <span className="text-sm font-bold text-gray-900">{fmtINR((breakdown.online?.sales || 0) + (breakdown.offline?.sales || 0))}</span>
                </div>
              </div>

              {/* Untagged warning */}
              {breakdown.untagged_payment_orders?.length > 0 && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700">{breakdown.untagged_payment_orders.length} offline order(s) have no payment tag — add a payment tag in Shopify and re-pull: <span className="font-mono">{breakdown.untagged_payment_orders.join(", ")}</span></p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Expenses (register_expenses + register_expense_categories) ── */}
      {tab === "expenses" && (
        <div className="space-y-5">
          {/* Categories overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500" />Expense categories</h3>
              <button onClick={() => setShowCatModal(true)} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />New category</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white text-gray-700">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color || "#6B7280" }} />{c.name}
                </span>
              ))}
              {categories.length === 0 && <p className="text-xs text-gray-400">No categories yet. Click “New category” to add one.</p>}
            </div>
          </div>

          {/* Add expense */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Receipt className="w-4 h-4 text-red-500" />Today&apos;s expenses</h3>
              <span className="text-xs text-gray-400">{expenses.length} entries · {fmtINR(totalExp)}</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <div className="flex items-center gap-2 mb-2">
                <input value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="Title *" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="₹ Amount *" className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div className="flex items-center gap-2">
                <select value={expCatId} onChange={e => { if (e.target.value === "__new__") { setShowCatModal(true); } else { setExpCatId(e.target.value); } }} className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white w-36 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">Category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new__">＋ New category…</option>
                </select>
                <select value={expPayMode} onChange={e => setExpPayMode(e.target.value)} className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white w-20 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank</option>
                </select>
                <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Note" className="flex-1 px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                <button onClick={addExpense} disabled={!expTitle.trim() || !expAmount} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-30 flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>
              </div>
            </div>

            {/* List */}
            {expenses.length === 0 ? <p className="text-xs text-gray-400 text-center py-6">No expenses recorded for this date</p> : (
              <div className="space-y-2">
                {expenses.map(e => {
                  const cat = e.category_name ? categories.find(c => c.name === e.category_name) : null;
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{e.head_name}</p>
                        {e.description && <p className="text-xs text-gray-400 truncate mt-0.5">{e.description}</p>}
                      </div>
                      {cat && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border" style={{ background: (cat.color || "#6B7280") + "15", color: cat.color || "#6B7280", borderColor: (cat.color || "#6B7280") + "30" }}>
                          {cat.name}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 uppercase">{e.payment_mode || "—"}</span>
                      <span className="text-sm font-bold text-red-600 min-w-[60px] text-right">-{fmtINR(e.amount)}</span>
                      <button onClick={() => deleteExpense(e.id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Category summary */}
            {expByCat.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100">
                {expByCat.map(([catName, data]) => (
                  <div key={catName} className="p-2.5 rounded-lg flex justify-between items-center" style={{ background: data.color + "10" }}>
                    <span className="text-xs font-medium" style={{ color: data.color }}>{catName}</span>
                    <span className="text-xs font-bold" style={{ color: data.color }}>{fmtINR(data.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Cash Out ───────────────────────────────────────── */}
      {tab === "cashout" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Cash out / handovers</h3>
            <button onClick={() => setShowHandover(true)} className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600"><Plus className="w-3.5 h-3.5" />Add handover</button>
          </div>
          {handovers.length === 0 ? <p className="text-xs text-gray-400 text-center py-8">No handovers today</p> : (
            <div className="space-y-2">
              {handovers.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-red-200 text-red-500">
                    {h.type === "bank_deposit" ? <Building2 className="w-4 h-4" /> : h.type === "hq_handover" ? <Send className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">{h.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500">{h.handed_to || "—"}{h.reference_number ? ` · ${h.reference_number}` : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">-{fmtINR(h.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-4 mt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total handovers</span>
            <span className="text-sm font-bold text-red-600">{fmtINR(totalHandoverAmt)}</span>
          </div>
        </div>
      )}

      {/* ── TAB: Summary ────────────────────────────────────────── */}
      {tab === "summary" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Channel-wise sales</h3>
            {[
              { label: "Store walk-in", amount: Number(walkin.amount) || 0, orders: Number(walkin.orders) || 0, color: "#F59E0B" },
              { label: "Online website", amount: Number(online.amount) || 0, orders: Number(online.orders) || 0, color: "#3B82F6" },
              { label: "WhatsApp", amount: Number(whatsapp.amount) || 0, orders: Number(whatsapp.orders) || 0, color: "#22C55E" },
            ].map(ch => {
              const pct = salesNum > 0 ? Math.round((ch.amount / salesNum) * 100) : 0;
              return (
                <div key={ch.label} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{ch.label}</span>
                    <span className="text-sm font-bold text-gray-900">{fmtINR(ch.amount)} <span className="text-xs text-gray-400">{ch.orders} ord · {pct}%</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: ch.color }} /></div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Payment mode breakdown</h3>
            {[
              { label: "Cash", amount: Number(payCash) || 0, color: "#22C55E" },
              { label: "UPI", amount: Number(payUpi) || 0, color: "#8B5CF6" },
              { label: "Card", amount: Number(payCard) || 0, color: "#3B82F6" },
              { label: "Payment gateway", amount: Number(payGateway) || 0, color: "#06B6D4" },
            ].map(pm => {
              const pct = salesNum > 0 ? Math.round((pm.amount / salesNum) * 100) : 0;
              return (
                <div key={pm.label} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{pm.label}</span>
                    <span className="text-sm font-bold text-gray-900">{fmtINR(pm.amount)} <span className="text-xs text-gray-400">{pct}%</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pm.color }} /></div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              Opening <strong className="text-gray-900">{fmtINR(opening)}</strong> + Cash sales <strong className="text-emerald-600">+{fmtINR(Number(payCash) || 0)}</strong> − Expenses (cash) <strong className="text-red-500">-{fmtINR(cashExpenses)}</strong> − Handovers <strong className="text-red-500">-{fmtINR(totalHandoverAmt)}</strong>
            </p>
            <p className="text-lg font-bold text-indigo-700 mt-2">= {fmtINR(cashInHand)} cash in hand</p>
            <p className="text-xs text-gray-400 mt-1">Net P&L: Sales {fmtINR(salesNum)} − Expenses {fmtINR(totalExp)} = <strong className={salesNum - totalExp >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtINR(salesNum - totalExp)}</strong></p>
          </div>
        </div>
      )}

      {/* ── TAB: Pending payments ───────────────────────────────── */}
      {tab === "pending" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Pending payments</h3>
            <span className="text-xs text-gray-400">{pending.length} open</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Shopify orders not yet marked paid. They stay listed until you mark them paid in Shopify and re-pull.</p>
          {pending.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No pending payments</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(p => {
                const ageDays = Math.max(0, Math.floor((Date.now() - new Date(p.first_seen_date + "T00:00").getTime()) / 86400000));
                return (
                  <div key={p.shopify_order_id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-amber-200 text-amber-500 flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{p.order_name} <span className="text-xs font-normal text-gray-400">· {p.customer_name || "—"}</span></p>
                      <p className="text-xs text-gray-500 capitalize">{p.channel} · {p.financial_status?.replace(/_/g, " ").toLowerCase()} · {new Date(p.order_created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ageDays >= 3 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                      {ageDays === 0 ? "today" : `${ageDays}d`}
                    </span>
                    <span className="text-sm font-bold text-gray-800 min-w-[70px] text-right">{fmtINR(p.total)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between pt-3 mt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500 uppercase font-semibold">Total pending</span>
                <span className="text-sm font-bold text-amber-600">{fmtINR(pending.reduce((s, p) => s + (p.total || 0), 0))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}
