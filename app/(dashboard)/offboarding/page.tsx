"use client";
// Route: app/(dashboard)/offboarding/page.tsx
// HRMS Offboarding / Separation module
// Features: initiate separation, exit checklist, clearance workflow,
// exit interview, final settlement, status tracking, former employees

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Search, X, Loader2, CheckCircle2, AlertCircle,
  UserMinus, Users, Clock, IndianRupee, ArrowRight,
  Shield, Laptop, Building2, Wallet,
  Save, Ban,
  CalendarDays, CheckCheck,
  RefreshCw,
} from "lucide-react";

function useSB() {
  return useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );
}

async function getOrgId(sb: any): Promise<string> {
  // 1. Try localStorage
  let oid =
    typeof window !== "undefined"
      ? localStorage.getItem("activeOrgId") || ""
      : "";
  if (oid) return oid;
  // 2. Fallback: get from users table via email
  const email =
    typeof window !== "undefined"
      ? localStorage.getItem("userEmail") || ""
      : "";
  if (email) {
    const { data } = await sb
      .from("users")
      .select("org_id")
      .eq("email", email)
      .maybeSingle();
    if (data?.org_id) {
      oid = data.org_id;
      localStorage.setItem("activeOrgId", oid);
      return oid;
    }
  }
  // 3. Last resort: first org
  const { data: firstOrg } = await sb.from("organizations").select("id").limit(1).maybeSingle();
  if (firstOrg?.id) {
    oid = firstOrg.id;
    localStorage.setItem("activeOrgId", oid);
    return oid;
  }
  return "";
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
}

