"use client";
// Route: app/me/page.tsx — Employee Dashboard
// Leave balance from leave_balances (policy engine). Quick punch: check-in/out with geo + link to /my-attendance.
// Claim reimbursement: creates expense row + approval_request (payload carries expense_id) -> pipeline -> admin mark-paid.

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { captureAndEvaluate } from "@/lib/geo";
import HeadSelect, { Head } from "@/components/HeadSelect";
import {
  Clock, Calendar, Wallet, Bell, CheckCircle2, AlertCircle, Loader2,
  LogOut, Sun, Moon, Cloud, X, UserPlus, Sparkles, ArrowRight,
  MapPin, Phone, Mail, Briefcase, CalendarDays, FileText,
  MessageSquare, TrendingUp, Award, Receipt,
} from "lucide-react";

function useSB() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

interface UserProfile { id: string; full_name: string | null; email: string; phone: string | null; role: string | null; org_id: string | null; created_at: string; }
interface EmpRecord { id: string; full_name: string | null; department: string | null; designation: string | null; gross_salary: number | null; onboarding_completed: boolean | null; employee_code: string | null; date_of_joining: string | null; }
interface OrgInfo { id: string; name: string; industry: string | null; city: string | null; state: string | null; }
interface Balance { leave_type: string; total: number; used: number; remaining: number | null; }
interface ExpCategory { id: string; name: string; icon: string | null; color: string | null; }

const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const greetIcon = () => { const h = new Date().getHours(); return h < 6 ? <Moon className="w-5 h-5 text-indigo-400" /> : h < 12 ? <Sun className="w-5 h-5 text-amber-400" /> : h < 17 ? <Cloud className="w-5 h-5 text-blue-400" /> : <Moon className="w-5 h-5 text-indigo-400" />; };
const avColor = (n: string) => ["#6366F1","#F43F5E","#22C55E","#EAB308","#F97316","#A855F7","#3B82F6","#14B8A6"][n.charCodeAt(0) % 8];
const initials = (n: string) => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

