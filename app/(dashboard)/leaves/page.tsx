"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format, isAfter, isBefore, startOfDay } from "date-fns";

import { cn } from "@/lib/utils";
import {
  CalendarDays, Calendar, Plus, Check, X, Clock, ChevronDown,
  Loader2, AlertCircle, CheckCircle2, RefreshCw,
  Users, Coffee, Umbrella, Heart, Baby, Ban,
  Search,
} from "lucide-react";

// ─── Supabase ─────────────────────────────────────────────────────────────────
function useSupabase() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type LeaveType = "casual" | "sick" | "earned" | "maternity" | "paternity" | "unpaid";
type LeaveStatus = "pending" | "approved" | "rejected";

interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
  department: string | null;
}

interface Leave {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approved_at: string | null;
  created_at: string;
  employee?: Employee;
}

interface LeaveBalance {
  employee_id: string;
  employee: Employee;
  casual: number;
  sick: number;
  earned: number;
  casual_used: number;
  sick_used: number;
  earned_used: number;
}

// ─── Leave config ─────────────────────────────────────────────────────────────
const LEAVE_CONFIG: Record<LeaveType, {
  label: string; icon: React.ReactNode;
  bg: string; text: string; border: string; annual: number;
}> = {
  casual:    { label:"Casual leave",    icon:<Coffee className="w-4 h-4"/>,   bg:"bg-blue-100",   text:"text-blue-700",   border:"border-blue-200",   annual:12 },
  sick:      { label:"Sick leave",      icon:<Heart className="w-4 h-4"/>,    bg:"bg-red-100",    text:"text-red-600",    border:"border-red-200",    annual:12 },
  earned:    { label:"Earned leave",    icon:<CalendarDays className="w-4 h-4"/>, bg:"bg-emerald-100",text:"text-emerald-700",border:"border-emerald-200",annual:15 },
  maternity: { label:"Maternity leave", icon:<Baby className="w-4 h-4"/>,     bg:"bg-pink-100",   text:"text-pink-700",   border:"border-pink-200",   annual:180 },
  paternity: { label:"Paternity leave", icon:<Baby className="w-4 h-4"/>,     bg:"bg-purple-100", text:"text-purple-700", border:"border-purple-200", annual:15 },
  unpaid:    { label:"Unpaid leave",    icon:<Ban className="w-4 h-4"/>,      bg:"bg-gray-100",   text:"text-gray-600",   border:"border-gray-200",   annual:999 },
};

