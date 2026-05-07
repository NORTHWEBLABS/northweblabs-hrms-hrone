"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Users, Clock, IndianRupee, AlertTriangle, CheckCircle2,
  TrendingUp, FileText, Plus, ChevronRight, Calendar, Zap,
  Bell, UserCheck, UserX, Coffee, Lock,
} from "lucide-react";

// ─── Stable Supabase client hook ─────────────────────────────────────────────
function useSupabase() {
  return useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
  []);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttendanceSummary {
  present: number;
  absent: number;
  onLeave: number;
  total: number;
}

interface ComplianceAlert {
  id: string;
  title: string;
  category: "pf" | "esic" | "pt" | "tds" | "gst" | "labour";
  due_date: string;
  days_left: number;
  penalty_if_missed: string;
  status: "pending" | "done" | "overdue";
}

interface ActivityItem {
  id: string;
  type: "attendance" | "payroll" | "leave" | "employee" | "document";
  message: string;
  time: string;
}

interface DashboardData {
  orgName: string;
  attendance: AttendanceSummary;
  payrollStatus: "draft" | "processing" | "completed" | "paid";
  payrollTotal: number;
  employeeCount: number;
  complianceAlerts: ComplianceAlert[];
  pendingLeaves: number;
  activity: ActivityItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n: number) =>
  n >= 100000 ? "₹" + (n / 100000).toFixed(1) + "L" : "₹" + n.toLocaleString("en-IN");

const catBadge: Record<string, string> = {
  pf: "bg-blue-100 text-blue-700",
  esic: "bg-purple-100 text-purple-700",
  pt: "bg-amber-100 text-amber-700",
  tds: "bg-orange-100 text-orange-700",
  gst: "bg-green-100 text-green-700",
  labour: "bg-red-100 text-red-700",
};

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const cfg: Record<string, { bg: string; icon: React.ReactNode }> = {
    attendance: { bg: "bg-emerald-100", icon: <Clock className="w-3 h-3 text-emerald-600" /> },
    leave:      { bg: "bg-amber-100",   icon: <Coffee className="w-3 h-3 text-amber-600" /> },
    payroll:    { bg: "bg-indigo-100",  icon: <IndianRupee className="w-3 h-3 text-indigo-600" /> },
    employee:   { bg: "bg-blue-100",    icon: <Users className="w-3 h-3 text-blue-600" /> },
    document:   { bg: "bg-gray-100",    icon: <FileText className="w-3 h-3 text-gray-500" /> },
  };
  const c = cfg[type] ?? cfg.document;
  return (
    <div className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
      {c.icon}
    </div>
  );
}

function LockedOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/70 backdrop-blur-[3px]">
      <div className="flex flex-col items-center gap-2 text-center px-4">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <button className="mt-1 px-3 py-1.5 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-[#1e293b] transition-colors flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />Upgrade
        </button>
      </div>
    </div>
  );
}

