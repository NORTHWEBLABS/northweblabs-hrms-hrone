"use client";
// Route: app/(dashboard)/erp/page.tsx
// ERP Dashboard — Unified business overview pulling from all modules

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  TrendingUp, IndianRupee, Users, ShoppingBag,
  Receipt, FileText, AlertCircle, ArrowUpRight,
  ArrowDownRight, Loader2, RefreshCw, Clock,
  Package, BarChart3, MessageCircle, Banknote,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

const fmtINR = (n: number) => "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");
const COLORS = ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#14B8A6"];
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (<div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl"><p className="font-semibold mb-1">{label}</p>{payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.value > 100 ? fmtINR(p.value) : p.value}</p>)}</div>);
};

function MetricCard({ title, value, sub, icon, trend, color, href }: { title: string; value: string; sub?: string; icon: React.ReactNode; trend?: number; color: string; href?: string }) {
  const Card = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "12", color }}>{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <a href={href}>{Card}</a> : Card;
}

function AlertCard({ title, message, type, action, href }: { title: string; message: string; type: "warning" | "error" | "info"; action?: string; href?: string }) {
  const styles = { warning: "bg-amber-50 border-amber-200 text-amber-800", error: "bg-red-50 border-red-200 text-red-800", info: "bg-blue-50 border-blue-200 text-blue-800" };
  const icons = { warning: <AlertCircle className="w-4 h-4 text-amber-500" />, error: <AlertCircle className="w-4 h-4 text-red-500" />, info: <Clock className="w-4 h-4 text-blue-500" /> };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1 min-w-0"><p className="text-xs font-semibold">{title}</p><p className="text-xs opacity-80 mt-0.5">{message}</p></div>
      {action && href && <a href={href} className="text-xs font-semibold underline flex-shrink-0">{action}</a>}
    </div>
  );
}