const STATUS_CONFIG: Record<LeaveStatus, { bg: string; text: string; border: string; label: string }> = {
  pending:  { bg:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-200",  label:"Pending" },
  approved: { bg:"bg-emerald-100",text:"text-emerald-700",border:"border-emerald-200",label:"Approved" },
  rejected: { bg:"bg-red-100",    text:"text-red-600",    border:"border-red-200",    label:"Rejected" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short" });

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const f = new Date(from), t = new Date(to);
  if (t < f) return 0;
  let days = 0;
  const d = new Date(f);
  while (d <= t) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
}
function avatarColor(name: string) {
  const c = ["bg-indigo-100 text-indigo-700","bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-purple-100 text-purple-700"];
  return c[name.charCodeAt(0) % c.length];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message:string; type:"success"|"error"; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
      ${type==="success"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-red-50 border-red-200 text-red-800"}`}>
      {type==="success"?<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>:<AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>}
      {message}
      <button onClick={onClose}><X className="w-3.5 h-3.5 opacity-50 hover:opacity-100"/></button>
    </div>
  );
}

// ─── Request Leave Modal ──────────────────────────────────────────────────────
function RequestLeaveModal({
  employees,
  onSave,
  onClose,
  orgId,
}: {
  employees: Employee[];
  onSave: (leave: Leave) => void;
  onClose: () => void;
  orgId: string;
}) {
  const supabase = useSupabase();
  const [empId, setEmpId] = useState(employees[0]?.id ?? "");
  const [leaveType, setLeaveType] = useState<LeaveType>("casual");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  const fromDateStr = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
  const toDateStr   = toDate   ? format(toDate,   "yyyy-MM-dd") : "";
  const days = useMemo(() => calcDays(fromDateStr, toDateStr), [fromDateStr, toDateStr]);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!empId) e.empId = "Select an employee";
    if (!fromDate) e.fromDate = "From date is required";
    if (!toDate) e.toDate = "To date is required";
    if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) e.toDate = "To date must be after from date";
    if (days === 0) e.toDate = "No working days in selected range";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("leaves")
        .insert({
          org_id: orgId,
          employee_id: empId,
          leave_type: leaveType,
          from_date: fromDateStr,
          to_date: toDateStr,
          days,
          reason: reason || null,
          status: "pending",
        })
        .select(`*, employee:employees(id, full_name, employee_code, department)`)
        .single();
      if (error) throw error;
      onSave(data as Leave);
    } catch (err: unknown) {
      setErrors({ empId: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Request leave</h2>
            <p className="text-xs text-gray-400 mt-0.5">Working days only (excludes weekends)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500"/></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Employee */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={empId} onChange={e => setEmpId(e.target.value)}
                className={`w-full pl-3 pr-8 py-2 text-sm border rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200 ${errors.empId?"border-red-300":"border-gray-200"}`}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.employee_code?` (${e.employee_code})`:""}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
            </div>
            {errors.empId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.empId}</p>}
          </div>

          {/* Leave type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Leave type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(LEAVE_CONFIG) as [LeaveType, typeof LEAVE_CONFIG[LeaveType]][]).slice(0, 6).map(([key, cfg]) => (
                <button key={key} onClick={() => setLeaveType(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all
                    ${leaveType === key ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-indigo-200` : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                  {cfg.icon}<span className="truncate">{cfg.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates — shadcn date picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">From date <span className="text-red-500">*</span></label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                <input
                  type="date"
                  value={fromDateStr}
                  onChange={e => {
                    const d = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                    setFromDate(d);
                    if (!toDate && d) setToDate(d);
                  }}
                  className={cn(
                    "w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors",
                    errors.fromDate ? "border-red-300 focus:ring-red-200" : "border-gray-200",
                    !fromDate && "text-gray-400"
                  )}
                />
              </div>
              {errors.fromDate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.fromDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">To date <span className="text-red-500">*</span></label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                <input
                  type="date"
                  value={toDateStr}
                  min={fromDateStr}
                  onChange={e => {
                    const d = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                    setToDate(d);
                  }}
                  className={cn(
                    "w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors",
                    errors.toDate ? "border-red-300 focus:ring-red-200" : "border-gray-200",
                    !toDate && "text-gray-400"
                  )}
                />
              </div>
              {errors.toDate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.toDate}</p>}
            </div>
          </div>

          {/* Days preview */}
          {days > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-sm text-indigo-700 font-medium">Working days</span>
              <span className="text-lg font-bold text-indigo-900">{days} day{days !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="e.g. Medical appointment, family function..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"/>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving...</> : <><Plus className="w-4 h-4"/>Submit request</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Leave Balance Card ───────────────────────────────────────────────────────
function LeaveBalanceCard({ balance }: { balance: LeaveBalance }) {
  const types: { key: keyof LeaveBalance; label: string; annual: number; color: string }[] = [
    { key: "casual",  label: "Casual",  annual: 12, color: "bg-blue-500" },
    { key: "sick",    label: "Sick",    annual: 12, color: "bg-red-500"  },
    { key: "earned",  label: "Earned",  annual: 15, color: "bg-emerald-500" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(balance.employee.full_name)}`}>
          {getInitials(balance.employee.full_name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{balance.employee.full_name}</p>
          <p className="text-xs text-gray-400">{balance.employee.department || balance.employee.employee_code || ""}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {types.map(t => {
          const used = balance[`${t.key}_used` as keyof LeaveBalance] as number;
          const available = Math.max(0, t.annual - used);
          const pct = Math.min(100, Math.round((used / t.annual) * 100));
          return (
            <div key={t.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">{t.label}</span>
                <span className="text-xs font-semibold text-gray-800">{available} left <span className="text-gray-400 font-normal">/ {t.annual}</span></span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${t.color} rounded-full transition-all`} style={{ width: `${pct}%` }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeavesPage() {
  const supabase = useSupabase();

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<"requests"|"balance">("requests");
  const [statusFilter, setStatusFilter] = useState<"all"|LeaveStatus>("pending");
  const [typeFilter, setTypeFilter] = useState<"all"|LeaveType>("all");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{message:string;type:"success"|"error"}|null>(null);
  const [actionLoading, setActionLoading] = useState<string|null>(null);

  // ── Resolve org ──────────────────────────────────────────────────────────────
  const resolveOrg = useCallback(async (): Promise<string> => {
    if (orgId) return orgId;
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("activeOrgId");
      if (s) { setOrgId(s); return s; }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: ud } = await supabase.from("users").select("org_id").eq("id", user.id).maybeSingle();
      if (ud?.org_id) { setOrgId(ud.org_id); return ud.org_id; }
    }
    const { data: f } = await supabase.from("organizations").select("id").order("created_at").limit(1).maybeSingle();
    if (f?.id) { setOrgId(f.id); return f.id; }
    return "";
  }, [orgId, supabase]);

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const oid = await resolveOrg();
      if (!oid) { setLoading(false); return; }

      const [{ data: leavesData }, { data: empsData }] = await Promise.all([
        supabase.from("leaves")
          .select(`*, employee:employees(id, full_name, employee_code, department)`)
          .eq("org_id", oid)
          .order("created_at", { ascending: false }),
        supabase.from("employees")
          .select("id, full_name, employee_code, department")
          .eq("org_id", oid)
          .eq("status", "active")
          .order("full_name"),
      ]);

      const emps = (empsData ?? []) as Employee[];
      const allLeaves = (leavesData ?? []) as Leave[];

      setEmployees(emps);
      setLeaves(allLeaves);

      // Build leave balances
      const year = new Date().getFullYear();
      const yearLeaves = allLeaves.filter(l =>
        l.status === "approved" &&
        new Date(l.from_date).getFullYear() === year
      );

      const bals: LeaveBalance[] = emps.map(emp => {
        const empLeaves = yearLeaves.filter(l => l.employee_id === emp.id);
        return {
          employee_id: emp.id,
          employee: emp,
          casual: 12,
          sick: 12,
          earned: 15,
          casual_used: empLeaves.filter(l=>l.leave_type==="casual").reduce((a,l)=>a+l.days,0),
          sick_used: empLeaves.filter(l=>l.leave_type==="sick").reduce((a,l)=>a+l.days,0),
          earned_used: empLeaves.filter(l=>l.leave_type==="earned").reduce((a,l)=>a+l.days,0),
        };
      });
      setBalances(bals);
    } catch (err) {
      console.error(err);
      setToast({message:"Failed to load leaves",type:"error"});
    } finally {
      setLoading(false);
    }
  }, [resolveOrg, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const h = () => { setOrgId(""); };
    window.addEventListener("orgSwitch", h);
    return () => window.removeEventListener("orgSwitch", h);
  }, []);

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase.channel(`leaves:${orgId}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"leaves", filter:`org_id=eq.${orgId}` },
        () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, supabase, fetchData]);

  // ── Approve / Reject ─────────────────────────────────────────────────────────
  const handleAction = async (leaveId: string, action: "approved"|"rejected") => {
    setActionLoading(leaveId + action);
    try {
      const { error } = await supabase.from("leaves").update({
        status: action,
        approved_at: new Date().toISOString(),
      }).eq("id", leaveId);
      if (error) throw error;
      setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: action, approved_at: new Date().toISOString() } : l));
      setToast({ message: `Leave ${action}`, type: "success" });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Action failed", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filtered leaves ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => leaves.filter(l => {
    const name = l.employee?.full_name?.toLowerCase() ?? "";
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchType = typeFilter === "all" || l.leave_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  }), [leaves, search, statusFilter, typeFilter]);

  const pendingCount = leaves.filter(l => l.status === "pending").length;

  const stats = [
    { label:"Pending approval", value:leaves.filter(l=>l.status==="pending").length, color:"text-amber-600", bg:"bg-amber-50", icon:<Clock className="w-4 h-4"/> },
    { label:"Approved this month", value:leaves.filter(l=>l.status==="approved"&&new Date(l.from_date).getMonth()===new Date().getMonth()).length, color:"text-emerald-600", bg:"bg-emerald-50", icon:<CheckCircle2 className="w-4 h-4"/> },
    { label:"On leave today", value:(() => { const t=new Date().toISOString().split("T")[0]; return leaves.filter(l=>l.status==="approved"&&l.from_date<=t&&l.to_date>=t).length; })(), color:"text-indigo-600", bg:"bg-indigo-50", icon:<Users className="w-4 h-4"/> },
    { label:"Total this year", value:leaves.filter(l=>new Date(l.from_date).getFullYear()===new Date().getFullYear()).length, color:"text-blue-600", bg:"bg-blue-50", icon:<CalendarDays className="w-4 h-4"/> },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Leaves</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>}
            {pendingCount > 0 ? `${pendingCount} pending approval` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500"/>
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b] transition-colors">
            <Plus className="w-4 h-4"/>Request leave
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[["requests","Leave requests"],["balance","Leave balance"]].map(([key,label])=>(
          <button key={key} onClick={()=>setView(key as "requests"|"balance")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view===key?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Requests view */}
      {view === "requests" && (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
            </div>

            <div className="relative">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}
                className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-600">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
            </div>

            <div className="relative">
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as typeof typeFilter)}
                className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-600">
                <option value="all">All types</option>
                {Object.entries(LEAVE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
            </div>

            {(search||statusFilter!=="all"||typeFilter!=="all") && (
              <button onClick={()=>{setSearch("");setStatusFilter("pending");setTypeFilter("all");}}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-3.5 h-3.5"/>Clear
              </button>
            )}
          </div>

          {/* Requests list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin"/>
                <span className="text-sm text-gray-500">Loading leave requests...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Umbrella className="w-8 h-8 text-gray-300"/>
                <p className="text-sm text-gray-500">
                  {leaves.length === 0 ? "No leave requests yet" : "No requests match your filters"}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {filtered.map(leave => {
                    const lc = LEAVE_CONFIG[leave.leave_type];
                    const sc = STATUS_CONFIG[leave.status];
                    const isLoading = actionLoading?.startsWith(leave.id);
                    return (
                      <div key={leave.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        {/* Employee avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(leave.employee?.full_name ?? "")}`}>
                          {getInitials(leave.employee?.full_name ?? "?")}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{leave.employee?.full_name}</p>
                              <p className="text-xs text-gray-400">{leave.employee?.department} {leave.employee?.employee_code ? `· ${leave.employee.employee_code}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${lc.bg} ${lc.text} ${lc.border} flex items-center gap-1`}>
                                {lc.icon}<span>{lc.label}</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                {sc.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-gray-400"/>
                              {fmtShort(leave.from_date)}{leave.from_date !== leave.to_date ? ` – ${fmtShort(leave.to_date)}` : ""}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                              {leave.days} day{leave.days !== 1 ? "s" : ""}
                            </span>
                            {leave.reason && (
                              <span className="text-xs text-gray-400 italic truncate max-w-[200px]">"{leave.reason}"</span>
                            )}
                          </div>

                          <p className="text-xs text-gray-400 mt-1">
                            Requested {fmtDate(leave.created_at)}
                            {leave.approved_at ? ` · ${leave.status === "approved" ? "Approved" : "Rejected"} ${fmtDate(leave.approved_at)}` : ""}
                          </p>
                        </div>

                        {/* Actions */}
                        {leave.status === "pending" && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleAction(leave.id, "approved")}
                              disabled={!!isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === leave.id+"approved"
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                : <Check className="w-3.5 h-3.5"/>}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(leave.id, "rejected")}
                              disabled={!!isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === leave.id+"rejected"
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                : <X className="w-3.5 h-3.5"/>}
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Showing {filtered.length} of {leaves.length} requests</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Balance view */}
      {view === "balance" && (
        <div className="flex flex-col gap-4">
          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Annual entitlements</p>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(LEAVE_CONFIG).map(([key, cfg]) => (
                <div key={key} className={`px-3 py-2 rounded-xl border text-center ${cfg.bg} ${cfg.border}`}>
                  <div className={`flex items-center justify-center mb-1 ${cfg.text}`}>{cfg.icon}</div>
                  <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label.split(" ")[0]}</p>
                  <p className={`text-lg font-bold ${cfg.text}`}>{cfg.annual > 100 ? cfg.annual+"d" : cfg.annual}</p>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin"/>
              <span className="text-sm text-gray-500">Loading balances...</span>
            </div>
          ) : balances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users className="w-8 h-8 text-gray-300"/>
              <p className="text-sm text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {balances.map(b => <LeaveBalanceCard key={b.employee_id} balance={b}/>)}
            </div>
          )}
        </div>
      )}

      {/* Request modal */}
      {showModal && orgId && (
        <RequestLeaveModal
          employees={employees}
          orgId={orgId}
          onSave={leave => {
            setLeaves(p => [leave, ...p]);
            setShowModal(false);
            setToast({ message: `Leave request submitted for ${leave.employee?.full_name}`, type: "success" });
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  );
}