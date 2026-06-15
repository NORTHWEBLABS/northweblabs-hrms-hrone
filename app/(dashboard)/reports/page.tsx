"use client";
// Route: app/(dashboard)/reports/page.tsx
// Reports & Analytics — Recharts (shadcn/ui style), multi-module, date ranges
// npm install recharts

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  BarChart3, PieChart, TrendingUp,
  Loader2, RefreshCw, Users, IndianRupee, ShoppingCart,
  Receipt, Clock, FileText, ArrowUpRight, ArrowDownRight,
  Layers, Download, Wallet,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, PieChart as RePieChart, Pie, Cell, Legend,
} from "recharts";
import { headLabel, type Head } from "@/components/HeadSelect";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

const fmtINR = (n: number) => "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");
const fmtD = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const COLORS = ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#14B8A6"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type DateRange = "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "last_month" | "last_quarter" | "custom";
type Module = "overview" | "sales" | "expenses" | "reimbursements" | "employees" | "invoices" | "cashflow";

const REIMB_STATUS: Record<string, string> = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-600", reimbursed: "bg-blue-100 text-blue-700" };

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const fmt = (dt: Date) => dt.toISOString().split("T")[0];
  switch (range) {
    case "today": return { from: fmt(now), to: fmt(now) };
    case "this_week": { const mon = new Date(now); mon.setDate(d - (now.getDay() || 7) + 1); return { from: fmt(mon), to: fmt(now) }; }
    case "this_month": return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: fmt(now) };
    case "last_month": { const lm = new Date(y, m - 1, 1); return { from: fmt(lm), to: fmt(new Date(y, m, 0)) }; }
    case "this_quarter": { const qStart = new Date(y, Math.floor(m / 3) * 3, 1); return { from: fmt(qStart), to: fmt(now) }; }
    case "last_quarter": { const lqS = new Date(y, Math.floor(m / 3) * 3 - 3, 1); const lqE = new Date(y, Math.floor(m / 3) * 3, 0); return { from: fmt(lqS), to: fmt(lqE) }; }
    case "this_year": return { from: `${y}-01-01`, to: fmt(now) };
    default: return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: fmt(now) };
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-gray-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.value > 100 ? fmtINR(p.value) : p.value}</p>)}
    </div>
  );
};

