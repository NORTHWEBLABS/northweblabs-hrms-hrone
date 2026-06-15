"use client";
// Route: app/(dashboard)/expenses/page.tsx
// Reimbursement — unified through the approval pipeline.
// Submit (self-claim or admin-logged) -> approval_request -> approve in /approvals -> mark paid here.

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, Search, X, Loader2, CheckCircle2, AlertCircle,
  TrendingUp, TrendingDown, IndianRupee, Calendar,
  Receipt, Clock, Wallet, BadgeCheck, PieChart,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

interface Expense { id: string; title: string; amount: number; date: string; category_id: string; description: string | null; status: string; payment_method: string | null; vendor: string | null; receipt_url: string | null; employee_id: string | null; created_at: string; paid_at?: string | null; paid_method?: string | null; paid_reference?: string | null; }
interface Category { id: string; name: string; icon: string | null; color: string | null; budget_limit: number | null; }
interface SessionUser { id: string; email: string; full_name: string | null; org_id: string | null; }

const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer"];
const PAID_METHODS = ["cash", "bank_transfer", "upi", "other"];
const STATUS_COLORS: Record<string, string> = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-600", reimbursed: "bg-blue-100 text-blue-700" };

function Chip({ label, color, size = "sm", onClick, selected }: { label: string; color?: string; size?: "sm" | "md"; onClick?: () => void; selected?: boolean }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-all border
        ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3.5 py-1.5 text-sm"}
        ${selected ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200" : color ? "" : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-200"}`}
      style={!selected && color ? { background: color + "18", color, borderColor: color + "40" } : undefined}>
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, sub, trend, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "15", color }}>{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Add Expense Modal — captures employee_id (self-claim) + creates approval request ──
function AddExpenseModal({ categories, user, onSaved, onClose }: { categories: Category[]; user: SessionUser | null; onSaved: (msg: string) => void; onClose: () => void }) {
  const sb = useSB();
  const [form, setForm] = useState({ title: "", amount: "", category_id: "", date: new Date().toISOString().split("T")[0], description: "", payment_method: "upi", vendor: "" });
  const [forSelf, setForSelf] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Amount required"); return; }
    setSaving(true); setError("");

    const orgId = user?.org_id || localStorage.getItem("activeOrgId") || "";
    if (!orgId) { setError("No organization found"); setSaving(false); return; }

    // Resolve claimant employee (self-claim) via the logged-in user's email
    let employeeId: string | null = null;
    let claimantName = user?.full_name || user?.email || "";
    if (forSelf && user?.email) {
      const { data: emp } = await sb.from("employees").select("id, full_name, reporting_manager_id").eq("email", user.email).eq("org_id", orgId).maybeSingle();
      if (emp) { employeeId = emp.id; claimantName = emp.full_name || claimantName; }
    }

    // 1. Insert the expense (pending)
    const { data: exp, error: e } = await sb.from("expenses").insert({
      org_id: orgId, title: form.title.trim(), amount: Number(form.amount),
      category_id: form.category_id || null, date: form.date,
      description: form.description || null, payment_method: form.payment_method || null,
      vendor: form.vendor || null, status: "pending",
      employee_id: employeeId,
    }).select().single();
    if (e) { setError(e.message); setSaving(false); return; }

    // 2. Resolve approver: reporting manager if claimant is an employee, else owner/admin
    let approverUserId = "", approverName = "";
    if (employeeId) {
      const { data: emp } = await sb.from("employees").select("reporting_manager_id").eq("id", employeeId).maybeSingle();
      if (emp?.reporting_manager_id) {
        const { data: mgr } = await sb.from("employees").select("full_name, email").eq("id", emp.reporting_manager_id).maybeSingle();
        if (mgr?.email) {
          const { data: mgrUser } = await sb.from("users").select("id").eq("email", mgr.email).eq("org_id", orgId).maybeSingle();
          if (mgrUser) { approverUserId = mgrUser.id; approverName = mgr.full_name || ""; }
        }
      }
    }
    if (!approverUserId) {
      const { data: admins } = await sb.from("users").select("id, full_name").eq("org_id", orgId).in("role", ["owner", "admin", "hr"]).limit(1);
      if (admins?.length) { approverUserId = admins[0].id; approverName = admins[0].full_name || "Admin"; }
    }

    // 3. Create approval_request (payload carries expense_id so act/route flips it on approve)
    if (approverUserId && exp) {
      const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { data: req } = await sb.from("approval_requests").insert({
        org_id: orgId, type: "expense",
        title: `Reimbursement — ${form.title.trim()} (${fmtINR(Number(form.amount))})`,
        description: form.description || null,
        raised_by: user?.id || null, raised_by_name: claimantName,
        assigned_to: approverUserId, assigned_to_name: approverName,
        status: "pending", escalation_level: 0, tat_hours: 48, deadline_at: deadline,
        payload: { expense_id: exp.id, amount: Number(form.amount), employee_id: employeeId },
      }).select().maybeSingle();

      if (req) {
        await sb.from("notifications").insert({
          org_id: orgId, user_id: approverUserId, title: "Reimbursement request",
          body: `${claimantName} submitted a reimbursement: ${form.title.trim()} (${fmtINR(Number(form.amount))})`,
          type: "approval", reference_type: "approval_request", reference_id: req.id, link: "/approvals",
        });
        await sb.from("approval_history").insert({
          request_id: req.id, action: "submitted", acted_by: user?.id || null,
          acted_by_name: claimantName, notes: "Reimbursement submitted", from_status: null, to_status: "pending",
        });
        try { await fetch("/api/approvals/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: req.id, event: "applied" }) }); } catch {}
      }
    }

    setSaving(false);
    onSaved(approverUserId ? "Reimbursement submitted for approval" : "Expense saved (no approver found — add one in /approvals)");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><Receipt className="w-4 h-4 text-indigo-600" /></div>
            <h2 className="text-base font-bold text-gray-900">New reimbursement</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
            <button onClick={() => setForSelf(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${forSelf ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>My claim</button>
            <button onClick={() => setForSelf(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${!forSelf ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>Org expense (admin)</button>
          </div>
          <p className="text-xs text-gray-400 -mt-2">{forSelf ? "Routed to your reporting manager for approval." : "Logged as an org expense — routed to owner/admin."}</p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Cab to client office"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-gray-400">₹</span>
                <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="500"
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <Chip key={c.id} label={`${c.icon || ""} ${c.name}`} color={c.color || "#6B7280"} selected={form.category_id === c.id} onClick={() => set("category_id", form.category_id === c.id ? "" : c.id)} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Spent via</label>
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vendor</label>
              <input value={form.vendor} onChange={e => set("vendor", e.target.value)} placeholder="Optional"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Add details…" rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 sticky bottom-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mark Paid Modal ──────────────────────────────────────────────────────────
function MarkPaidModal({ expense, user, onDone, onClose }: { expense: Expense; user: SessionUser | null; onDone: (msg: string) => void; onClose: () => void }) {
  const sb = useSB();
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    const { error } = await sb.from("expenses").update({
      status: "reimbursed",
      paid_at: new Date(`${date}T12:00:00`).toISOString(),
      paid_by: user?.id || null,
      paid_method: method,
      paid_reference: reference.trim() || null,
    }).eq("id", expense.id);
    if (error) { setError(error.message); setSaving(false); return; }
    onDone("Marked as reimbursed");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-bold text-gray-900">Mark as paid</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-600">{expense.title}</span>
            <span className="text-sm font-bold text-gray-900 font-mono">{fmtINR(expense.amount)}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Paid via</label>
            <div className="grid grid-cols-2 gap-2">
              {PAID_METHODS.map(m => (
                <button key={m} onClick={() => setMethod(m)} className={`px-3 py-2 rounded-xl border text-xs font-medium capitalize ${method === m ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-100" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
              <input type="date" value={date} max={new Date().toISOString().split("T")[0]} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Txn / cheque #"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}Confirm paid
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const sb = useSB();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [markPaid, setMarkPaid] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [orgId, setOrgId] = useState("");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  const fetchAll = useCallback(async () => {
    let oid = orgId || (typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "");
    let u: SessionUser | null = null;
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    if (email) {
      const { data } = await sb.from("users").select("id, email, full_name, org_id").eq("email", email).maybeSingle();
      if (data) { u = data as SessionUser; if (!oid && data.org_id) oid = data.org_id; }
    }
    setUser(u);
    if (!oid) { setLoading(false); return; }
    setOrgId(oid);
    const [{ data: exps }, { data: cats }] = await Promise.all([
      sb.from("expenses").select("*").eq("org_id", oid).order("date", { ascending: false }),
      sb.from("expense_categories").select("*").eq("org_id", oid).order("name"),
    ]);
    setExpenses((exps || []) as Expense[]);
    setCategories((cats || []) as Category[]);
    setLoading(false);
  }, [sb, orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    return (!q || e.title.toLowerCase().includes(q) || (e.vendor?.toLowerCase().includes(q)))
      && (!statusFilter || e.status === statusFilter)
      && (!catFilter || e.category_id === catFilter);
  });

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter(e => { const d = new Date(e.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
  const monthSpent = thisMonth.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter(e => e.status === "pending");
  const approvedUnpaid = expenses.filter(e => e.status === "approved");
  const reimbursed = expenses.filter(e => e.status === "reimbursed");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showAdd && <AddExpenseModal categories={categories} user={user} onSaved={(msg) => { setToast({ msg, type: "success" }); fetchAll(); }} onClose={() => setShowAdd(false)} />}
      {markPaid && <MarkPaidModal expense={markPaid} user={user} onDone={(msg) => { setToast({ msg, type: "success" }); fetchAll(); }} onClose={() => setMarkPaid(null)} />}

      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-900">Reimbursement</h1><p className="text-sm text-gray-400 mt-0.5">Submit, approve and settle reimbursements</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200/40 transition"><Plus className="w-4 h-4" />New reimbursement</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pending approval" value={pending.length.toString()} sub={fmtINR(pending.reduce((s, e) => s + e.amount, 0))} color="#F59E0B" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Approved, unpaid" value={approvedUnpaid.length.toString()} sub={fmtINR(approvedUnpaid.reduce((s, e) => s + e.amount, 0))} color="#22C55E" />
        <StatCard icon={<Wallet className="w-5 h-5" />} label="Reimbursed" value={reimbursed.length.toString()} sub={fmtINR(reimbursed.reduce((s, e) => s + e.amount, 0))} color="#3B82F6" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="This month" value={fmtINR(monthSpent)} sub={`${thisMonth.length} expenses`} color="#6366F1" />
      </div>

      {categories.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-indigo-500" />By category</h3>
          <div className="flex flex-wrap gap-3">
            {categories.map(c => {
              const catTotal = expenses.filter(e => e.category_id === c.id).reduce((s, e) => s + e.amount, 0);
              const count = expenses.filter(e => e.category_id === c.id).length;
              return (
                <button key={c.id} onClick={() => setCatFilter(catFilter === c.id ? "" : c.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all ${catFilter === c.id ? "ring-2 ring-indigo-400 border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm"}`}>
                  <span className="text-lg">{c.icon}</span>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{count} · {fmtINR(catTotal)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reimbursements…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex gap-2">
          {["", "pending", "approved", "rejected", "reimbursed"].map(s => (
            <Chip key={s} label={s || "All"} selected={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
        {(search || catFilter) && <button onClick={() => { setSearch(""); setCatFilter(""); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-lg"><X className="w-3 h-3" />Clear</button>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">{expenses.length === 0 ? "No reimbursements yet" : "No matching reimbursements"}</p>
            {expenses.length === 0 && <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 inline-flex items-center gap-1"><Plus className="w-4 h-4" />Add first reimbursement</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["Reimbursement", "Category", "Date", "Amount", "Status", "Settlement", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(exp => {
                  const cat = catMap[exp.category_id];
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{exp.title}</p>
                        {exp.vendor && <p className="text-xs text-gray-400">{exp.vendor}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {cat ? <Chip label={`${cat.icon || ""} ${cat.name}`} color={cat.color || "#6B7280"} /> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(exp.date)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900 font-mono">{fmtINR(exp.amount)}</td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[exp.status] || "bg-gray-100 text-gray-600"}`}>{exp.status}</span></td>
                      <td className="px-5 py-3.5">
                        {exp.status === "reimbursed" ? (
                          <div className="text-xs text-gray-500">
                            <span className="capitalize">{(exp.paid_method || "").replace("_", " ")}</span>
                            {exp.paid_at && <span> · {fmtDate(exp.paid_at)}</span>}
                            {exp.paid_reference && <span className="block text-gray-400">{exp.paid_reference}</span>}
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {exp.status === "approved" && (
                          <button onClick={() => setMarkPaid(exp)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100">
                            <BadgeCheck className="w-3.5 h-3.5" />Mark paid
                          </button>
                        )}
                        {exp.status === "pending" && <span className="text-xs text-amber-500">Awaiting approval</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">{filtered.length} reimbursements · Total: {fmtINR(filtered.reduce((s, e) => s + e.amount, 0))}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />Approvals happen in the Approvals module. Once approved, settle them here with “Mark paid”.</p>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}