export default function ERPDashboard() {
  const sb = useSB();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }

    const today = new Date().toISOString().split("T")[0];
    const monthStart = `${today.slice(0, 7)}-01`;
    const yearStart = `${today.slice(0, 4)}-01-01`;

    const [emps, orders, monthOrders, expenses, invoices, cashflow, lowStock, pendingLeaves, registers, docs] = await Promise.all([
      sb.from("employees").select("id, status, department, gross_salary, gender").eq("org_id", oid),
      sb.from("store_orders").select("total, payment_status, channel, created_at").eq("org_id", oid).gte("created_at", today + "T00:00").lte("created_at", today + "T23:59"),
      sb.from("store_orders").select("total, payment_status, created_at").eq("org_id", oid).gte("created_at", monthStart + "T00:00"),
      sb.from("expenses").select("amount, date, category_id").eq("org_id", oid).gte("date", monthStart),
      sb.from("invoices").select("total_amount, status, balance_due").eq("org_id", oid),
      sb.from("cashflow_entries").select("type, amount, date").eq("org_id", oid).gte("date", monthStart),
      sb.from("store_products").select("id, name, stock_qty, min_stock").eq("org_id", oid).eq("is_active", true),
      sb.from("leave_requests").select("id").eq("status", "pending"),
      sb.from("cash_register").select("total_sales, total_expenses, closing_cash, date").eq("org_id", oid).order("date", { ascending: false }).limit(7),
      sb.from("document_archive").select("id, expiry_date, doc_name").eq("org_id", oid),
    ]);

    setData({
      employees: emps.data || [], todayOrders: orders.data || [], monthOrders: monthOrders.data || [],
      expenses: expenses.data || [], invoices: invoices.data || [], cashflow: cashflow.data || [],
      products: lowStock.data || [], pendingLeaves: pendingLeaves.data || [],
      registers: registers.data || [], docs: docs.data || [],
    });
    setLoading(false);
  }, [sb]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Computed
  const activeEmps = (data.employees || []).filter((e: any) => e.status === "active").length;
  const monthlyPayroll = (data.employees || []).filter((e: any) => e.status === "active").reduce((s: number, e: any) => s + (e.gross_salary || 0), 0);
  const todayRevenue = (data.todayOrders || []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total || 0), 0);
  const todayOrderCount = (data.todayOrders || []).filter((o: any) => o.payment_status === "paid").length;
  const monthRevenue = (data.monthOrders || []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total || 0), 0);
  const monthExpenses = (data.expenses || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const netPL = monthRevenue - monthExpenses;
  const totalInvoiced = (data.invoices || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const overdueInvoices = (data.invoices || []).filter((i: any) => i.status === "overdue");
  const outstandingAmt = overdueInvoices.reduce((s: number, i: any) => s + (i.balance_due || 0), 0);
  const lowStockProducts = (data.products || []).filter((p: any) => p.stock_qty <= p.min_stock);
  const expiringDocs = (data.docs || []).filter((d: any) => d.expiry_date && new Date(d.expiry_date).getTime() - Date.now() < 30 * 86400000 && new Date(d.expiry_date) > new Date());
  const cfInflow = (data.cashflow || []).filter((c: any) => c.type === "inflow").reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const cfOutflow = (data.cashflow || []).filter((c: any) => c.type === "outflow").reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const lastRegister = (data.registers || [])[0];

  // Weekly revenue chart
  const weeklyChart = useMemo(() => {
    return (data.registers || []).reverse().map((r: any) => ({
      date: new Date(r.date).toLocaleDateString("en-IN", { weekday: "short" }),
      sales: r.total_sales || 0, expenses: r.total_expenses || 0,
    }));
  }, [data.registers]);

  // Department distribution
  const deptPie = useMemo(() => {
    const map: Record<string, number> = {};
    (data.employees || []).filter((e: any) => e.status === "active").forEach((e: any) => { map[e.department || "Other"] = (map[e.department || "Other"] || 0) + 1; });
    return Object.entries(map).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [data.employees]);

  // Alerts
  const alerts: { title: string; message: string; type: "warning" | "error" | "info"; action?: string; href?: string }[] = [];
  if (lowStockProducts.length > 0) alerts.push({ title: `${lowStockProducts.length} products low on stock`, message: lowStockProducts.slice(0, 3).map((p: any) => p.name).join(", "), type: "warning", action: "View", href: "/store" });
  if (overdueInvoices.length > 0) alerts.push({ title: `${overdueInvoices.length} overdue invoices`, message: `Outstanding: ${fmtINR(outstandingAmt)}`, type: "error", action: "View", href: "/invoices" });
  if ((data.pendingLeaves || []).length > 0) alerts.push({ title: `${data.pendingLeaves.length} pending leave requests`, message: "Awaiting approval", type: "info", action: "Review", href: "/leaves" });
  if (expiringDocs.length > 0) alerts.push({ title: `${expiringDocs.length} documents expiring soon`, message: expiringDocs.slice(0, 2).map((d: any) => d.doc_name).join(", "), type: "warning", action: "View", href: "/documents" });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-900">Business Overview</h1><p className="text-sm text-gray-400">ERP dashboard — all modules at a glance</p></div>
        <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          {alerts.map((a, i) => <AlertCard key={i} {...a} />)}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Today's sales" value={fmtINR(todayRevenue)} sub={`${todayOrderCount} orders`} icon={<ShoppingBag className="w-5 h-5" />} color="#22C55E" href="/store" />
        <MetricCard title="Month revenue" value={fmtINR(monthRevenue)} sub={`Net P&L: ${fmtINR(netPL)}`} icon={<IndianRupee className="w-5 h-5" />} color="#6366F1" trend={monthRevenue > 0 ? Math.round((netPL / monthRevenue) * 100) : 0} href="/reports" />
        <MetricCard title="Month expenses" value={fmtINR(monthExpenses)} sub={`${(data.expenses || []).length} entries`} icon={<Receipt className="w-5 h-5" />} color="#EF4444" href="/expenses" />
        <MetricCard title="Cash in hand" value={fmtINR(lastRegister?.closing_cash || 0)} sub="Last register close" icon={<Banknote className="w-5 h-5" />} color="#F59E0B" href="/cash-register" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Team" value={activeEmps.toString()} sub={`Payroll: ${fmtINR(monthlyPayroll)}/mo`} icon={<Users className="w-5 h-5" />} color="#8B5CF6" href="/employees" />
        <MetricCard title="Invoiced" value={fmtINR(totalInvoiced)} sub={`Outstanding: ${fmtINR(outstandingAmt)}`} icon={<FileText className="w-5 h-5" />} color="#3B82F6" href="/invoices" />
        <MetricCard title="Cashflow (month)" value={fmtINR(cfInflow - cfOutflow)} sub={`In: ${fmtINR(cfInflow)} / Out: ${fmtINR(cfOutflow)}`} icon={<TrendingUp className="w-5 h-5" />} color="#06B6D4" href="/cashflow" />
        <MetricCard title="Inventory" value={`${(data.products || []).length} SKUs`} sub={`${lowStockProducts.length} low stock`} icon={<Package className="w-5 h-5" />} color="#EC4899" href="/store" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly sales trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Last 7 days — Sales vs Expenses</h3>
          {weeklyChart.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No register data</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" fill="#6366F1" radius={[4,4,0,0]} name="Sales" />
                <Bar dataKey="expenses" fill="#EF4444" radius={[4,4,0,0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Team by department</h3>
          {deptPie.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No employees</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={deptPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                {deptPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie><Tooltip content={<CustomTooltip />} /></PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Quick actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "New sale", href: "/store", icon: <ShoppingBag className="w-4 h-4" />, color: "#22C55E" },
            { label: "Record expense", href: "/expenses", icon: <Receipt className="w-4 h-4" />, color: "#EF4444" },
            { label: "Cash register", href: "/cash-register", icon: <Banknote className="w-4 h-4" />, color: "#F59E0B" },
            { label: "Add employee", href: "/employees/add", icon: <Users className="w-4 h-4" />, color: "#8B5CF6" },
            { label: "Cashflow entry", href: "/cashflow", icon: <TrendingUp className="w-4 h-4" />, color: "#06B6D4" },
            { label: "View reports", href: "/reports", icon: <BarChart3 className="w-4 h-4" />, color: "#6366F1" },
            { label: "Upload document", href: "/documents", icon: <FileText className="w-4 h-4" />, color: "#3B82F6" },
            { label: "WhatsApp", href: "/whatsapp", icon: <MessageCircle className="w-4 h-4" />, color: "#22C55E" },
          ].map(a => (
            <a key={a.label} href={a.href} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color + "12", color: a.color }}>{a.icon}</div>
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}