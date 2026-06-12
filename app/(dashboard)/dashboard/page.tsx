"use client";
// Route: app/(dashboard)/dashboard/page.tsx
// ROLE-BASED: redirects employees to /me, shows admin dashboard for owner/admin/hr

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Users, Clock, IndianRupee, CheckCircle2, TrendingUp,
  FileText, Plus, ChevronRight, Calendar, Zap, UserCheck,
  Coffee, Loader2, AlertCircle, Building2, ClipboardCheck,
  Bell, ArrowRight,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

const fmtINR = (n: number) => n >= 100000 ? "₹" + (n / 100000).toFixed(1) + "L" : "₹" + n.toLocaleString("en-IN");

export default function DashboardPage() {
  const sb = useSB();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");

  // Dashboard data
  const [empCount, setEmpCount] = useState(0);
  const [deptCount, setDeptCount] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [deptBreakdown, setDeptBreakdown] = useState<{ name: string; count: number }[]>([]);

  const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const email = localStorage.getItem("userEmail") || "";
    const oid = localStorage.getItem("activeOrgId") || "";

    if (!email) { setLoading(false); return; }

    // Get user role
    let role = "employee";
    const { data: userRows } = await sb.from("users").select("id, full_name, role, org_id").eq("email", email);
    if (userRows && userRows.length > 0) {
      const superAdmin = userRows.find(u => u.role === "super_admin");
      const orgUser = userRows.find(u => u.org_id === oid);
      const picked = superAdmin || orgUser || userRows[0];
      role = picked.role || "employee";
      setUserName(picked.full_name || email.split("@")[0]);
      if (!oid && picked.org_id) { setOrgId(picked.org_id); localStorage.setItem("activeOrgId", picked.org_id); }
    }

    // Also check employees table
    if (role === "employee" && oid) {
      const { data: emp } = await sb.from("employees").select("role").eq("email", email).eq("org_id", oid).maybeSingle();
      if (emp?.role && emp.role !== "employee") role = emp.role;
    }

    setUserRole(role);

    // Redirect based on role
    if (role === "super_admin") { window.location.href = "/organizations"; return; }
    if (role === "employee") { window.location.href = "/me"; return; }

    // For owner/admin/hr/manager — load admin dashboard
    const resolvedOrgId = oid || orgId;
    if (!resolvedOrgId) { setLoading(false); return; }
    setOrgId(resolvedOrgId);

    // Get org name
    const { data: org } = await sb.from("organizations").select("name, brand_name").eq("id", resolvedOrgId).maybeSingle();
    setOrgName(org?.brand_name || org?.name || "");

    const today = new Date().toISOString().split("T")[0];
    const userId = userRows?.find(u => u.org_id === resolvedOrgId)?.id || userRows?.[0]?.id;

    const [emps, depts, att, leaves, approvals, notifs] = await Promise.all([
      sb.from("employees").select("id, full_name, department, designation, status, created_at, role").eq("org_id", resolvedOrgId).eq("status", "active").order("created_at", { ascending: false }),
      sb.from("departments").select("id, name").eq("org_id", resolvedOrgId),
      sb.from("attendance").select("status").eq("org_id", resolvedOrgId).eq("date", today),
      sb.from("leaves").select("id").eq("org_id", resolvedOrgId).eq("status", "pending"),
      sb.from("approval_requests").select("id").eq("org_id", resolvedOrgId).eq("status", "pending"),
      userId ? sb.from("notifications").select("id, title, body, type, read, created_at").eq("user_id", userId).eq("read", false).order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    ]);

    const employees = emps.data || [];
    setEmpCount(employees.length);
    setDeptCount((depts.data || []).length);
    setPresentToday((att.data || []).filter(a => ["present","late","wfh"].includes(a.status)).length);
    setPendingLeaves((leaves.data || []).length);
    setPendingApprovals((approvals.data || []).length);
    setRecentEmployees(employees.slice(0, 5));
    setNotifications((notifs.data || []) as any[]);

    // Department breakdown
    const deptMap: Record<string, number> = {};
    employees.forEach(e => { const d = e.department || "Unassigned"; deptMap[d] = (deptMap[d] || 0) + 1; });
    setDeptBreakdown(Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

    setLoading(false);
  }, [sb, orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const presentPct = empCount > 0 ? Math.round((presentToday / empCount) * 100) : 0;
  const deptColors = ["bg-indigo-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-violet-500","bg-cyan-500","bg-blue-500","bg-pink-500"];

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{greet()}, {userName.split(" ")[0]}</h1>
          <p className="text-sm text-gray-400">{dateStr} · {orgName}</p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">{notifications.length} new</span>
            </div>
          )}
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg capitalize">{userRole}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Employees", value: empCount, sub: "Active", icon: <Users className="w-4 h-4" />, bg: "bg-blue-50", tc: "text-blue-600", href: "/employees" },
          { label: "Present today", value: `${presentToday}/${empCount}`, sub: `${presentPct}%`, icon: <UserCheck className="w-4 h-4" />, bg: "bg-emerald-50", tc: "text-emerald-600", href: "/attendance" },
          { label: "Departments", value: deptCount, sub: "Active", icon: <Building2 className="w-4 h-4" />, bg: "bg-violet-50", tc: "text-violet-600", href: "/employees" },
          { label: "Pending leaves", value: pendingLeaves, sub: "To review", icon: <Coffee className="w-4 h-4" />, bg: "bg-amber-50", tc: "text-amber-600", href: "/leaves" },
          { label: "Approvals", value: pendingApprovals, sub: "Pending", icon: <ClipboardCheck className="w-4 h-4" />, bg: "bg-rose-50", tc: "text-rose-600", href: "/approvals" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-sm transition">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center ${s.tc} mb-2`}>{s.icon}</div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Left — 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Attendance bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Today's attendance</h3>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-4">
              {empCount > 0 ? (<>
                <div className="bg-emerald-500 rounded-full transition-all" style={{ width: `${(presentToday/empCount)*100}%` }} />
                <div className="bg-red-400 rounded-full transition-all" style={{ width: `${((empCount-presentToday)/empCount)*100}%` }} />
              </>) : <div className="bg-gray-200 rounded-full w-full" />}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                ["Present", presentToday, "text-emerald-600", "bg-emerald-500"],
                ["Absent", empCount - presentToday, "text-red-500", "bg-red-400"],
                ["Total", empCount, "text-gray-700", "bg-gray-400"],
              ].map(([l, v, c, dot]) => (
                <div key={l as string}><div className="flex items-center justify-center gap-1.5 mb-1"><div className={`w-2 h-2 rounded-full ${dot}`} /><span className="text-xs text-gray-500">{l}</span></div><p className={`text-xl font-bold ${c}`}>{v}</p></div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Add employee", icon: <Plus className="w-4 h-4" />, href: "/employees", bg: "bg-blue-50 text-blue-600 border-blue-100" },
              { label: "Run payroll", icon: <IndianRupee className="w-4 h-4" />, href: "/payroll", bg: "bg-indigo-50 text-indigo-600 border-indigo-100" },
              { label: "Review leaves", icon: <Coffee className="w-4 h-4" />, href: "/leaves", bg: "bg-amber-50 text-amber-600 border-amber-100" },
              { label: "Approvals", icon: <ClipboardCheck className="w-4 h-4" />, href: "/approvals", bg: "bg-rose-50 text-rose-600 border-rose-100" },
            ].map(a => (
              <Link key={a.label} href={a.href} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium hover:shadow-sm transition ${a.bg}`}>{a.icon}{a.label}</Link>
            ))}
          </div>

          {/* Recent employees */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Recent team members</h3>
              <Link href="/employees" className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5">View all<ChevronRight className="w-3 h-3" /></Link>
            </div>
            {recentEmployees.length === 0 ? (
              <div className="text-center py-8"><Users className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No employees yet</p>
                <Link href="/employees" className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold"><Plus className="w-3 h-3" />Add first employee</Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(emp.full_name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{emp.full_name}</p>
                      <p className="text-xs text-gray-400">{emp.designation || emp.department || "—"}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{emp.role !== "employee" ? emp.role : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {notifications.length > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">{notifications.length}</span>}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-6"><Bell className="w-7 h-7 text-gray-200 mx-auto mb-2" /><p className="text-xs text-gray-400">All caught up</p></div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n.id} className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Department breakdown</h3>
            {deptBreakdown.length === 0 ? (
              <div className="text-center py-4"><Building2 className="w-6 h-6 text-gray-200 mx-auto mb-2" /><p className="text-xs text-gray-400">No departments</p></div>
            ) : (
              <div className="space-y-2.5">
                {deptBreakdown.map((d, i) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{d.name}</span><span className="font-bold text-gray-900">{d.count}</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${deptColors[i % deptColors.length]} rounded-full`} style={{ width: `${(d.count / empCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System status */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">System status</h3>
            {[
              { l: "Platform", v: "Operational", c: "text-emerald-600" },
              { l: "WhatsApp Bot", v: "Connected", c: "text-emerald-600" },
              { l: "Email (Resend)", v: "Active", c: "text-emerald-600" },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{s.l}</span>
                <span className={`text-xs font-semibold ${s.c} flex items-center gap-1`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}