function Av({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: avColor(name), fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

export default function MePage() {
  const sb = useSB();
  const router = useRouter();
  const now = new Date();
  const monthName = now.toLocaleDateString("en-IN", { month: "long" });
  const monthNum = now.getMonth() + 1;
  const yearNum = now.getFullYear();
  const todayStr = now.toISOString().split("T")[0];

  const [user, setUser] = useState<UserProfile | null>(null);
  const [emp, setEmp] = useState<EmpRecord | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOnboard, setShowOnboard] = useState(true);

  // Real data
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkedOutTime, setCheckedOutTime] = useState("");
  const [todayAttId, setTodayAttId] = useState<string | null>(null);
  const [monthAttendance, setMonthAttendance] = useState({ present: 0, total: 0 });
  const [weekAttendance, setWeekAttendance] = useState<Record<number, string>>({});
  const [latestPayslip, setLatestPayslip] = useState<{ net_payable: number; gross_earned: number; month: number; year: number } | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [leavesTaken, setLeavesTaken] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  // Apply leave modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  // Claim reimbursement modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategories, setExpCategories] = useState<ExpCategory[]>([]);
  const [heads, setHeads] = useState<Head[]>([]);
  const [expForm, setExpForm] = useState({ title: "", amount: "", category_id: "", head_id: "", date: new Date().toISOString().split("T")[0], description: "", payment_method: "upi", vendor: "" });
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const leaveDays = useMemo(() => {
    if (!leaveFrom || !leaveTo) return 0;
    const f = new Date(leaveFrom), t = new Date(leaveTo);
    if (t < f) return 0;
    let d = 0; const c = new Date(f);
    while (c <= t) { if (c.getDay() > 0 && c.getDay() < 6) d++; c.setDate(c.getDate() + 1); }
    return d;
  }, [leaveFrom, leaveTo]);

  const handleApplyLeave = async () => {
    if (!leaveFrom || !leaveTo) { setLeaveError("Select dates"); return; }
    if (leaveDays === 0) { setLeaveError("No working days in range"); return; }
    if (!emp && !user) { setLeaveError("Profile not loaded"); return; }
    setLeaveSaving(true); setLeaveError("");

    try {
      const orgId = user?.org_id || localStorage.getItem("activeOrgId") || "";
      const empId = emp?.id || user?.id || "";
      const empName = emp?.full_name || user?.full_name || user?.email || "";

      // Find reporting manager
      let managerId = "", managerName = "", managerUserId = "";
      if (emp?.id) {
        const { data: empFull } = await sb.from("employees").select("reporting_manager_id").eq("id", emp.id).maybeSingle();
        if (empFull?.reporting_manager_id) {
          const { data: mgr } = await sb.from("employees").select("id, full_name, email").eq("id", empFull.reporting_manager_id).maybeSingle();
          if (mgr) {
            managerId = mgr.id;
            managerName = mgr.full_name || "";
            if (mgr.email) {
              const { data: mgrUser } = await sb.from("users").select("id").eq("email", mgr.email).eq("org_id", orgId).maybeSingle();
              managerUserId = mgrUser?.id || "";
            }
          }
        }
      }
      // Fallback: any admin/owner/hr user
      if (!managerId) {
        const { data: admins } = await sb.from("users").select("id, full_name").eq("org_id", orgId).in("role", ["owner", "admin", "hr"]).limit(1);
        if (admins && admins.length > 0) { managerId = admins[0].id; managerName = admins[0].full_name || "Admin"; managerUserId = admins[0].id; }
      }
      if (!managerUserId) managerUserId = managerId;

      // 1. Create leave request in leaves table (for leaves page)
      try {
        await sb.from("leaves").insert({
          org_id: orgId, employee_id: empId, leave_type: leaveType,
          from_date: leaveFrom, to_date: leaveTo, days: leaveDays, reason: leaveReason || null, status: "pending",
        });
      } catch {}

      // 2. Create approval request — payload carries employee_id so approval can decrement balance
      if (managerId) {
        const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: req } = await sb.from("approval_requests").insert({
          org_id: orgId, type: "leave",
          title: `${leaveType} — ${leaveDays} day${leaveDays > 1 ? "s" : ""}`,
          description: leaveReason || null,
          raised_by: user?.id || empId, raised_by_name: empName,
          assigned_to: managerUserId || managerId, assigned_to_name: managerName,
          status: "pending", escalation_level: 0, tat_hours: 24,
          deadline_at: deadline,
          payload: { employee_id: empId, leave_type: leaveType, from: leaveFrom, to: leaveTo, days: leaveDays },
        }).select().maybeSingle();

        if (req) {
          await sb.from("notifications").insert({
            org_id: orgId, user_id: managerUserId || managerId,
            title: "Leave request",
            body: `${empName} applied for ${leaveType} (${leaveDays} day${leaveDays > 1 ? "s" : ""}: ${leaveFrom} to ${leaveTo})`,
            type: "approval", reference_type: "approval_request", reference_id: req.id, link: "/approvals",
          });
          await sb.from("approval_history").insert({
            request_id: req.id, action: "submitted",
            acted_by: user?.id || empId, acted_by_name: empName,
            notes: `Applied for ${leaveType}`, from_status: null, to_status: "pending",
          });
          // Email manager + CC HR/admin
          try {
            await fetch("/api/approvals/notify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId: req.id, event: "applied" }),
            });
          } catch {}
        }
      }

      setPendingLeaves(p => p + 1);
      setShowLeaveModal(false);
      setLeaveFrom(""); setLeaveTo(""); setLeaveReason(""); setLeaveType("Casual Leave");
      setToast({ msg: "Leave request submitted! Your manager will be notified.", type: "success" });
    } catch (err: any) {
      setLeaveError(err.message || "Failed to submit");
    } finally { setLeaveSaving(false); }
  };

  const handleClaimExpense = async () => {
    if (!expForm.title.trim()) { setExpError("Title required"); return; }
    if (!expForm.amount || Number(expForm.amount) <= 0) { setExpError("Amount required"); return; }
    setExpSaving(true); setExpError("");
    try {
      const orgId = user?.org_id || localStorage.getItem("activeOrgId") || "";
      const empId = emp?.id || null;
      const claimantName = emp?.full_name || user?.full_name || user?.email || "";

      // 1. Insert expense (pending), tied to this employee
      const { data: exp, error: e } = await sb.from("expenses").insert({
        org_id: orgId, title: expForm.title.trim(), amount: Number(expForm.amount),
        category_id: expForm.category_id || null, head_id: expForm.head_id || null, date: expForm.date,
        description: expForm.description || null, payment_method: expForm.payment_method || null,
        vendor: expForm.vendor || null, status: "pending", employee_id: empId,
      }).select().single();
      if (e) { setExpError(e.message); setExpSaving(false); return; }

      // 2. Resolve approver: reporting manager, else owner/admin/hr
      let approverUserId = "", approverName = "";
      if (empId) {
        const { data: empFull } = await sb.from("employees").select("reporting_manager_id").eq("id", empId).maybeSingle();
        if (empFull?.reporting_manager_id) {
          const { data: mgr } = await sb.from("employees").select("full_name, email").eq("id", empFull.reporting_manager_id).maybeSingle();
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

      // 3. Approval request — payload carries expense_id so act/route flips the expense on approve
      if (approverUserId && exp) {
        const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const { data: req } = await sb.from("approval_requests").insert({
          org_id: orgId, type: "expense",
          title: `Reimbursement — ${expForm.title.trim()} (₹${Number(expForm.amount).toLocaleString("en-IN")})`,
          description: expForm.description || null,
          raised_by: user?.id || empId, raised_by_name: claimantName,
          assigned_to: approverUserId, assigned_to_name: approverName,
          status: "pending", escalation_level: 0, tat_hours: 48, deadline_at: deadline,
          payload: { expense_id: exp.id, amount: Number(expForm.amount), employee_id: empId },
        }).select().maybeSingle();
        if (req) {
          await sb.from("notifications").insert({
            org_id: orgId, user_id: approverUserId, title: "Reimbursement request",
            body: `${claimantName} submitted a reimbursement: ${expForm.title.trim()} (₹${Number(expForm.amount).toLocaleString("en-IN")})`,
            type: "approval", reference_type: "approval_request", reference_id: req.id, link: "/approvals",
          });
          await sb.from("approval_history").insert({
            request_id: req.id, action: "submitted", acted_by: user?.id || empId,
            acted_by_name: claimantName, notes: "Reimbursement submitted", from_status: null, to_status: "pending",
          });
          try { await fetch("/api/approvals/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: req.id, event: "applied" }) }); } catch {}
        }
      }

      setShowExpenseModal(false);
      setExpForm({ title: "", amount: "", category_id: "", head_id: "", date: new Date().toISOString().split("T")[0], description: "", payment_method: "upi", vendor: "" });
      setToast({ msg: "Reimbursement submitted for approval", type: "success" });
    } catch (err: any) { setExpError(err.message || "Failed to submit"); }
    finally { setExpSaving(false); }
  };

  const fetchUser = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let userData: UserProfile | null = null;

      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail) {
        const { data } = await sb.from("users").select("*").eq("email", storedEmail.toLowerCase().trim()).maybeSingle();
        if (data) userData = data as UserProfile;
      }

      if (!userData) {
        try {
          const res = await fetch("/api/auth/me", { credentials: "same-origin" });
          if (res.ok) {
            const { user: apiUser } = await res.json();
            if (apiUser) userData = apiUser as UserProfile;
          }
        } catch {}
      }

      if (!userData) {
        const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("session_token="))?.split("=")[1];
        if (token) {
          const { data: session } = await sb.from("user_sessions").select("*").eq("token", token).maybeSingle();
          const uid = session?.user_id || session?.employee_id;
          if (uid) {
            const { data } = await sb.from("users").select("*").eq("id", uid).maybeSingle();
            if (data) userData = data as UserProfile;
          }
        }
      }

      if (!userData) {
        const debugInfo = `Email in storage: ${localStorage.getItem("userEmail") || "none"}, Cookie: ${document.cookie.includes("session_token") ? "yes" : "no"}`;
        setError(`Could not find your profile. ${debugInfo}. Try logging out and back in.`);
        setLoading(false); return;
      }

      setUser(userData);
      if (userData.email) localStorage.setItem("userEmail", userData.email);

      const { data: empData } = await sb.from("employees")
        .select("id, full_name, department, designation, gross_salary, onboarding_completed, employee_code, date_of_joining")
        .eq("email", userData.email).maybeSingle();
      if (empData) setEmp(empData as EmpRecord);

      const orgId = userData.org_id || localStorage.getItem("activeOrgId") || "";
      if (orgId) {
        const { data: orgData } = await sb.from("organizations").select("id, name, industry, city, state").eq("id", orgId).maybeSingle();
        if (orgData) { setOrg(orgData as OrgInfo); localStorage.setItem("activeOrgId", orgData.id); localStorage.setItem("activeOrgName", orgData.name); }
        // Expense categories for the claim modal
        const { data: cats } = await sb.from("expense_categories").select("id, name, icon, color").eq("org_id", orgId).order("name");
        setExpCategories((cats || []) as ExpCategory[]);
        // Expense heads (hierarchical)
        const { data: hds } = await sb.from("expense_heads").select("id, name, parent_id").eq("org_id", orgId).eq("active", true).order("name");
        setHeads((hds || []) as Head[]);
      }

      const empId = empData?.id;
      if (!empId) { setLoading(false); return; }

      // Today's attendance — capture id + check_out for the quick-punch card
      const { data: todayAtt } = await sb.from("attendance").select("id, check_in, check_out, status")
        .eq("employee_id", empId).eq("date", todayStr).maybeSingle();
      if (todayAtt && todayAtt.check_in) {
        setCheckedIn(true);
        setTodayAttId(todayAtt.id);
        setCheckInTime(new Date(todayAtt.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
        if (todayAtt.check_out) setCheckedOutTime(new Date(todayAtt.check_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
      }

      // This month attendance
      const monthStart = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
      const monthEnd = `${yearNum}-${String(monthNum).padStart(2, "0")}-31`;
      const { data: monthAtt } = await sb.from("attendance").select("date, status")
        .eq("employee_id", empId).gte("date", monthStart).lte("date", monthEnd);
      const presentDays = (monthAtt || []).filter(a => ["present", "late", "wfh", "half_day"].includes(a.status)).length;
      const workDays = (() => { let d = 0; const s = new Date(monthStart); const e = new Date(Math.min(now.getTime(), new Date(monthEnd).getTime())); while (s <= e) { if (s.getDay() > 0 && s.getDay() < 6) d++; s.setDate(s.getDate() + 1); } return d; })();
      setMonthAttendance({ present: presentDays, total: workDays });

      // This week attendance (Mon-Sat)
      const weekMap: Record<number, string> = {};
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek + 1);
      for (let i = 0; i < 6; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        const ds = d.toISOString().split("T")[0];
        const att = (monthAtt || []).find(a => a.date === ds);
        if (att) weekMap[i + 1] = att.status;
        else if (d < now) weekMap[i + 1] = d.getDay() === 0 ? "weekend" : "absent";
      }
      setWeekAttendance(weekMap);

      // Latest payslip
      const { data: payslip } = await sb.from("payslips").select("net_payable, gross_earned, month, year")
        .eq("employee_id", empId).order("year", { ascending: false }).order("month", { ascending: false }).limit(1).maybeSingle();
      if (payslip) setLatestPayslip(payslip);

      // Leave balances (from policy engine) — source of truth
      const { data: bals } = await sb.from("leave_balances")
        .select("leave_type, total, used, remaining").eq("employee_id", empId).eq("year", yearNum);
      setBalances((bals || []) as Balance[]);
      const taken = (bals || []).reduce((s, b) => s + (Number(b.used) || 0), 0);
      setLeavesTaken(taken);

      // Pending = approval_requests of type leave still pending for this user
      const { data: pendReqs } = await sb.from("approval_requests")
        .select("id").eq("raised_by", userData.id).eq("type", "leave").eq("status", "pending");
      setPendingLeaves((pendReqs || []).length);

    } catch (err: any) { setError(err.message || "Failed to load profile"); }
    finally { setLoading(false); }
  }, [sb, todayStr, monthNum, yearNum]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleLogout = () => { document.cookie = "session_token=; path=/; max-age=0"; localStorage.clear(); router.push("/employee-login"); };

  const handleCheckIn = async () => {
    if (!emp) return;
    // Fetch offices for geofencing
    const { data: locs } = await sb.from("org_locations")
      .select("id, name, latitude, longitude, geofence_radius_m").eq("org_id", user?.org_id || "");
    const geo = await captureAndEvaluate((locs || []) as any);
    const { data: inserted, error: err } = await sb.from("attendance").insert({
      employee_id: emp.id, org_id: user?.org_id, date: todayStr,
      check_in: new Date().toISOString(), status: "present", source: "web",
      latitude: geo.coords?.latitude ?? null, longitude: geo.coords?.longitude ?? null,
      geo_flagged: geo.geo_flagged, distance_m: geo.distance_m,
    }).select("id").maybeSingle();
    if (!err) {
      setCheckedIn(true);
      if (inserted?.id) setTodayAttId(inserted.id);
      setCheckInTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
      setMonthAttendance(p => ({ ...p, present: p.present + 1 }));
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttId) return;
    const { data: locs } = await sb.from("org_locations")
      .select("id, name, latitude, longitude, geofence_radius_m").eq("org_id", user?.org_id || "");
    const geo = await captureAndEvaluate((locs || []) as any);
    const { error } = await sb.from("attendance").update({
      check_out: new Date().toISOString(),
      check_out_latitude: geo.coords?.latitude ?? null,
      check_out_longitude: geo.coords?.longitude ?? null,
    }).eq("id", todayAttId);
    if (!error) setCheckedOutTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /><p className="text-sm text-gray-400 font-medium">Loading dashboard...</p></div>
    </div>
  );

  if (!user) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-red-400" /></div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Profile not found</h2>
        <p className="text-sm text-gray-500 mb-6">{error || "Could not load your profile."}</p>
        <button onClick={handleLogout} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 mx-auto"><LogOut className="w-4 h-4" />Logout & retry</button>
      </div>
    </div>
  );

  const name = emp?.full_name || user.full_name || user.email.split("@")[0];
  const onboarded = emp?.onboarding_completed === true;
  const balRemaining = (b: Balance) => Number(b.remaining ?? ((b.total || 0) - (b.used || 0))) || 0;
  const totalLeave = balances.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const leaveBalance = balances.reduce((s, b) => s + balRemaining(b), 0);
  const fmtSalary = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
  const balColors = ["bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500"];

  return (
    <>
    <div className="max-w-6xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {greetIcon()}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{greet()}, {name.split(" ")[0]}</h1>
            <p className="text-xs text-gray-400">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <Av name={name} size={38} />
      </div>
        {/* Onboard banner — only if NOT onboarded */}
        {showOnboard && !onboarded && (
          <div className="mb-6 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-200/30">
            <button onClick={() => setShowOnboard(false)} className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-indigo-200" /><h2 className="text-base font-bold">Complete your profile</h2></div>
            <p className="text-indigo-200 text-sm mb-4 max-w-lg">Fill in your employment details, bank info, and compliance data.</p>
            <div className="flex items-center gap-3">
              <a href="/onboard/self" className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-50 shadow-md"><UserPlus className="w-4 h-4" />Complete Onboarding</a>
              <button onClick={() => setShowOnboard(false)} className="px-4 py-2.5 text-white/70 hover:text-white text-sm font-medium">Skip for now</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* LEFT (9 cols) */}
          <div className="col-span-12 xl:col-span-9 space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today's status", value: checkedIn ? "Checked in" : "Not checked in", sub: checkedIn ? `Since ${checkInTime}` : "Mark attendance", icon: <Clock className="w-5 h-5" />, iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
                { label: "Leave balance", value: leaveBalance.toString(), sub: totalLeave > 0 ? `${leavesTaken} used of ${totalLeave}` : "Not allocated", icon: <CalendarDays className="w-5 h-5" />, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
                { label: "This month", value: `${monthAttendance.present}/${monthAttendance.total}`, sub: "Days attended", icon: <TrendingUp className="w-5 h-5" />, iconBg: "bg-violet-50", iconColor: "text-violet-500" },
                { label: "Pending requests", value: pendingLeaves.toString(), sub: pendingLeaves > 0 ? "Awaiting approval" : "All caught up", icon: <FileText className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{c.label}</span>
                    <div className={`w-9 h-9 ${c.iconBg} rounded-xl flex items-center justify-center ${c.iconColor}`}>{c.icon}</div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Attendance + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Check-in */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 text-sm">Today&apos;s attendance</h3>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live</span>
                </div>
                {checkedIn ? (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-7 h-7 text-emerald-500" /></div>
                    <p className="text-sm font-bold text-gray-900 mb-0.5">Checked in at {checkInTime}</p>
                    {checkedOutTime ? (
                      <p className="text-xs text-gray-400">Checked out at {checkedOutTime}</p>
                    ) : (
                      <button onClick={handleCheckOut} className="mt-3 w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm rounded-xl hover:from-indigo-600 hover:to-violet-600 transition flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4" />Check out
                      </button>
                    )}
                    <a href="/my-attendance" className="mt-2 inline-block text-xs text-indigo-500 font-semibold hover:text-indigo-700">View full attendance →</a>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-4">You haven&apos;t checked in yet today</p>
                    <button onClick={handleCheckIn} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-md shadow-emerald-200/40 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />Check In Now
                    </button>
                    <a href="/my-attendance" className="mt-3 inline-block text-xs text-indigo-500 font-semibold hover:text-indigo-700">View full attendance →</a>
                  </div>
                )}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-3">This week</p>
                  <div className="flex gap-2">
                    {["M","T","W","T","F","S"].map((d, i) => {
                      const dayIdx = i + 1;
                      const todayDow = now.getDay() === 0 ? 7 : now.getDay();
                      const isToday = dayIdx === todayDow;
                      const status = weekAttendance[dayIdx];
                      const isPast = dayIdx < todayDow;
                      const isPresent = status && ["present","late","wfh","half_day"].includes(status);
                      return (
                        <div key={d + i} className={`flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                          ${isToday ? (checkedIn ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-600 ring-2 ring-amber-300")
                            : isPresent ? "bg-emerald-100 text-emerald-600"
                            : isPast ? "bg-red-100 text-red-400" : "bg-gray-100 text-gray-400"}`}>{d}</div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Quick actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Apply leave", icon: <CalendarDays className="w-4 h-4" />, color: "bg-blue-50 text-blue-600 border-blue-100", action: () => setShowLeaveModal(true) },
                    { label: "View payslips", icon: <Wallet className="w-4 h-4" />, color: "bg-violet-50 text-violet-600 border-violet-100", action: () => {} },
                    { label: "My approvals", icon: <FileText className="w-4 h-4" />, color: "bg-amber-50 text-amber-600 border-amber-100", action: () => window.location.href = "/approvals" },
                    { label: "Raise a ticket", icon: <MessageSquare className="w-4 h-4" />, color: "bg-rose-50 text-rose-600 border-rose-100", action: () => window.location.href = "/approvals" },
                    { label: "Claim reimbursement", icon: <Receipt className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600 border-emerald-100", action: () => setShowExpenseModal(true) },
                  ].map(a => (
                    <button key={a.label} onClick={a.action} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium hover:shadow-sm transition ${a.color}`}>{a.icon}{a.label}</button>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500">Upcoming holidays</span>
                    <a href="#" className="text-xs text-indigo-500 font-semibold flex items-center gap-1">View all<ArrowRight className="w-3 h-3" /></a>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-orange-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <div className="flex-1"><p className="text-xs font-semibold text-gray-800">Independence Day</p><p className="text-[10px] text-gray-400">15 Aug {yearNum}</p></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payslip card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm">
                  Latest payslip — {latestPayslip ? `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][latestPayslip.month]} ${latestPayslip.year}` : `${monthName} ${yearNum}`}
                </h3>
                {latestPayslip && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">Paid</span>}
              </div>
              {latestPayslip ? (
                <>
                  <div className="flex items-end gap-4 mb-4">
                    <span className="text-3xl font-bold text-gray-900">{fmtSalary(latestPayslip.net_payable)}</span>
                    <span className="text-sm text-gray-400 pb-1">Net pay</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-600 transition shadow-md shadow-indigo-200/40">
                    <Wallet className="w-4 h-4" />Download payslip
                  </button>
                </>
              ) : (
                <div className="text-center py-6">
                  <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No payslips generated yet</p>
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 text-sm">Recent activity</h3>
                <button className="text-xs font-semibold text-indigo-500 flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-4">
                {[
                  checkedIn && { icon: <Clock className="w-4 h-4" />, bg: "bg-emerald-50", color: "text-emerald-500", text: `Checked in today at ${checkInTime}`, time: "Today" },
                  latestPayslip && { icon: <Wallet className="w-4 h-4" />, bg: "bg-violet-50", color: "text-violet-500", text: `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][latestPayslip.month]} payslip — ${fmtSalary(latestPayslip.net_payable)}`, time: "Recent" },
                  onboarded && { icon: <Award className="w-4 h-4" />, bg: "bg-amber-50", color: "text-amber-500", text: "Profile onboarding completed", time: "Done" },
                ].filter(Boolean).map((a: any, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-8 h-8 ${a.bg} rounded-lg flex items-center justify-center ${a.color} flex-shrink-0`}>{a.icon}</div>
                    <p className="flex-1 text-sm text-gray-700">{a.text}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
                  </div>
                ))}
                {!checkedIn && !latestPayslip && !onboarded && (
                  <div className="text-center py-4 text-sm text-gray-400">No activity yet</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT (3 cols) */}
          <div className="col-span-12 xl:col-span-3 space-y-6">
            {/* Profile */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex flex-col items-center text-center pb-5 border-b border-gray-100 mb-4">
                <div className="relative mb-3"><Av name={name} size={72} /><div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-400 border-2 border-white rounded-full" /></div>
                <h3 className="text-base font-bold text-gray-900">{name}</h3>
                {emp?.designation && <p className="text-sm text-indigo-500 font-medium">{emp.designation}</p>}
                {!emp?.designation && user.role && <p className="text-sm text-indigo-500 font-medium">{user.role}</p>}
                {org && <p className="text-xs text-gray-400 mt-0.5">{org.name}</p>}
                {emp?.department && <p className="text-xs text-gray-400">{emp.department}</p>}
              </div>
              <div className="space-y-3">
                {[
                  { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: user.email },
                  { icon: <Phone className="w-3.5 h-3.5" />, label: "Phone", value: user.phone },
                  { icon: <Briefcase className="w-3.5 h-3.5" />, label: "Org", value: org?.name },
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: "Location", value: org ? [org.city, org.state].filter(Boolean).join(", ") : null },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400">{r.icon}</div>
                    <div className="flex-1 min-w-0"><p className="text-[10px] text-gray-400 uppercase tracking-wide">{r.label}</p><p className="text-sm text-gray-700 font-medium truncate">{r.value}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave balance — from leave_balances */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-4 h-4 text-gray-400" /><h3 className="font-bold text-gray-900 text-sm">Leave balance</h3></div>
              <div className="space-y-3.5">
                {balances.length === 0 && <p className="text-xs text-gray-400">No leave balances allocated yet. Ask your HR/admin to allocate.</p>}
                {balances.map((b, i) => {
                  const total = Number(b.total) || 0;
                  const remaining = balRemaining(b);
                  return (
                    <div key={b.leave_type + i}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-500">{b.leave_type}</span><span className="text-xs font-bold text-gray-700">{remaining}/{total}</span></div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${balColors[i % balColors.length]} rounded-full`} style={{ width: `${total > 0 ? (remaining / total) * 100 : 0}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Month at a glance */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-gray-400" /><h3 className="font-bold text-gray-900 text-sm">{monthName} at a glance</h3></div>
              <div className="space-y-3.5">
                {[
                  { label: "Days attended", value: `${monthAttendance.present}/${monthAttendance.total}`, color: "text-emerald-500" },
                  { label: "Leaves taken", value: leavesTaken.toString(), color: "text-blue-500" },
                  { label: "Pending requests", value: pendingLeaves.toString(), color: pendingLeaves > 0 ? "text-amber-500" : "text-emerald-500" },
                  { label: "Payslip status", value: latestPayslip ? "Paid" : "Pending", color: latestPayslip ? "text-emerald-500" : "text-amber-500" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{r.label}</span><span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Announcements</h3>
              <div className="text-center py-4"><div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2"><Bell className="w-5 h-5 text-gray-300" /></div><p className="text-xs text-gray-400">No announcements yet</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="text-base font-bold text-gray-900">Apply for leave</h2><p className="text-xs text-gray-400">Your manager will be notified</p></div>
              <button onClick={() => setShowLeaveModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {leaveError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{leaveError}</div>}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Leave type</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Casual Leave", "Sick Leave", "Earned Leave", "Work From Home", "Comp Off", "Half Day"].map(t => (
                    <button key={t} onClick={() => setLeaveType(t)}
                      className={`px-2.5 py-2 rounded-xl border text-xs font-medium transition ${leaveType === t ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-100" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                      {t.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From date *</label>
                  <input type="date" value={leaveFrom} onChange={e => { setLeaveFrom(e.target.value); if (!leaveTo) setLeaveTo(e.target.value); }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To date *</label>
                  <input type="date" value={leaveTo} onChange={e => setLeaveTo(e.target.value)} min={leaveFrom}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              {leaveDays > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-sm text-indigo-700 font-medium">{leaveType}</span>
                  <span className="text-lg font-bold text-indigo-900">{leaveDays} day{leaveDays > 1 ? "s" : ""}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason</label>
                <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} rows={2}
                  placeholder="Optional — family event, medical, etc."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleApplyLeave} disabled={leaveSaving}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {leaveSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Reimbursement Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div><h2 className="text-base font-bold text-gray-900">Claim reimbursement</h2><p className="text-xs text-gray-400">Routed to your manager for approval</p></div>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {expError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{expError}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
                <input value={expForm.title} onChange={e => setExpForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Cab to client office"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₹) *</label>
                  <input type="number" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} placeholder="500"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                  <input type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
              {expCategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {expCategories.map(c => (
                      <button key={c.id} onClick={() => setExpForm(p => ({ ...p, category_id: p.category_id === c.id ? "" : c.id }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${expForm.category_id === c.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {c.icon} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <HeadSelect heads={heads} value={expForm.head_id} onChange={id => setExpForm(p => ({ ...p, head_id: id }))}
                orgId={user?.org_id || localStorage.getItem("activeOrgId") || ""} onHeadsChange={setHeads} />
              <p className="text-[11px] text-gray-400 -mt-2">Head is optional — your approver can assign it during approval.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Spent via</label>
                  <select value={expForm.payment_method} onChange={e => setExpForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                    {["cash", "card", "upi", "bank_transfer"].map(m => <option key={m} value={m}>{m.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vendor</label>
                  <input value={expForm.vendor} onChange={e => setExpForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Optional"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Add details…"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setShowExpenseModal(false)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleClaimExpense} disabled={expSaving}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {expSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}Submit claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="w-4 h-4" />{toast.msg}
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5 opacity-50" /></button>
        </div>
      )}
    </>
  );
}