// ─── Time / greeting hook ─────────────────────────────────────────────────────
function useGreeting() {
  const [greeting, setGreeting]   = useState("");
  const [dateString, setDateString] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
      setCurrentTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
      setDateString(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  return { greeting, dateString, currentTime };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = useSupabase();
  const { greeting, dateString, currentTime } = useGreeting();

  const [data, setData]           = useState<DashboardData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // ── Fetch all dashboard data ──
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Resolve org_id — same priority as employees page
      let orgId = "";

      // 1. localStorage (set by org switcher)
      if (typeof window !== "undefined") {
        orgId = localStorage.getItem("activeOrgId") || "";
      }

      // 2. Logged-in user's org
      if (!orgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: ud } = await supabase
            .from("users").select("org_id").eq("id", user.id).maybeSingle();
          if (ud?.org_id) orgId = ud.org_id;
        }
      }

      // 3. Dev fallback — first org in DB
      if (!orgId) {
        const { data: firstOrg } = await supabase
          .from("organizations").select("id").order("created_at").limit(1).maybeSingle();
        if (firstOrg?.id) orgId = firstOrg.id;
      }

      if (!orgId) { setLoading(false); return; }

      const today        = new Date().toISOString().split("T")[0];
      const currentMonth = new Date().getMonth() + 1;
      const currentYear  = new Date().getFullYear();

      const [
        { data: employees },
        { data: todayAttendance },
        { data: payrollRun },
        { data: complianceItems },
        { data: pendingLeaves },
        { data: org },
      ] = await Promise.all([
        supabase.from("employees").select("id").eq("org_id", orgId).eq("status", "active"),
        supabase.from("attendance").select("status").eq("org_id", orgId).eq("date", today),
        supabase.from("payroll_runs").select("status,total_net").eq("org_id", orgId).eq("month", currentMonth).eq("year", currentYear).maybeSingle(),
        supabase.from("compliance_items").select("*").eq("org_id", orgId).eq("status", "pending").order("due_date").limit(5),
        supabase.from("leaves").select("id").eq("org_id", orgId).eq("status", "pending"),
        supabase.from("organizations").select("name").eq("id", orgId).single(),
      ]);

      const totalEmployees = employees?.length ?? 0;
      const present  = todayAttendance?.filter((a) => a.status === "present").length ?? 0;
      const onLeave  = todayAttendance?.filter((a) => ["half_day","leave"].includes(a.status)).length ?? 0;
      const absent   = Math.max(0, totalEmployees - present - onLeave);

      const enrichedCompliance = (complianceItems ?? []).map((item) => ({
        ...item,
        days_left: Math.ceil((new Date(item.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      })) as ComplianceAlert[];

      const monthName = new Date().toLocaleString("en-IN", { month: "long" });

      const activity: ActivityItem[] = [
        { id:"1", type:"attendance", message:"Employees marking check-in via WhatsApp", time:"Live" },
        { id:"2", type:"payroll",    message:`Payroll draft created for ${monthName} ${currentYear}`, time:"Today" },
        { id:"3", type:"leave",      message:`${pendingLeaves?.length ?? 0} leave request${(pendingLeaves?.length ?? 0) !== 1 ? "s" : ""} pending approval`, time:"Today" },
      ];

      setData({
        orgName:          (org as {name:string}|null)?.name ?? "Your Company",
        attendance:       { present, absent, onLeave, total: totalEmployees },
        payrollStatus:    (payrollRun as {status:DashboardData["payrollStatus"];total_net:number}|null)?.status ?? "draft",
        payrollTotal:     (payrollRun as {status:string;total_net:number}|null)?.total_net ?? 0,
        employeeCount:    totalEmployees,
        complianceAlerts: enrichedCompliance,
        pendingLeaves:    pendingLeaves?.length ?? 0,
        activity,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Re-fetch when org is switched from sidebar
  useEffect(() => {
    const handler = () => { fetchDashboard(); };
    window.addEventListener("orgSwitch", handler);
    return () => window.removeEventListener("orgSwitch", handler);
  }, [fetchDashboard]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const d            = data;
  const attendance   = d?.attendance ?? { present:0, absent:0, onLeave:0, total:0 };
  const presentPct   = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0;
  const monthName    = new Date().toLocaleString("en-IN", { month:"long", year:"numeric" });
  const urgentAlert  = d?.complianceAlerts.find((c) => c.days_left <= 1);

  const stats = [
    { label:"Total employees",   value: d?.employeeCount ?? 0,
      sub:"Active headcount",    icon:<Users className="w-4 h-4"/>,      tc:"text-blue-600",   bc:"bg-blue-50",   href:"/employees" },
    { label:"Present today",     value:`${attendance.present}/${attendance.total}`,
      sub:`${presentPct}% attendance rate`, icon:<UserCheck className="w-4 h-4"/>, tc:"text-emerald-600", bc:"bg-emerald-50", href:"/attendance" },
    { label:`${new Date().toLocaleString("en-IN",{month:"long"})} payroll`,
      value: d?.payrollTotal ? fmtINR(d.payrollTotal) : "Not run",
      sub: d?.payrollStatus === "draft" ? "Draft — not processed" : `Status: ${d?.payrollStatus ?? "—"}`,
      icon:<IndianRupee className="w-4 h-4"/>, tc:"text-indigo-600", bc:"bg-indigo-50", href:"/payroll" },
    { label:"Pending leaves",    value: d?.pendingLeaves ?? 0,
      sub:"Awaiting your approval", icon:<Calendar className="w-4 h-4"/>, tc:"text-amber-600", bc:"bg-amber-50", href:"/leaves" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {greeting}{d?.orgName ? `, ${d.orgName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {dateString}{currentTime ? ` · ${currentTime}` : ""}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4 text-gray-500" />
            {(urgentAlert || (d?.pendingLeaves ?? 0) > 0) && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1">
              <p className="text-xs font-semibold text-gray-500 px-4 pt-2 pb-1.5">Notifications</p>
              {urgentAlert && (
                <div className="flex gap-2.5 px-4 py-2.5 hover:bg-gray-50 border-l-2 border-red-400 cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{urgentAlert.title} due {urgentAlert.days_left <= 0 ? "today" : "tomorrow"}</p>
                </div>
              )}
              {(d?.pendingLeaves ?? 0) > 0 && (
                <div className="flex gap-2.5 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{d?.pendingLeaves} leave request{(d?.pendingLeaves ?? 0) > 1 ? "s" : ""} pending</p>
                </div>
              )}
              {d?.payrollStatus === "draft" && (
                <div className="flex gap-2.5 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{new Date().toLocaleString("en-IN",{month:"long"})} payroll not processed yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Urgent banner ── */}
      {urgentAlert && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            <span className="font-semibold">Urgent:</span>{" "}
            {urgentAlert.title} is due {urgentAlert.days_left <= 0 ? "today" : "tomorrow"}.
            Penalty: {urgentAlert.penalty_if_missed}
          </p>
          <button className="flex-shrink-0 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">
            Mark done
          </button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
            <div className={`w-9 h-9 rounded-lg ${s.bc} ${s.tc} flex items-center justify-center flex-shrink-0`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
              <p className="text-xs text-gray-400 truncate">{s.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left 2/3 */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Attendance bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Today&apos;s attendance</h3>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
              {attendance.total > 0 ? (
                <>
                  <div className="bg-emerald-500 rounded-full transition-all duration-500" style={{ width:`${(attendance.present/attendance.total)*100}%` }} />
                  <div className="bg-red-400 rounded-full transition-all duration-500"    style={{ width:`${(attendance.absent/attendance.total)*100}%` }} />
                  <div className="bg-amber-400 rounded-full transition-all duration-500"  style={{ width:`${(attendance.onLeave/attendance.total)*100}%` }} />
                </>
              ) : (
                <div className="bg-gray-200 rounded-full w-full" />
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {([
                ["Present",  attendance.present,  "bg-emerald-500","text-emerald-600"],
                ["Absent",   attendance.absent,   "bg-red-400",    "text-red-500"],
                ["On Leave", attendance.onLeave,  "bg-amber-400",  "text-amber-600"],
              ] as [string,number,string,string][]).map(([l,v,dot,c]) => (
                <div key={l}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs text-gray-500">{l}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{v}</p>
                  <p className={`text-xs ${c}`}>
                    {attendance.total > 0 ? Math.round((v / attendance.total) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Payroll card + Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Payroll */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Payroll — {monthName}</h3>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  d?.payrollStatus === "paid"       ? "bg-emerald-100 text-emerald-700" :
                  d?.payrollStatus === "completed"  ? "bg-blue-100 text-blue-700"      :
                  d?.payrollStatus === "processing" ? "bg-amber-100 text-amber-700"    :
                                                      "bg-gray-100 text-gray-600"
                }`}>
                  {d?.payrollStatus
                    ? d.payrollStatus.charAt(0).toUpperCase() + d.payrollStatus.slice(1)
                    : "Draft"}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {d?.payrollTotal ? fmtINR(d.payrollTotal) : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 mb-4">
                {d?.employeeCount} employees
              </p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{
                  width: d?.payrollStatus === "paid"       ? "100%" :
                         d?.payrollStatus === "completed"  ? "75%"  :
                         d?.payrollStatus === "processing" ? "40%"  : "5%"
                }}/>
              </div>
              <Link href="/payroll"
                className="w-full py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-[#1e293b] transition-colors flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {d?.payrollStatus === "draft" ? "Process payroll" : "View payroll run"}
              </Link>
            </div>

            {/* Quick actions + WhatsApp */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-800">Quick actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/attendance"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  <UserCheck className="w-3.5 h-3.5"/>Mark attendance
                </Link>
                <Link href="/employees"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                  <Plus className="w-3.5 h-3.5"/>Onboard employee
                </Link>
                <Link href="/payroll"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                  <IndianRupee className="w-3.5 h-3.5"/>Run payroll
                </Link>
                <Link href="/documents"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
                  <FileText className="w-3.5 h-3.5"/>Generate doc
                </Link>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">WhatsApp bot</span>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>Live
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-500">
                  <span className="text-emerald-600">+91 98765:</span> IN<br/>
                  <span className="text-gray-400">→ Check-in ✓ just now</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Recent activity</h3>
              <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3"/>
              </button>
            </div>
            <div className="flex flex-col">
              {(d?.activity ?? []).map((item, i) => (
                <div key={item.id} className={`flex items-start gap-3 py-2.5 ${i < (d?.activity.length ?? 0) - 1 ? "border-b border-gray-100" : ""}`}>
                  <ActivityIcon type={item.type}/>
                  <p className="flex-1 text-xs text-gray-600 leading-snug">{item.message}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Compliance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
            {(d?.complianceAlerts.length === 0) && <LockedOverlay label="Compliance module"/>}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Compliance alerts</h3>
              <Bell className="w-3.5 h-3.5 text-gray-400"/>
            </div>
            <div className="flex flex-col gap-2">
              {(d?.complianceAlerts ?? []).sort((a,b) => a.days_left - b.days_left).map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-lg border
                  ${item.days_left <= 3 ? "bg-red-50 border-red-200" : item.days_left <= 7 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${catBadge[item.category]}`}>
                      {item.category.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-700 truncate">{item.title}</p>
                  </div>
                  <span className={`flex-shrink-0 ml-2 text-xs font-bold
                    ${item.days_left <= 3 ? "text-red-600" : item.days_left <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                    {item.days_left <= 0 ? "Today" : item.days_left === 1 ? "Tmrw" : `${item.days_left}d`}
                  </span>
                </div>
              ))}
              {(d?.complianceAlerts.length === 0) && [1,2,3].map(i => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"/>
              ))}
            </div>
          </div>

          {/* Pending approvals */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Pending approvals</h3>
              {(d?.pendingLeaves ?? 0) > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">
                  {d?.pendingLeaves}
                </span>
              )}
            </div>
            {(d?.pendingLeaves ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-300"/>
                <p className="text-xs text-gray-400">All caught up</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 leading-relaxed">
                {d?.pendingLeaves} leave request{(d?.pendingLeaves ?? 0) > 1 ? "s" : ""} waiting.{" "}
                <Link href="/leaves" className="text-indigo-600 font-semibold hover:underline">Review now →</Link>
              </p>
            )}
          </div>

          {/* Month snapshot */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400"/>
              <h3 className="text-sm font-semibold text-gray-800">
                {new Date().toLocaleString("en-IN",{month:"long"})} at a glance
              </h3>
            </div>
            {([
              ["Attendance rate",   `${presentPct}%`,                    presentPct >= 85 ? "text-emerald-600" : "text-amber-600"],
              ["Payroll status",    d?.payrollStatus ? d.payrollStatus.charAt(0).toUpperCase()+d.payrollStatus.slice(1) : "—", "text-indigo-600"],
              ["Pending leaves",    `${d?.pendingLeaves ?? 0}`,           "text-amber-600"],
              ["Active employees",  `${d?.employeeCount ?? 0}`,           "text-blue-600"],
              ["Compliance due",    `${d?.complianceAlerts.length ?? 0} pending`, "text-red-600"],
            ] as [string,string,string][]).map(([label, value, color]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-xs font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}