function StatCard({ label, value, sub, icon, trend }: { label: string; value: string; sub?: string; icon: React.ReactNode; trend?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">{icon}{trend !== undefined && <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>{trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(trend)}%</span>}</div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-sm ${className}`}><h3 className="text-sm font-bold text-gray-900 mb-4">{title}</h3>{children}</div>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const sb = useSB();
  const [module, setModule] = useState<Module>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<any[]>([]);
  const [yesterdayOrders, setYesterdayOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [cashflow, setCashflow] = useState<any[]>([]);
  const [expCategories, setExpCategories] = useState<any[]>([]);
  // Reimbursement audit lookups
  const [heads, setHeads] = useState<Head[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, string>>({});   // employee_id -> name
  const [userMap, setUserMap] = useState<Record<string, string>>({}); // user_id -> name
  const [reimbStatus, setReimbStatus] = useState("");

  const { from, to } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    const yesterday = new Date(new Date(from).getTime() - 86400000).toISOString().split("T")[0];
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = await Promise.all([
      sb.from("store_orders").select("*").eq("org_id", oid).gte("created_at", from + "T00:00").lte("created_at", to + "T23:59").order("created_at"),
      sb.from("expenses").select("*").eq("org_id", oid).gte("date", from).lte("date", to),
      sb.from("employees").select("id, full_name, email, department, designation, status, date_of_joining, gender, gross_salary").eq("org_id", oid),
      sb.from("invoices").select("*").eq("org_id", oid).gte("invoice_date", from).lte("invoice_date", to),
      sb.from("cashflow_entries").select("*").eq("org_id", oid).gte("date", from).lte("date", to),
      sb.from("attendance").select("*").eq("org_id", oid).gte("date", from).lte("date", to),
      sb.from("expense_categories").select("*").eq("org_id", oid),
      sb.from("store_orders").select("total, created_at, payment_status").eq("org_id", oid).gte("created_at", yesterday + "T00:00").lte("created_at", yesterday + "T23:59"),
      sb.from("expense_heads").select("id, name, parent_id").eq("org_id", oid),
      sb.from("users").select("id, full_name, email").eq("org_id", oid),
    ]);
    setOrders(r1.data || []); setYesterdayOrders(r8.data || []); setExpenses(r2.data || []);
    setEmployees(r3.data || []); setInvoices(r4.data || []); setCashflow(r5.data || []);
    setExpCategories(r7.data || []); setHeads((r9.data || []) as Head[]);

    // Build name maps for audit trail resolution
    const em: Record<string, string> = {};
    (r3.data || []).forEach((e: any) => { em[e.id] = e.full_name || e.email || "—"; });
    setEmpMap(em);
    const um: Record<string, string> = {};
    (r10.data || []).forEach((u: any) => { um[u.id] = u.full_name || u.email || "—"; });
    setUserMap(um);

    setLoading(false);
  }, [sb, from, to]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Analytics
  const paid = orders.filter((o: any) => o.payment_status === "paid");
  const totalRev = paid.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const totalExp = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalInv = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const paidInv = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const activeEmps = employees.filter((e: any) => e.status === "active").length;

  // ── Reimbursement audit rows (full lifecycle) ──
  const reimbRows = useMemo(() => {
    return expenses
      .filter((e: any) => !reimbStatus || e.status === reimbStatus)
      .map((e: any) => ({
        id: e.id,
        claim: e.title,
        employee: e.employee_id ? (empMap[e.employee_id] || "—") : "Org expense",
        head: e.head_id ? headLabel(heads, e.head_id) : "—",
        category: expCategories.find((c: any) => c.id === e.category_id)?.name || "—",
        amount: e.amount || 0,
        raisedBy: e.employee_id ? (empMap[e.employee_id] || "—") : "—",
        approvedBy: e.approved_by ? (userMap[e.approved_by] || "—") : "—",
        settledBy: e.paid_by ? (userMap[e.paid_by] || "—") : "—",
        mode: e.paid_method || "—",
        txn: e.paid_reference || "—",
        claimDate: e.date,
        approvedAt: e.approved_at,
        paidAt: e.paid_at,
        status: e.status,
      }))
      .sort((a: any, b: any) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime());
  }, [expenses, reimbStatus, empMap, userMap, heads, expCategories]);

  const reimbTotals = useMemo(() => {
    const all = reimbRows;
    return {
      count: all.length,
      total: all.reduce((s, r) => s + r.amount, 0),
      reimbursed: all.filter(r => r.status === "reimbursed").reduce((s, r) => s + r.amount, 0),
      pending: all.filter(r => r.status === "pending").length,
    };
  }, [reimbRows]);

  const exportReimbCSV = () => {
    const headers = ["Claim", "Employee", "Head", "Category", "Amount", "Raised by", "Approved by", "Settled by", "Mode", "Txn ref", "Claim date", "Approved at", "Paid at", "Status"];
    const escape = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(",")];
    reimbRows.forEach(r => {
      lines.push([r.claim, r.employee, r.head, r.category, r.amount, r.raisedBy, r.approvedBy, r.settledBy, r.mode, r.txn, r.claimDate, r.approvedAt ? new Date(r.approvedAt).toISOString() : "", r.paidAt ? new Date(r.paidAt).toISOString() : "", r.status].map(escape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reimbursement-audit-${from}-to-${to}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Daily revenue
  const dailyRev = useMemo(() => {
    const map: Record<string, number> = {};
    const d = new Date(from); while (d <= new Date(to)) { map[d.toISOString().split("T")[0]] = 0; d.setDate(d.getDate() + 1); }
    paid.forEach((o: any) => { const k = o.created_at?.split("T")[0]; if (k && map[k] !== undefined) map[k] += o.total || 0; });
    return Object.entries(map).map(([k, v]) => ({ date: new Date(k).getDate().toString(), revenue: v }));
  }, [paid, from, to]);

  const monthlyData = useMemo(() => {
    const map = MONTHS.map(m => ({ month: m, revenue: 0, expenses: 0 }));
    paid.forEach((o: any) => { map[new Date(o.created_at).getMonth()].revenue += o.total || 0; });
    expenses.forEach((e: any) => { map[new Date(e.date).getMonth()].expenses += e.amount || 0; });
    return map;
  }, [paid, expenses]);

  const expByCat = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => { const cat = expCategories.find((c: any) => c.id === e.category_id); map[cat?.name || "Other"] = (map[cat?.name || "Other"] || 0) + (e.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [expenses, expCategories]);

  const deptData = useMemo(() => {
    const map: Record<string, number> = {};
    employees.filter((e: any) => e.status === "active").forEach((e: any) => { map[e.department || "Unassigned"] = (map[e.department || "Unassigned"] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count], i) => ({ name, count, fill: COLORS[i % COLORS.length] }));
  }, [employees]);

  const paySplit = useMemo(() => {
    const map: Record<string, number> = {};
    paid.forEach((o: any) => { map[o.payment_method || "other"] = (map[o.payment_method || "other"] || 0) + (o.total || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [paid]);

  const channelSplit = useMemo(() => {
    const map: Record<string, number> = {};
    paid.forEach((o: any) => { map[o.channel || "offline"] = (map[o.channel || "offline"] || 0) + (o.total || 0); });
    return Object.entries(map).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [paid]);

  const hourlyComparison = useMemo(() => {
    const now = new Date(); const curHour = now.getHours();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const label = i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`;
      let todayCum = 0; let yesterdayCum = 0;
      for (let h = 0; h <= i; h++) {
        todayCum += paid.filter((o: any) => new Date(o.created_at).toDateString() === now.toDateString() && new Date(o.created_at).getHours() === h).reduce((s: number, o: any) => s + (o.total || 0), 0);
        const yPaid = yesterdayOrders.filter((o: any) => o.payment_status === "paid");
        yesterdayCum += yPaid.filter((o: any) => new Date(o.created_at).getHours() === h).reduce((s: number, o: any) => s + (o.total || 0), 0);
      }
      return { hour: label, today: i <= curHour ? todayCum : null, yesterday: yesterdayCum };
    });
    const todayTotal = hours[curHour]?.today || 0;
    const yesterdayAtNow = hours[curHour]?.yesterday || 0;
    const diff = yesterdayAtNow > 0 ? Math.round(((todayTotal - yesterdayAtNow) / yesterdayAtNow) * 100) : 0;
    return { hours, todayTotal, diff };
  }, [paid, yesterdayOrders]);

  const cfData = useMemo(() => {
    const map: Record<string, { day: string; inflow: number; outflow: number }> = {};
    cashflow.forEach((c: any) => { const k = new Date(c.date).getDate().toString(); if (!map[k]) map[k] = { day: k, inflow: 0, outflow: 0 }; if (c.type === "inflow") map[k].inflow += c.amount || 0; else map[k].outflow += c.amount || 0; });
    return Object.values(map).sort((a, b) => Number(a.day) - Number(b.day));
  }, [cashflow]);

  const salaryDist = useMemo(() => {
    const ranges = [{ label: "<20K", min: 0, max: 20000 }, { label: "20-40K", min: 20000, max: 40000 }, { label: "40-60K", min: 40000, max: 60000 }, { label: "60-80K", min: 60000, max: 80000 }, { label: "80K+", min: 80000, max: Infinity }];
    return ranges.map(r => ({ range: r.label, count: employees.filter((e: any) => (e.gross_salary || 0) >= r.min && (e.gross_salary || 0) < r.max).length }));
  }, [employees]);

  const MODULES: { id: Module; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Layers className="w-4 h-4" /> },
    { id: "sales", label: "Sales", icon: <ShoppingCart className="w-4 h-4" /> },
    { id: "expenses", label: "Expenses", icon: <Receipt className="w-4 h-4" /> },
    { id: "reimbursements", label: "Reimbursements", icon: <Wallet className="w-4 h-4" /> },
    { id: "employees", label: "People", icon: <Users className="w-4 h-4" /> },
    { id: "invoices", label: "Invoices", icon: <FileText className="w-4 h-4" /> },
    { id: "cashflow", label: "Cashflow", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-900">Reports</h1><p className="text-sm text-gray-400">All chart types, all modules</p></div>
        <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
          {MODULES.map(m => <button key={m.id} onClick={() => setModule(m.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${module === m.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{m.icon}{m.label}</button>)}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["today","this_week","this_month","last_month","this_quarter","this_year"] as DateRange[]).map(r => (
            <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${dateRange === r ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}>{r.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div> : (
        <div className="space-y-6">

          {/* OVERVIEW */}
          {module === "overview" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Revenue" value={fmtINR(totalRev)} sub={`${paid.length} orders`} icon={<IndianRupee className="w-5 h-5 text-indigo-500" />} />
              <StatCard label="Expenses" value={fmtINR(totalExp)} sub={`${expenses.length} entries`} icon={<Receipt className="w-5 h-5 text-red-500" />} />
              <StatCard label="Net P&L" value={fmtINR(totalRev - totalExp)} icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} trend={totalRev > 0 ? Math.round(((totalRev - totalExp) / totalRev) * 100) : 0} />
              <StatCard label="Invoiced" value={fmtINR(totalInv)} sub={`Paid: ${fmtINR(paidInv)}`} icon={<FileText className="w-5 h-5 text-blue-500" />} />
              <StatCard label="Team" value={activeEmps.toString()} sub={`${employees.length} total`} icon={<Users className="w-5 h-5 text-violet-500" />} />
            </div>

            <ChartCard title="Today vs yesterday">
              <div className="flex items-start justify-between mb-2">
                <div><p className="text-2xl font-bold text-gray-900">{fmtINR(hourlyComparison.todayTotal)}</p></div>
                <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${hourlyComparison.diff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                  {hourlyComparison.diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(hourlyComparison.diff)}% vs yesterday
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourlyComparison.hours}>
                  <defs>
                    <linearGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366F1" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9CA3AF" }} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v: number) => v > 999 ? `${Math.round(v / 1000)}k` : v.toString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="yesterday" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="5 3" fill="none" name="Yesterday" dot={false} />
                  <Area type="monotone" dataKey="today" stroke="#6366F1" strokeWidth={2.5} fill="url(#todayGrad)" name="Today" dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Revenue vs Expenses">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill="#6366F1" radius={[4,4,0,0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="#EF4444" radius={[4,4,0,0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Expenses by category">
                <ResponsiveContainer width="100%" height={220}>
                  <RePieChart><Pie data={expByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                    {expByCat.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie><Tooltip content={<CustomTooltip />} /></RePieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>)}

          {/* SALES */}
          {module === "sales" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Revenue" value={fmtINR(totalRev)} sub={`${paid.length} orders`} icon={<IndianRupee className="w-5 h-5 text-indigo-500" />} />
              <StatCard label="Avg order" value={fmtINR(paid.length > 0 ? totalRev / paid.length : 0)} icon={<ShoppingCart className="w-5 h-5 text-violet-500" />} />
              <StatCard label="Items sold" value={paid.reduce((s: number, o: any) => s + (o.items?.length || 0), 0).toString()} icon={<BarChart3 className="w-5 h-5 text-amber-500" />} />
              <StatCard label="Customers" value={new Set(orders.filter((o: any) => o.customer_name).map((o: any) => o.customer_name)).size.toString()} icon={<Users className="w-5 h-5 text-emerald-500" />} />
            </div>

            <ChartCard title="Today vs yesterday">
              <div className="flex items-start justify-between mb-2">
                <p className="text-2xl font-bold text-gray-900">{fmtINR(hourlyComparison.todayTotal)}</p>
                <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${hourlyComparison.diff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>{hourlyComparison.diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(hourlyComparison.diff)}%</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={hourlyComparison.hours}>
                  <defs><linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} /><stop offset="100%" stopColor="#6366F1" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9CA3AF" }} interval={2} /><YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v: number) => v > 999 ? `${Math.round(v / 1000)}k` : v.toString()} /><Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="yesterday" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="5 3" fill="none" name="Yesterday" dot={false} />
                  <Area type="monotone" dataKey="today" stroke="#6366F1" strokeWidth={2.5} fill="url(#tg2)" name="Today" dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Daily revenue">
              <ResponsiveContainer width="100%" height={200}><BarChart data={dailyRev}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="revenue" fill="#6366F1" radius={[4,4,0,0]} name="Revenue" /></BarChart></ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Revenue by channel">
                <ResponsiveContainer width="100%" height={200}><RePieChart><Pie data={channelSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>{channelSplit.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /></RePieChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Payment methods">
                <ResponsiveContainer width="100%" height={200}><BarChart data={paySplit} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="value" radius={[0,4,4,0]} name="Amount">{paySplit.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer>
              </ChartCard>
            </div>
          </>)}

          {/* EXPENSES */}
          {module === "expenses" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total" value={fmtINR(totalExp)} sub={`${expenses.length} entries`} icon={<Receipt className="w-5 h-5 text-red-500" />} />
              <StatCard label="Avg/day" value={fmtINR(totalExp / Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000)))} icon={<Clock className="w-5 h-5 text-amber-500" />} />
              <StatCard label="Categories" value={expByCat.length.toString()} icon={<PieChart className="w-5 h-5 text-violet-500" />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="By category (donut)">
                <ResponsiveContainer width="100%" height={250}><RePieChart><Pie data={expByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>{expByCat.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /></RePieChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="By category (bar)">
                <ResponsiveContainer width="100%" height={250}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="value" radius={[0,4,4,0]} name="Amount">{expByCat.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer>
              </ChartCard>
            </div>
          </>)}

          {/* REIMBURSEMENTS — full lifecycle audit */}
          {module === "reimbursements" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Claims" value={reimbTotals.count.toString()} sub="In range" icon={<Wallet className="w-5 h-5 text-indigo-500" />} />
              <StatCard label="Total value" value={fmtINR(reimbTotals.total)} icon={<IndianRupee className="w-5 h-5 text-violet-500" />} />
              <StatCard label="Reimbursed" value={fmtINR(reimbTotals.reimbursed)} icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} />
              <StatCard label="Pending" value={reimbTotals.pending.toString()} icon={<Clock className="w-5 h-5 text-amber-500" />} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Reimbursement audit trail</h3>
                  <div className="flex gap-1.5">
                    {["", "pending", "approved", "reimbursed", "rejected"].map(s => (
                      <button key={s} onClick={() => setReimbStatus(s)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${reimbStatus === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}>
                        {s || "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={exportReimbCSV} disabled={reimbRows.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </button>
              </div>

              {reimbRows.length === 0 ? (
                <div className="text-center py-16"><Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">No reimbursements in this range</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      {["Claim", "Employee", "Head", "Amount", "Raised by", "Approved by", "Settled by", "Mode", "Txn ref", "Claim date", "Status"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {reimbRows.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.claim}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.employee}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.head}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">{fmtINR(r.amount)}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.raisedBy}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.approvedBy}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.settledBy}</td>
                          <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{r.mode.replace("_", " ")}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.txn}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtD(r.claimDate)}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REIMB_STATUS[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {reimbRows.length > 0 && <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">{reimbRows.length} claim{reimbRows.length !== 1 ? "s" : ""} · Total {fmtINR(reimbTotals.total)}</div>}
            </div>
          </>)}

          {/* EMPLOYEES */}
          {module === "employees" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Active" value={activeEmps.toString()} icon={<Users className="w-5 h-5 text-emerald-500" />} />
              <StatCard label="Depts" value={deptData.length.toString()} icon={<BarChart3 className="w-5 h-5 text-violet-500" />} />
              <StatCard label="Payroll" value={fmtINR(employees.filter((e: any) => e.status === "active").reduce((s: number, e: any) => s + (e.gross_salary || 0), 0))} icon={<IndianRupee className="w-5 h-5 text-indigo-500" />} />
              <StatCard label="Avg salary" value={fmtINR(activeEmps > 0 ? employees.filter((e: any) => e.status === "active").reduce((s: number, e: any) => s + (e.gross_salary || 0), 0) / activeEmps : 0)} icon={<TrendingUp className="w-5 h-5 text-amber-500" />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="By department">
                <ResponsiveContainer width="100%" height={250}><RePieChart><Pie data={deptData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>{deptData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /></RePieChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Salary distribution">
                <ResponsiveContainer width="100%" height={250}><BarChart data={salaryDist}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="range" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" fill="#8B5CF6" radius={[4,4,0,0]} name="Employees" /></BarChart></ResponsiveContainer>
              </ChartCard>
            </div>
            <ChartCard title="Headcount by department">
              <ResponsiveContainer width="100%" height={200}><BarChart data={deptData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" radius={[0,4,4,0]} name="Count">{deptData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer>
            </ChartCard>
          </>)}

          {/* INVOICES */}
          {module === "invoices" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Invoiced" value={fmtINR(totalInv)} sub={`${invoices.length}`} icon={<FileText className="w-5 h-5 text-indigo-500" />} />
              <StatCard label="Paid" value={fmtINR(paidInv)} icon={<IndianRupee className="w-5 h-5 text-emerald-500" />} />
              <StatCard label="Outstanding" value={fmtINR(totalInv - paidInv)} icon={<Clock className="w-5 h-5 text-amber-500" />} />
              <StatCard label="Collection" value={`${totalInv > 0 ? Math.round((paidInv / totalInv) * 100) : 0}%`} icon={<TrendingUp className="w-5 h-5 text-violet-500" />} />
            </div>
            <ChartCard title="Invoice status">
              <ResponsiveContainer width="100%" height={250}><RePieChart><Pie data={["draft","sent","paid","overdue","cancelled"].map((s) => ({ name: s, value: invoices.filter((inv: any) => inv.status === s).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) })).filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>{["draft","sent","paid","overdue","cancelled"].map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip content={<CustomTooltip />} /></RePieChart></ResponsiveContainer>
            </ChartCard>
          </>)}

          {/* CASHFLOW */}
          {module === "cashflow" && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Inflow" value={fmtINR(cashflow.filter((c: any) => c.type === "inflow").reduce((s: number, c: any) => s + c.amount, 0))} icon={<ArrowDownRight className="w-5 h-5 text-emerald-500" />} />
              <StatCard label="Outflow" value={fmtINR(cashflow.filter((c: any) => c.type === "outflow").reduce((s: number, c: any) => s + c.amount, 0))} icon={<ArrowUpRight className="w-5 h-5 text-red-500" />} />
              <StatCard label="Net" value={fmtINR(cashflow.reduce((s: number, c: any) => s + (c.type === "inflow" ? c.amount : -c.amount), 0))} icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} />
              <StatCard label="Transactions" value={cashflow.length.toString()} icon={<BarChart3 className="w-5 h-5 text-violet-500" />} />
            </div>
            <ChartCard title="Inflow vs Outflow">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cfData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><Tooltip content={<CustomTooltip />} /><Legend />
                  <Bar dataKey="inflow" fill="#22C55E" radius={[4,4,0,0]} name="Inflow" />
                  <Bar dataKey="outflow" fill="#EF4444" radius={[4,4,0,0]} name="Outflow" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>)}
        </div>
      )}
    </div>
  );
}