interface Offboarding {
  id: string;
  org_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  separation_type: string;
  reason: string | null;
  initiated_by: string | null;
  initiated_date: string;
  last_working_date: string | null;
  notice_period_days: number;
  notice_served_days: number;
  status: string;
  checklist: ChecklistItem[];
  exit_interview: ExitInterview | null;
  settlement: Settlement | null;
  notes: string | null;
  created_at: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  assignee: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

interface ExitInterview {
  conducted_by: string;
  conducted_date: string;
  reason_for_leaving: string;
  experience_rating: number;
  management_rating: number;
  culture_rating: number;
  would_recommend: boolean;
  feedback: string;
  suggestions: string;
  rehire_eligible: boolean;
}

interface Settlement {
  pending_salary: number;
  leave_encashment: number;
  gratuity: number;
  bonus: number;
  notice_recovery: number;
  asset_recovery: number;
  other_deductions: number;
  total_payable: number;
  status: string;
  processed_date: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const SEP_TYPES = [
  { v: "resignation", l: "Resignation" },
  { v: "termination", l: "Termination" },
  { v: "retirement", l: "Retirement" },
  { v: "contract_end", l: "Contract end" },
  { v: "absconding", l: "Absconding" },
  { v: "mutual", l: "Mutual separation" },
];

const STATUSES = [
  "initiated",
  "checklist",
  "exit_interview",
  "settlement",
  "completed",
  "cancelled",
];

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-700",
  checklist: "bg-amber-100 text-amber-700",
  exit_interview: "bg-violet-100 text-violet-700",
  settlement: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  initiated: "Initiated",
  checklist: "Checklist pending",
  exit_interview: "Exit interview",
  settlement: "Settlement",
  completed: "Completed",
  cancelled: "Cancelled",
};

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "id" | "completed" | "completed_at">[] = [
  { category: "IT", task: "Return laptop / desktop", assignee: "IT Admin", notes: null },
  { category: "IT", task: "Revoke email and system access", assignee: "IT Admin", notes: null },
  { category: "IT", task: "Return ID card and access badges", assignee: "IT Admin", notes: null },
  { category: "IT", task: "Transfer files and documents", assignee: "IT Admin", notes: null },
  { category: "IT", task: "Remove from Slack / Teams channels", assignee: "IT Admin", notes: null },
  { category: "HR", task: "Collect resignation letter", assignee: "HR", notes: null },
  { category: "HR", task: "Update employee records", assignee: "HR", notes: null },
  { category: "HR", task: "Process experience letter", assignee: "HR", notes: null },
  { category: "HR", task: "Relieve from PF / ESI", assignee: "HR", notes: null },
  { category: "HR", task: "Conduct exit interview", assignee: "HR", notes: null },
  { category: "Finance", task: "Clear pending reimbursements", assignee: "Finance", notes: null },
  { category: "Finance", task: "Final salary settlement", assignee: "Finance", notes: null },
  { category: "Finance", task: "Gratuity / bonus processing", assignee: "Finance", notes: null },
  { category: "Finance", task: "Recover loans / advances", assignee: "Finance", notes: null },
  { category: "Manager", task: "Knowledge transfer completed", assignee: "Reporting Manager", notes: null },
  { category: "Manager", task: "Handover responsibilities", assignee: "Reporting Manager", notes: null },
  { category: "Manager", task: "No-dues clearance", assignee: "Reporting Manager", notes: null },
  { category: "Admin", task: "Return parking pass / keys", assignee: "Admin", notes: null },
  { category: "Admin", task: "Return company property (phone, sim, etc.)", assignee: "Admin", notes: null },
  { category: "Admin", task: "Clear desk / locker", assignee: "Admin", notes: null },
];

const CATEGORY_ICONS: Record<string, any> = {
  IT: Laptop,
  HR: Users,
  Finance: Wallet,
  Manager: Shield,
  Admin: Building2,
};

const fmtINR = (n: number) =>
  (n < 0 ? "-" : "") +
  "₹" +
  Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const daysBetween = (a: string, b: string) =>
  Math.ceil(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
const todayStr = () => new Date().toISOString().split("T")[0];

// ══════════════════════════════════════════════════════════════════════════════
//  INITIATE OFFBOARDING MODAL
// ══════════════════════════════════════════════════════════════════════════════
function InitiateModal({
  employees,
  onSave,
  onClose,
}: {
  employees: Employee[];
  onSave: (o: Offboarding) => void;
  onClose: () => void;
}) {
  const sb = useSB();
  const [empId, setEmpId] = useState("");
  const [sepType, setSepType] = useState("resignation");
  const [reason, setReason] = useState("");
  const [lwd, setLwd] = useState("");
  const [noticeDays, setNoticeDays] = useState("30");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const filtered = employees.filter(
    (e) =>
      !empSearch ||
      e.full_name.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.email.toLowerCase().includes(empSearch.toLowerCase())
  );
  const selected = employees.find((e) => e.id === empId);

  const save = async () => {
    if (!empId) {
      setError("Select an employee");
      return;
    }
    if (!lwd) {
      setError("Set last working date");
      return;
    }
    setError("");
    setSaving(true);
    const orgId = await getOrgId(sb);
    const emp = employees.find((e) => e.id === empId)!;
    const checklist: ChecklistItem[] = DEFAULT_CHECKLIST.map((c, i) => ({
      ...c,
      id: `chk-${i}`,
      completed: false,
      completed_at: null,
    }));

    const payload = {
      org_id: orgId,
      employee_id: empId,
      employee_name: emp.full_name,
      employee_email: emp.email,
      department: emp.department,
      designation: emp.designation,
      joining_date: emp.joining_date,
      separation_type: sepType,
      reason: reason || null,
      initiated_by:
        typeof window !== "undefined"
          ? localStorage.getItem("userEmail")
          : null,
      initiated_date: todayStr(),
      last_working_date: lwd,
      notice_period_days: Number(noticeDays) || 30,
      notice_served_days: Math.max(0, daysBetween(todayStr(), lwd)),
      status: "initiated",
      checklist,
      exit_interview: null,
      settlement: null,
      notes: null,
    };

    const { data, error: dbErr } = await sb
      .from("offboardings")
      .insert(payload)
      .select()
      .single();
    if (dbErr) {
      setError(dbErr.message);
      setSaving(false);
      return;
    }
    onSave(data as Offboarding);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Initiate separation
            </h2>
            <p className="text-xs text-gray-400">
              Start offboarding process for an employee
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Employee selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Employee *
            </label>
            {selected ? (
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selected.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selected.department || "No dept"} ·{" "}
                    {selected.designation || "No title"}
                  </p>
                </div>
                <button
                  onClick={() => setEmpId("")}
                  className="text-xs text-indigo-600 font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                  <input
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Search employee…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-xs text-gray-400">No employees found</p>
                      <a href="/employees/add" className="text-xs text-indigo-600 font-semibold hover:underline">
                        + Add employees first
                      </a>
                    </div>
                  )}
                  {filtered.slice(0, 20).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setEmpId(e.id);
                        setEmpSearch("");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {e.full_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {e.email} · {e.department || "—"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Separation type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Separation type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SEP_TYPES.map((t) => (
                <button
                  key={t.v}
                  onClick={() => setSepType(t.v)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    sepType === t.v
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for separation…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Last working date *
              </label>
              <input
                type="date"
                value={lwd}
                onChange={(e) => setLwd(e.target.value)}
                min={todayStr()}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Notice period (days)
              </label>
              <input
                type="number"
                value={noticeDays}
                onChange={(e) => setNoticeDays(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          {lwd && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <p className="font-semibold">
                Notice: {Math.max(0, daysBetween(todayStr(), lwd))} days
                {Number(noticeDays) > 0 &&
                  daysBetween(todayStr(), lwd) < Number(noticeDays) && (
                    <span className="text-red-600 ml-2">
                      (Short by{" "}
                      {Number(noticeDays) - daysBetween(todayStr(), lwd)} days —
                      notice recovery may apply)
                    </span>
                  )}
              </p>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Initiate offboarding
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  OFFBOARDING DETAIL — Checklist, exit interview, settlement
// ══════════════════════════════════════════════════════════════════════════════
function OffboardingDetail({
  offboarding: initial,
  onUpdate,
  onClose,
}: {
  offboarding: Offboarding;
  onUpdate: (o: Offboarding) => void;
  onClose: () => void;
}) {
  const sb = useSB();
  const [ob, setOb] = useState<Offboarding>(initial);
  const [activeTab, setActiveTab] = useState<
    "checklist" | "interview" | "settlement" | "notes"
  >("checklist");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // ── Exit interview state ───────────────────────────────────────────────
  const [interview, setInterview] = useState<ExitInterview>(
    ob.exit_interview || {
      conducted_by: "",
      conducted_date: todayStr(),
      reason_for_leaving: "",
      experience_rating: 3,
      management_rating: 3,
      culture_rating: 3,
      would_recommend: true,
      feedback: "",
      suggestions: "",
      rehire_eligible: true,
    }
  );

  // ── Settlement state ───────────────────────────────────────────────────
  const [settlement, setSettlement] = useState<Settlement>(
    ob.settlement || {
      pending_salary: 0,
      leave_encashment: 0,
      gratuity: 0,
      bonus: 0,
      notice_recovery: 0,
      asset_recovery: 0,
      other_deductions: 0,
      total_payable: 0,
      status: "pending",
      processed_date: null,
    }
  );

  const calcTotal = (s: Settlement) =>
    s.pending_salary +
    s.leave_encashment +
    s.gratuity +
    s.bonus -
    s.notice_recovery -
    s.asset_recovery -
    s.other_deductions;

  useEffect(() => {
    setSettlement((p) => ({ ...p, total_payable: calcTotal(p) }));
  }, [
    settlement.pending_salary,
    settlement.leave_encashment,
    settlement.gratuity,
    settlement.bonus,
    settlement.notice_recovery,
    settlement.asset_recovery,
    settlement.other_deductions,
  ]);

  // ── Notes ──────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState(ob.notes || "");

  // ── Save helpers ───────────────────────────────────────────────────────
  const persist = async (updates: Partial<Offboarding>) => {
    setSaving(true);
    const merged = { ...ob, ...updates };
    await sb.from("offboardings").update(updates).eq("id", ob.id);
    setOb(merged);
    onUpdate(merged);
    setSaving(false);
    setToast("Saved");
    setTimeout(() => setToast(""), 2000);
  };

  const toggleChecklist = async (idx: number) => {
    const updated = [...ob.checklist];
    updated[idx] = {
      ...updated[idx],
      completed: !updated[idx].completed,
      completed_at: !updated[idx].completed
        ? new Date().toISOString()
        : null,
    };
    await persist({ checklist: updated });
  };

  const updateStatus = async (status: string) => {
    await persist({ status });
  };

  const saveInterview = async () => {
    await persist({
      exit_interview: interview,
      status:
        ob.status === "exit_interview" ? "settlement" : ob.status,
    });
  };

  const saveSettlement = async () => {
    const s = { ...settlement, total_payable: calcTotal(settlement) };
    await persist({
      settlement: s,
      status: s.status === "processed" ? "completed" : ob.status,
    });
  };

  const saveNotes = async () => {
    await persist({ notes });
  };

  // ── Computed ───────────────────────────────────────────────────────────
  const completedCount = ob.checklist.filter((c) => c.completed).length;
  const totalChecklist = ob.checklist.length;
  const checklistPct = totalChecklist > 0 ? Math.round((completedCount / totalChecklist) * 100) : 0;
  const categories = [...new Set(ob.checklist.map((c) => c.category))];
  const tenure = ob.joining_date
    ? Math.round(daysBetween(ob.joining_date, ob.last_working_date || todayStr()) / 365 * 10) / 10
    : 0;

  const statusFlow = ["initiated", "checklist", "exit_interview", "settlement", "completed"];
  const currentIdx = statusFlow.indexOf(ob.status);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-bold text-gray-900 truncate">
                {ob.employee_name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  STATUS_COLORS[ob.status] || "bg-gray-100 text-gray-500"
                }`}
              >
                {STATUS_LABELS[ob.status] || ob.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {ob.department || "No dept"} · {ob.designation || "No title"} ·{" "}
              {SEP_TYPES.find((t) => t.v === ob.separation_type)?.l ||
                ob.separation_type}{" "}
              · Tenure: {tenure} yrs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Status timeline */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1">
            {statusFlow.map((s, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx;
              return (
                <div key={s} className="flex items-center flex-1">
                  <button
                    onClick={() =>
                      !saving && ob.status !== "cancelled" && updateStatus(s)
                    }
                    disabled={saving || ob.status === "cancelled"}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-semibold transition text-center ${
                      current
                        ? "bg-indigo-600 text-white shadow-sm"
                        : done
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                  {i < statusFlow.length - 1 && (
                    <div
                      className={`w-3 h-0.5 flex-shrink-0 ${
                        done ? "bg-indigo-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Info bar */}
        <div className="px-6 py-2.5 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span>
            Initiated: <strong className="text-gray-700">{fmtDate(ob.initiated_date)}</strong>
          </span>
          {ob.last_working_date && (
            <span>
              LWD: <strong className="text-gray-700">{fmtDate(ob.last_working_date)}</strong>
            </span>
          )}
          <span>
            Notice: <strong className="text-gray-700">
              {ob.notice_served_days}/{ob.notice_period_days} days
            </strong>
            {ob.notice_served_days < ob.notice_period_days && (
              <span className="text-red-500 ml-1">(short)</span>
            )}
          </span>
          <span>
            Checklist: <strong className="text-gray-700">
              {completedCount}/{totalChecklist}
            </strong>
          </span>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-1 bg-white border-b border-gray-100">
          {(
            [
              { id: "checklist" as const, l: "Checklist", count: `${checklistPct}%` },
              { id: "interview" as const, l: "Exit interview" },
              { id: "settlement" as const, l: "Settlement" },
              { id: "notes" as const, l: "Notes" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.l}
              {"count" in t && t.count && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px]">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── CHECKLIST TAB ──────────────────────────────────────────── */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">
                    Clearance progress
                  </span>
                  <span className="font-semibold text-gray-700">
                    {completedCount}/{totalChecklist} ({checklistPct}%)
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${checklistPct}%` }}
                  />
                </div>
              </div>

              {/* By category */}
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat] || Shield;
                const items = ob.checklist.filter((c) => c.category === cat);
                const catDone = items.filter((c) => c.completed).length;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-700 uppercase">
                        {cat}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {catDone}/{items.length}
                      </span>
                      {catDone === items.length && (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {items.map((item) => {
                        const idx = ob.checklist.findIndex(
                          (c) => c.id === item.id
                        );
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition cursor-pointer ${
                              item.completed
                                ? "bg-emerald-50/60 border-emerald-200"
                                : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() => toggleChecklist(idx)}
                          >
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                                item.completed
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {item.completed && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  item.completed
                                    ? "text-gray-400 line-through"
                                    : "text-gray-800"
                                }`}
                              >
                                {item.task}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                Assignee: {item.assignee}
                                {item.completed_at &&
                                  ` · Done on ${fmtDate(item.completed_at)}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {checklistPct === 100 && ob.status === "checklist" && (
                <button
                  onClick={() => updateStatus("exit_interview")}
                  className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  All cleared — proceed to exit interview
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* ── EXIT INTERVIEW TAB ────────────────────────────────────── */}
          {activeTab === "interview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Conducted by
                  </label>
                  <input
                    value={interview.conducted_by}
                    onChange={(e) =>
                      setInterview((p) => ({
                        ...p,
                        conducted_by: e.target.value,
                      }))
                    }
                    placeholder="HR Manager name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={interview.conducted_date}
                    onChange={(e) =>
                      setInterview((p) => ({
                        ...p,
                        conducted_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Primary reason for leaving
                </label>
                <select
                  value={interview.reason_for_leaving}
                  onChange={(e) =>
                    setInterview((p) => ({
                      ...p,
                      reason_for_leaving: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none"
                >
                  <option value="">Select reason…</option>
                  <option>Better opportunity</option>
                  <option>Higher compensation</option>
                  <option>Career growth</option>
                  <option>Work-life balance</option>
                  <option>Relocation</option>
                  <option>Health / personal reasons</option>
                  <option>Management issues</option>
                  <option>Company culture</option>
                  <option>Higher education</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Ratings */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700">
                  Ratings (1-5)
                </p>
                {(
                  [
                    {
                      k: "experience_rating" as const,
                      l: "Overall experience",
                    },
                    {
                      k: "management_rating" as const,
                      l: "Management & leadership",
                    },
                    { k: "culture_rating" as const, l: "Work culture" },
                  ] as const
                ).map((r) => (
                  <div
                    key={r.k}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-gray-600">{r.l}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() =>
                            setInterview((p) => ({ ...p, [r.k]: v }))
                          }
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${
                            interview[r.k] >= v
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-400 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-600">
                    Would recommend company?
                  </span>
                  <button
                    onClick={() =>
                      setInterview((p) => ({
                        ...p,
                        would_recommend: !p.would_recommend,
                      }))
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      interview.would_recommend
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {interview.would_recommend ? "Yes" : "No"}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-600">
                    Eligible for rehire?
                  </span>
                  <button
                    onClick={() =>
                      setInterview((p) => ({
                        ...p,
                        rehire_eligible: !p.rehire_eligible,
                      }))
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      interview.rehire_eligible
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {interview.rehire_eligible ? "Yes" : "No"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Feedback
                </label>
                <textarea
                  value={interview.feedback}
                  onChange={(e) =>
                    setInterview((p) => ({
                      ...p,
                      feedback: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="What did you enjoy most / least?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Suggestions for improvement
                </label>
                <textarea
                  value={interview.suggestions}
                  onChange={(e) =>
                    setInterview((p) => ({
                      ...p,
                      suggestions: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Any suggestions?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              </div>

              <button
                onClick={saveInterview}
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                Save exit interview
              </button>
            </div>
          )}

          {/* ── SETTLEMENT TAB ────────────────────────────────────────── */}
          {activeTab === "settlement" && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Earnings
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { k: "pending_salary" as const, l: "Pending salary" },
                    { k: "leave_encashment" as const, l: "Leave encashment" },
                    { k: "gratuity" as const, l: "Gratuity" },
                    { k: "bonus" as const, l: "Bonus / incentive" },
                  ] as const
                ).map((f) => (
                  <div key={f.k}>
                    <label className="block text-[10px] text-gray-500 mb-1">
                      {f.l}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-gray-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={settlement[f.k]}
                        onChange={(e) =>
                          setSettlement((p) => ({
                            ...p,
                            [f.k]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase pt-2">
                Deductions
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { k: "notice_recovery" as const, l: "Notice recovery" },
                    { k: "asset_recovery" as const, l: "Asset recovery" },
                    { k: "other_deductions" as const, l: "Other deductions" },
                  ] as const
                ).map((f) => (
                  <div key={f.k}>
                    <label className="block text-[10px] text-gray-500 mb-1">
                      {f.l}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-gray-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={settlement[f.k]}
                        onChange={(e) =>
                          setSettlement((p) => ({
                            ...p,
                            [f.k]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Total earnings</span>
                  <span className="font-semibold text-emerald-600">
                    {fmtINR(
                      settlement.pending_salary +
                        settlement.leave_encashment +
                        settlement.gratuity +
                        settlement.bonus
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Total deductions</span>
                  <span className="font-semibold text-red-500">
                    -{fmtINR(
                      settlement.notice_recovery +
                        settlement.asset_recovery +
                        settlement.other_deductions
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Net payable</span>
                  <span
                    className={
                      calcTotal(settlement) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {fmtINR(calcTotal(settlement))}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={settlement.status}
                  onChange={(e) =>
                    setSettlement((p) => ({
                      ...p,
                      status: e.target.value,
                      processed_date:
                        e.target.value === "processed"
                          ? todayStr()
                          : p.processed_date,
                    }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processed">Processed</option>
                </select>
                <button
                  onClick={saveSettlement}
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" />
                  Save settlement
                </button>
              </div>
            </div>
          )}

          {/* ── NOTES TAB ─────────────────────────────────────────────── */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Internal notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  placeholder="Add internal notes, remarks, follow-ups…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400 flex-1">
                  Reason: {ob.reason || "—"} · Initiated by:{" "}
                  {ob.initiated_by || "—"}
                </p>
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save notes
                </button>
              </div>

              {ob.status !== "cancelled" && ob.status !== "completed" && (
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => updateStatus("cancelled")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel offboarding (withdraw separation)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="px-6 py-2 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN OFFBOARDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function OffboardingPage() {
  const sb = useSB();
  const [offboardings, setOffboardings] = useState<Offboarding[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInitiate, setShowInitiate] = useState(false);
  const [selected, setSelected] = useState<Offboarding | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }

    // Fetch offboardings
    const { data: obs } = await sb.from("offboardings").select("*").eq("org_id", oid).order("created_at", { ascending: false });

    // ── Fetch employees with 5 fallback levels ──
    let emps: any[] = [];

    // 1. employees table + org_id
    const { data: e1 } = await sb.from("employees").select("id, full_name, email, department, designation, joining_date, status").eq("org_id", oid);
    if (e1 && e1.length > 0) { emps = e1; }

    // 2. employees table — ALL (no org filter)
    if (emps.length === 0) {
      const { data: e2 } = await sb.from("employees").select("id, full_name, email, department, designation, joining_date, status");
      if (e2 && e2.length > 0) emps = e2;
    }

    // 3. users table + org_id
    if (emps.length === 0) {
      const { data: e3 } = await sb.from("users").select("id, full_name, email, role").eq("org_id", oid);
      if (e3 && e3.length > 0) emps = e3.map((u: any) => ({ id: u.id, full_name: u.full_name || u.email?.split("@")[0] || "User", email: u.email || "", department: u.role || null, designation: null, joining_date: null, status: "active" }));
    }

    // 4. users table — ALL (no org filter)
    if (emps.length === 0) {
      const { data: e4 } = await sb.from("users").select("id, full_name, email, role");
      if (e4 && e4.length > 0) emps = e4.map((u: any) => ({ id: u.id, full_name: u.full_name || u.email?.split("@")[0] || "User", email: u.email || "", department: u.role || null, designation: null, joining_date: null, status: "active" }));
    }

    const activeEmps = emps.filter((e: any) => !e.status || e.status !== "terminated");
    setOffboardings((obs || []) as Offboarding[]);
    setEmployees(activeEmps as Employee[]);
    setLoading(false);
  }, [sb]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Computed ───────────────────────────────────────────────────────────
  const active = offboardings.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  );
  const completed = offboardings.filter((o) => o.status === "completed");
  const cancelled = offboardings.filter((o) => o.status === "cancelled");

  const avgDays =
    completed.length > 0
      ? Math.round(
          completed.reduce(
            (s, o) => s + daysBetween(o.initiated_date, o.last_working_date || todayStr()),
            0
          ) / completed.length
        )
      : 0;

  const totalSettled = completed.reduce(
    (s, o) => s + (o.settlement?.total_payable || 0),
    0
  );

  const attritionRate =
    employees.length + completed.length > 0
      ? Math.round(
          (completed.length / (employees.length + completed.length)) * 100
        )
      : 0;

  const filtered = useMemo(
    () =>
      offboardings.filter((o) => {
        const q = search.toLowerCase();
        return (
          (!q ||
            o.employee_name.toLowerCase().includes(q) ||
            o.employee_email.toLowerCase().includes(q) ||
            o.department?.toLowerCase().includes(q)) &&
          (!statusFilter || o.status === statusFilter) &&
          (!typeFilter || o.separation_type === typeFilter)
        );
      }),
    [offboardings, search, statusFilter, typeFilter]
  );

  const handleUpdate = (o: Offboarding) => {
    setOffboardings((p) => p.map((x) => (x.id === o.id ? o : x)));
    setSelected(o);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {showInitiate && (
        <InitiateModal
          employees={employees}
          onSave={(o) => {
            setOffboardings((p) => [o, ...p]);
            setToast({ msg: "Offboarding initiated", type: "success" });
          }}
          onClose={() => setShowInitiate(false)}
        />
      )}
      {selected && (
        <OffboardingDetail
          offboarding={selected}
          onUpdate={handleUpdate}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Offboarding / Separation
          </h1>
          <p className="text-sm text-gray-400">
            Manage employee exits, clearance, and final settlements
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setShowInitiate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition"
          >
            <UserMinus className="w-4 h-4" />
            Initiate separation
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          {
            l: "Active",
            v: active.length.toString(),
            s: "In progress",
            c: "#6366F1",
            ic: <Clock className="w-4 h-4" />,
          },
          {
            l: "Completed",
            v: completed.length.toString(),
            s: "All time",
            c: "#22C55E",
            ic: <CheckCircle2 className="w-4 h-4" />,
          },
          {
            l: "Avg duration",
            v: `${avgDays}d`,
            s: "Initiate to exit",
            c: "#F59E0B",
            ic: <CalendarDays className="w-4 h-4" />,
          },
          {
            l: "Total settled",
            v: fmtINR(totalSettled),
            s: `${completed.length} settlements`,
            c: "#8B5CF6",
            ic: <IndianRupee className="w-4 h-4" />,
          },
          {
            l: "Attrition rate",
            v: `${attritionRate}%`,
            s: `${completed.length} of ${employees.length + completed.length}`,
            c: attritionRate > 15 ? "#EF4444" : "#06B6D4",
            ic: <Users className="w-4 h-4" />,
          },
        ].map((s) => (
          <div
            key={s.l}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ background: s.c + "12", color: s.c }}
            >
              {s.ic}
            </div>
            <p className="text-[10px] text-gray-400 uppercase">{s.l}</p>
            <p className="text-lg font-bold text-gray-900">{s.v}</p>
            <p className="text-[10px] text-gray-400">{s.s}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-52">
          <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"
        >
          <option value="">All types</option>
          {SEP_TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserMinus className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {offboardings.length === 0
                ? "No offboardings initiated yet"
                : "No match found"}
            </p>
            <button
              onClick={() => setShowInitiate(true)}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
            >
              <UserMinus className="w-4 h-4 inline mr-1" />
              Initiate separation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    "Employee",
                    "Department",
                    "Type",
                    "Status",
                    "Checklist",
                    "LWD",
                    "Notice",
                    "Settlement",
                    "Initiated",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-gray-500 px-5 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => {
                  const done = o.checklist.filter((c) => c.completed).length;
                  const total = o.checklist.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelected(o)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">
                          {o.employee_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {o.employee_email}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {o.department || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                          {SEP_TYPES.find((t) => t.v === o.separation_type)
                            ?.l || o.separation_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            STATUS_COLORS[o.status] ||
                            "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct === 100
                                  ? "bg-emerald-500"
                                  : "bg-indigo-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {done}/{total}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {o.last_working_date
                          ? fmtDate(o.last_working_date)
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-medium ${
                            o.notice_served_days < o.notice_period_days
                              ? "text-red-500"
                              : "text-gray-600"
                          }`}
                        >
                          {o.notice_served_days}/{o.notice_period_days}d
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {o.settlement ? (
                          <span
                            className={`font-semibold ${
                              o.settlement.status === "processed"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {fmtINR(o.settlement.total_payable)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {fmtDate(o.initiated_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
            <span>
              {filtered.length} offboarding{filtered.length !== 1 && "s"} ·{" "}
              {active.length} active · {completed.length} completed
            </span>
            <span>
              Attrition: {attritionRate}% · Avg exit: {avgDays} days
            </span>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}