"use client";
// Route: app/product/people/preview/page.tsx
// PREVIEW MODE — marketing-site demo of the Employees module.
// All Supabase calls replaced with in-memory mock data. Nothing persists.
// Full flow kept: departments, reporting manager, approval flow,
// onboarding link copy, first/middle/last name, 3-step onboarding drawer.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, Plus, Search, X, Phone, Mail, Building2,
  ChevronDown, ChevronLeft, Edit2, Trash2, Shield,
  Loader2, AlertCircle, CheckCircle2, RefreshCw,
  MoreHorizontal, UserCheck, Maximize2, Minimize2,
  Copy, Link2, Clock, ArrowRight,
  ThumbsUp, ThumbsDown, UserPlus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; org_id: string; employee_code: string | null;
  full_name: string; first_name: string | null; middle_name: string | null; last_name: string | null;
  phone: string; email: string | null;
  department: string | null; department_id: string | null; designation: string | null;
  date_of_joining: string; date_of_birth: string | null; gender: string | null;
  pan: string | null; aadhaar_last4: string | null; uan: string | null;
  bank_account: string | null; bank_ifsc: string | null; bank_name: string | null;
  salary_type: string; basic_salary: number; hra: number;
  special_allowance: number; other_allowance: number; gross_salary: number;
  pf_applicable: boolean; esic_applicable: boolean; pt_applicable: boolean;
  status: string; whatsapp_registered: boolean; created_at: string;
  reporting_manager_id: string | null; approval_status: string | null;
  onboarding_completed: boolean | null; onboarding_link: string | null;
  approved_by: string | null; approved_at: string | null;
}

interface Department { id: string; org_id: string; name: string; head_employee_id: string | null; }

interface FormData {
  first_name: string; middle_name: string; last_name: string;
  phone: string; email: string; date_of_birth: string; gender: string;
  department: string; department_id: string; designation: string;
  date_of_joining: string; employee_code: string; reporting_manager_id: string;
  role: string;
  salary_type: string; basic_salary: string; hra: string;
  special_allowance: string; other_allowance: string;
  pan: string; aadhaar_last4: string; uan: string;
  bank_account: string; bank_ifsc: string; bank_name: string; bank_branch: string;
  pf_applicable: boolean; esic_applicable: boolean; pt_applicable: boolean;
}

const EMPTY_FORM: FormData = {
  first_name: "", middle_name: "", last_name: "",
  phone: "", email: "", date_of_birth: "", gender: "",
  department: "", department_id: "", designation: "",
  date_of_joining: "", employee_code: "", reporting_manager_id: "",
  role: "employee",
  salary_type: "fixed", basic_salary: "", hra: "", special_allowance: "", other_allowance: "",
  pan: "", aadhaar_last4: "", uan: "",
  bank_account: "", bank_ifsc: "", bank_name: "", bank_branch: "",
  pf_applicable: true, esic_applicable: false, pt_applicable: true,
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const ORG_ID = "org-demo";
const ORG_NAME = "NorthWeb Labs — Demo";
const uid = () => Math.random().toString(36).slice(2, 10);

const MOCK_DEPARTMENTS: Department[] = [
  { id: "d1", org_id: ORG_ID, name: "Engineering", head_employee_id: "e01" },
  { id: "d2", org_id: ORG_ID, name: "Design",      head_employee_id: null },
  { id: "d3", org_id: ORG_ID, name: "Finance",     head_employee_id: null },
  { id: "d4", org_id: ORG_ID, name: "Sales",       head_employee_id: "e06" },
  { id: "d5", org_id: ORG_ID, name: "Operations",  head_employee_id: null },
];

const MEMP = (
  id: string, first: string, last: string, code: string,
  deptId: string, dept: string, desig: string, phone: string,
  doj: string, basic: number, hra: number, special: number, other: number,
  opts: Partial<Employee> = {},
): Employee => ({
  id, org_id: ORG_ID, employee_code: code,
  full_name: `${first} ${last}`, first_name: first, middle_name: null, last_name: last,
  phone, email: `${first.toLowerCase()}.${last.toLowerCase()}@northweblabs.in`,
  department: dept, department_id: deptId, designation: desig,
  date_of_joining: doj, date_of_birth: null, gender: null,
  pan: null, aadhaar_last4: null, uan: null,
  bank_account: null, bank_ifsc: null, bank_name: null,
  salary_type: "fixed", basic_salary: basic, hra, special_allowance: special, other_allowance: other,
  gross_salary: basic + hra + special + other,
  pf_applicable: true, esic_applicable: basic + hra + special + other <= 21000, pt_applicable: true,
  status: "active", whatsapp_registered: true, created_at: `${doj}T10:00:00Z`,
  reporting_manager_id: null, approval_status: "approved",
  onboarding_completed: true, onboarding_link: null,
  approved_by: null, approved_at: `${doj}T12:00:00Z`,
  ...opts,
});

const MOCK_EMPLOYEES: Employee[] = [
  MEMP("e01", "Ananya", "Iyer",   "NWL001", "d1", "Engineering", "Engineering Lead",  "9876500001", "2022-04-11", 60000, 24000, 12000, 4000,
    { pan: "ABCPI1234F", bank_name: "HDFC Bank", bank_account: "50100234567890", bank_ifsc: "HDFC0001234" }),
  MEMP("e02", "Arjun", "Kapoor",  "NWL002", "d1", "Engineering", "Senior Developer",  "9876500002", "2022-09-05", 45000, 18000,  9000, 3000,
    { reporting_manager_id: "e01" }),
  MEMP("e03", "Priya", "Sharma",  "NWL003", "d2", "Design",      "Product Designer",  "9876500003", "2023-01-16", 38000, 15200,  7600, 2200),
  MEMP("e04", "Rahul", "Verma",   "NWL004", "d3", "Finance",     "Accounts Manager",  "9876500004", "2023-03-01", 35000, 14000,  7000, 2000),
  MEMP("e05", "Sneha", "Reddy",   "NWL005", "d1", "Engineering", "Developer",         "9876500005", "2023-11-20", 30000, 12000,  6000, 2000,
    { reporting_manager_id: "e01" }),
  MEMP("e06", "Vikram", "Singh",  "NWL006", "d4", "Sales",       "Sales Manager",     "9876500006", "2022-06-13", 32000, 12800,  6400, 1800),
  MEMP("e07", "Meera", "Nair",    "NWL007", "d5", "Operations",  "Ops Executive",     "9876500007", "2024-02-12", 16000,  6400,  3200,  900,
    { reporting_manager_id: "e04" }),
  MEMP("e08", "Karan", "Mehta",   "NWL008", "d4", "Sales",       "Sales Executive",   "9876500008", "2024-08-01", 14000,  5600,  2800,  800,
    { reporting_manager_id: "e06", onboarding_completed: false }),
  MEMP("e09", "Divya", "Pillai",  "NWL009", "d2", "Design",      "UI Designer",       "9876500009", "2025-10-06", 26000, 10400,  5200, 1500,
    { approval_status: "pending", onboarding_completed: false, whatsapp_registered: false }),
  MEMP("e10", "Rohan", "Joshi",   "NWL010", "d5", "Operations",  "Office Assistant",  "9876500010", "2026-05-18", 11000,  4400,  2200,  600,
    { approval_status: "pending", onboarding_completed: false, whatsapp_registered: false, reporting_manager_id: "e07" }),
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const colors = ["bg-indigo-100 text-indigo-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700", "bg-orange-100 text-orange-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-11 h-11 text-sm" : "w-9 h-9 text-xs";
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none`}>{name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { active: "bg-emerald-100 text-emerald-700", inactive: "bg-amber-100 text-amber-700", terminated: "bg-red-100 text-red-600" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function ApprovalBadge({ status }: { status: string | null }) {
  if (!status || status === "approved") return null;
  const map: Record<string, string> = { pending: "bg-amber-100 text-amber-700 border-amber-200", rejected: "bg-red-100 text-red-700 border-red-200" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{status === "pending" ? "⏳ Pending" : "✗ Rejected"}</span>;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors placeholder:text-gray-300";
const selectCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors appearance-none";

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{children}{hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}</div>;
}

// ── Create Department Modal (in-memory) ───────────────────────────────────────
function CreateDeptModal({ existing, onCreated, onClose }: { existing: Department[]; onCreated: (d: Department) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    if (existing.some(d => d.name.toLowerCase() === name.trim().toLowerCase())) { setError("Department already exists"); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 300)); // simulate network
    onCreated({ id: uid(), org_id: ORG_ID, name: name.trim(), head_employee_id: null });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Create Department</h3>
        <input value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="e.g. Engineering" autoFocus
          className={`${inputCls} mb-2 ${error ? "border-red-300" : ""}`} onKeyDown={e => e.key === "Enter" && save()} />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Employee Drawer (in-memory save) ──────────────────────────────────────
function AddEmployeeDrawer({ open, onClose, onSaved, departments, employees }: {
  open: boolean; onClose: () => void; onSaved: (emp: Employee) => void;
  departments: Department[]; employees: Employee[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [localDepts, setLocalDepts] = useState<Department[]>(departments);

  useEffect(() => { setLocalDepts(departments); }, [departments]);

  const set = (key: keyof FormData, value: string | boolean) => { setForm(p => ({ ...p, [key]: value })); setErrors(p => { const n = { ...p }; delete n[key]; return n; }); };

  // Kept as-is: public IFSC lookup, no auth needed — works fine in the preview.
  const lookupIFSC = async (ifsc: string) => {
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return;
    try { const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`); if (!res.ok) return; const d = await res.json(); setForm(p => ({ ...p, bank_name: d.BANK || "", bank_branch: d.BRANCH || "" })); setIfscVerified(true); } catch {}
  };

  const computedGross = Number(form.basic_salary || 0) + Number(form.hra || 0) + Number(form.special_allowance || 0) + Number(form.other_allowance || 0);

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.first_name.trim()) e.first_name = "Required";
      if (!form.last_name.trim()) e.last_name = "Required";
      if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) e.phone = "Valid 10-digit number";
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    }
    if (s === 2) {
      if (!form.department && !form.department_id) e.department = "Required";
      if (!form.designation.trim()) e.designation = "Required";
      if (!form.date_of_joining) e.date_of_joining = "Required";
      if (!form.basic_salary || Number(form.basic_salary) < 1) e.basic_salary = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep(p => Math.min(p + 1, 3) as 1 | 2 | 3); };
  const back = () => setStep(p => Math.max(p - 1, 1) as 1 | 2 | 3);

  // Preview mode: builds the Employee record locally — no database round-trip.
  const handleSave = async () => {
    if (!validateStep(3)) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500)); // simulate network

    const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ").trim();
    const phone = form.phone.replace(/\D/g, "").replace(/^(91|0)/, "");
    const onboardLink = `${window.location.origin}/onboard/self?org=${ORG_ID}&email=${encodeURIComponent(form.email)}`;

    let code = form.employee_code.trim();
    if (!code) code = `NWL${String(employees.length + 1).padStart(3, "0")}`;

    let deptName = form.department;
    if (form.department_id) {
      const dept = localDepts.find(d => d.id === form.department_id);
      if (dept) deptName = dept.name;
    }

    const emp: Employee = {
      id: uid(), org_id: ORG_ID, employee_code: code,
      first_name: form.first_name.trim(), middle_name: form.middle_name.trim() || null, last_name: form.last_name.trim(),
      full_name: fullName, phone, email: form.email || null,
      department: deptName || null, department_id: form.department_id || null,
      designation: form.designation.trim(), date_of_joining: form.date_of_joining,
      date_of_birth: form.date_of_birth || null, gender: form.gender || null,
      reporting_manager_id: form.reporting_manager_id || null,
      salary_type: form.salary_type, basic_salary: Number(form.basic_salary),
      hra: Number(form.hra || 0), special_allowance: Number(form.special_allowance || 0),
      other_allowance: Number(form.other_allowance || 0), gross_salary: computedGross,
      pan: form.pan ? form.pan.toUpperCase() : null, aadhaar_last4: form.aadhaar_last4 || null,
      uan: form.uan || null, bank_account: form.bank_account || null,
      bank_ifsc: form.bank_ifsc ? form.bank_ifsc.toUpperCase() : null, bank_name: form.bank_name || null,
      pf_applicable: form.pf_applicable, esic_applicable: form.esic_applicable, pt_applicable: form.pt_applicable,
      status: "active", approval_status: "pending", onboarding_completed: false,
      onboarding_link: onboardLink, whatsapp_registered: false,
      created_at: new Date().toISOString(), approved_by: null, approved_at: null,
    };

    onSaved(emp);
    setForm(EMPTY_FORM); setStep(1); setIfscVerified(false); setSaving(false); onClose();
  };

  const handleClose = () => { setForm(EMPTY_FORM); setStep(1); setErrors({}); setFullscreen(false); onClose(); };
  if (!open) return null;
  const steps = ["Personal", "Job & Salary", "Compliance & Bank"];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={handleClose} />
      {showDeptModal && <CreateDeptModal existing={localDepts} onClose={() => setShowDeptModal(false)} onCreated={d => { setLocalDepts(p => [...p, d]); setShowDeptModal(false); set("department_id", d.id); set("department", d.name); }} />}

      <div className={`fixed right-0 top-0 h-full ${fullscreen ? "w-full" : "w-full max-w-[540px]"} bg-white shadow-2xl z-50 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><UserCheck className="w-4 h-4 text-indigo-600" /></div>
            <div><h2 className="text-sm font-bold text-gray-900">Onboard new employee</h2><p className="text-xs text-gray-400">Step {step}/3 — {steps[step - 1]}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setFullscreen(p => !p)} className="p-2 hover:bg-gray-100 rounded-lg">{fullscreen ? <Minimize2 className="w-4 h-4 text-gray-500" /> : <Maximize2 className="w-4 h-4 text-gray-500" />}</button>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-100">
          <div className="flex gap-2 mb-2">{steps.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i < step ? "bg-indigo-600" : "bg-gray-200"}`} />)}</div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className={`px-6 py-5 ${fullscreen ? "max-w-2xl mx-auto" : ""}`}>
            {/* Step 1 */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="First name" required>
                    <input className={`${inputCls} ${errors.first_name ? "border-red-300" : ""}`} placeholder="First" value={form.first_name} onChange={e => set("first_name", e.target.value)} autoFocus />
                    {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
                  </Field>
                  <Field label="Middle name">
                    <input className={inputCls} placeholder="Middle" value={form.middle_name} onChange={e => set("middle_name", e.target.value)} />
                  </Field>
                  <Field label="Last name" required>
                    <input className={`${inputCls} ${errors.last_name ? "border-red-300" : ""}`} placeholder="Last" value={form.last_name} onChange={e => set("last_name", e.target.value)} />
                    {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
                  </Field>
                </div>
                <Field label="Mobile number" required hint="Used for WhatsApp attendance bot">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-400">+91</span>
                    <input className={`${inputCls} pl-10 ${errors.phone ? "border-red-300" : ""}`} placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </Field>
                <Field label="Email">
                  <input className={`${inputCls} ${errors.email ? "border-red-300" : ""}`} type="email" placeholder="email@company.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of birth"><input className={inputCls} type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} /></Field>
                  <Field label="Gender">
                    <select className={selectCls} value={form.gender} onChange={e => set("gender", e.target.value)}>
                      <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Department" required>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select className={`${selectCls} ${errors.department ? "border-red-300" : ""}`}
                          value={form.department_id} onChange={e => { set("department_id", e.target.value); const d = localDepts.find(x => x.id === e.target.value); if (d) set("department", d.name); }}>
                          <option value="">Select</option>
                          {localDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      <button onClick={() => setShowDeptModal(true)} className="px-2.5 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="New department"><Plus className="w-4 h-4" /></button>
                    </div>
                    {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
                  </Field>
                  <Field label="Designation" required>
                    <input className={`${inputCls} ${errors.designation ? "border-red-300" : ""}`} placeholder="Software Engineer" value={form.designation} onChange={e => set("designation", e.target.value)} />
                    {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Date of joining" required>
                    <input className={`${inputCls} ${errors.date_of_joining ? "border-red-300" : ""}`} type="date" value={form.date_of_joining} onChange={e => set("date_of_joining", e.target.value)} />
                  </Field>
                  <Field label="Employee code" hint="Auto if blank">
                    <input className={inputCls} placeholder="Auto" value={form.employee_code} onChange={e => set("employee_code", e.target.value)} />
                  </Field>
                  <Field label="Reporting manager">
                    <select className={selectCls} value={form.reporting_manager_id} onChange={e => set("reporting_manager_id", e.target.value)}>
                      <option value="">None</option>
                      {employees.filter(e => e.status === "active").map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Role" required>
                    <select className={selectCls} value={form.role} onChange={e => set("role", e.target.value)}>
                      {["employee", "manager", "hr", "admin", "owner"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Salary type">
                    <select className={selectCls} value={form.salary_type} onChange={e => set("salary_type", e.target.value)}>
                      <option value="fixed">Fixed</option><option value="hourly">Hourly</option><option value="contract">Contract</option>
                    </select>
                  </Field>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Salary structure</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "basic_salary" as const, label: "Basic (₹/mo)", required: true },
                      { key: "hra" as const, label: "HRA (₹/mo)" },
                      { key: "special_allowance" as const, label: "Special Allow." },
                      { key: "other_allowance" as const, label: "Other Allow." },
                    ].map(f => (
                      <Field key={f.key} label={f.label} required={f.required}>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-sm text-gray-400">₹</span>
                          <input className={`${inputCls} pl-7 ${errors[f.key] ? "border-red-300" : ""}`} type="number" placeholder="0"
                            value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
                        </div>
                        {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
                      </Field>
                    ))}
                  </div>
                  {computedGross > 0 && (
                    <div className="mt-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700">Gross salary</span>
                      <span className="text-lg font-bold text-indigo-900">{fmtINR(computedGross)}<span className="text-xs font-normal text-indigo-400">/mo</span></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="PAN" hint="ABCDE1234F">
                    <input className={`${inputCls} font-mono ${errors.pan ? "border-red-300" : ""}`} placeholder="ABCDE1234F" value={form.pan} onChange={e => set("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={10} />
                  </Field>
                  <Field label="Aadhaar (last 4)">
                    <input className={`${inputCls} font-mono ${errors.aadhaar_last4 ? "border-red-300" : ""}`} placeholder="1234" value={form.aadhaar_last4} onChange={e => set("aadhaar_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} />
                  </Field>
                </div>
                <Field label="UAN"><input className={`${inputCls} font-mono`} placeholder="100XXXXXXXXX" value={form.uan} onChange={e => set("uan", e.target.value.replace(/\D/g, "").slice(0, 12))} maxLength={12} /></Field>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Bank details</p>
                  <Field label="IFSC code" hint="Auto-fills bank name">
                    <div className="relative">
                      <input className={`${inputCls} font-mono pr-10 ${ifscVerified ? "border-emerald-300" : ""}`} placeholder="SBIN0001234" value={form.bank_ifsc}
                        onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); set("bank_ifsc", v); setIfscVerified(false); if (v.length === 11) lookupIFSC(v); }} maxLength={11} />
                      {ifscVerified && <CheckCircle2 className="absolute right-3 top-2.5 w-4 h-4 text-emerald-500" />}
                    </div>
                  </Field>
                  {form.bank_name && <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />{form.bank_name}{form.bank_branch && ` — ${form.bank_branch}`}</div>}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Field label="Account number"><input className={`${inputCls} font-mono`} placeholder="1234567890" value={form.bank_account} onChange={e => set("bank_account", e.target.value.replace(/\D/g, ""))} /></Field>
                    <Field label="Bank name"><input className={inputCls} placeholder="Auto from IFSC" value={form.bank_name} onChange={e => set("bank_name", e.target.value)} readOnly={ifscVerified} /></Field>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Statutory</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { key: "pf_applicable" as const, label: "PF", desc: "12% of basic" },
                      { key: "esic_applicable" as const, label: "ESIC", desc: computedGross <= 21000 ? "Applicable" : "Exempt (gross > ₹21K)" },
                      { key: "pt_applicable" as const, label: "PT", desc: "₹200/mo" },
                    ].map(c => (
                      <label key={c.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${form[c.key] ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"}`}>
                        <input type="checkbox" checked={form[c.key] as boolean} onChange={e => set(c.key, e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                        <div><p className="text-xs font-semibold text-gray-800">{c.label}</p><p className="text-xs text-gray-400">{c.desc}</p></div>
                      </label>
                    ))}
                  </div>
                </div>

                {errors.first_name && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.first_name}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {step > 1 ? <button onClick={back} className="px-5 py-2.5 text-sm text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50">← Back</button> : <button onClick={handleClose} className="px-5 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>}
            {step < 3 ? (
              <button onClick={next} className="flex-1 py-2.5 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] flex items-center justify-center gap-2">Continue →</button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><UserCheck className="w-4 h-4" />Complete onboarding</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Employee Detail Drawer with Approval + Onboarding Link ────────────────────
function EmployeeDetailDrawer({ employee, open, onClose, onUpdate, employees }: {
  employee: Employee | null; open: boolean; onClose: () => void;
  onUpdate: (emp: Employee) => void; employees: Employee[];
}) {
  const [confirming, setConfirming] = useState<"approve" | "reject" | "delete" | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open || !employee) return null;

  const gross = employee.gross_salary || (employee.basic_salary + employee.hra + employee.special_allowance + employee.other_allowance);
  const manager = employees.find(e => e.id === employee.reporting_manager_id);
  const onboardLink = employee.onboarding_link || `${window.location.origin}/onboard/self?org=${employee.org_id}&email=${encodeURIComponent(employee.email || "")}`;

  // Preview mode: approval updates local state only.
  const handleApproval = async (status: "approved" | "rejected") => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400)); // simulate network
    onUpdate({ ...employee, approval_status: status, approved_at: new Date().toISOString() });
    setSaving(false); setConfirming(null);
  };

  const handleTerminate = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400)); // simulate network
    onUpdate({ ...employee, status: "terminated" });
    setSaving(false); setConfirming(null); onClose();
  };

  const copyLink = () => { navigator.clipboard.writeText(onboardLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[440px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Employee profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile header */}
          <div className="px-6 py-5 flex items-start gap-4 border-b border-gray-100">
            <Avatar name={employee.full_name} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{employee.full_name}</h3>
              <p className="text-sm text-gray-500 truncate">{employee.designation} · {employee.department}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={employee.status} />
                <ApprovalBadge status={employee.approval_status} />
              </div>
            </div>
          </div>

          {/* Approval actions */}
          {employee.approval_status === "pending" && (
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
              <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Awaiting approval</p>
              {confirming === "approve" || confirming === "reject" ? (
                <div className="flex gap-2">
                  <button onClick={() => handleApproval(confirming === "approve" ? "approved" : "rejected")} disabled={saving}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 ${confirming === "approve" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirming === "approve" ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                    Confirm {confirming}
                  </button>
                  <button onClick={() => setConfirming(null)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg">Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setConfirming("approve")} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />Approve</button>
                  <button onClick={() => setConfirming("reject")} className="flex-1 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1"><ThumbsDown className="w-3.5 h-3.5" />Reject</button>
                </div>
              )}
            </div>
          )}

          {/* Onboarding link */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Self-onboarding link</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <code className="flex-1 text-xs text-gray-600 truncate">{onboardLink}</code>
              <button onClick={copyLink} className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${copied ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>
                {copied ? <><CheckCircle2 className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
              </button>
            </div>
          </div>

          {/* Info sections */}
          <div className="px-6 py-4 flex flex-col gap-5">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-sm text-gray-700"><Phone className="w-4 h-4 text-gray-400" />{employee.phone}</div>
                {employee.email && <div className="flex items-center gap-3 text-sm text-gray-700"><Mail className="w-4 h-4 text-gray-400" />{employee.email}</div>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Employment</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Department", value: employee.department || "—" },
                  { label: "Code", value: employee.employee_code || "—" },
                  { label: "Joined", value: employee.date_of_joining ? fmtDate(employee.date_of_joining) : "—" },
                  { label: "Manager", value: manager?.full_name || "—" },
                ].map(i => (
                  <div key={i.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{i.label}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{i.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Salary</p>
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                {[
                  ["Basic", fmtINR(employee.basic_salary)], ["HRA", fmtINR(employee.hra)],
                  ["Special", fmtINR(employee.special_allowance)], ["Gross", fmtINR(gross)],
                ].map(([l, v]) => (
                  <div key={l} className={`flex justify-between text-sm ${l === "Gross" ? "pt-2 border-t border-gray-200 font-bold" : ""}`}>
                    <span className="text-gray-500 text-xs">{l}</span><span className="text-xs font-mono text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" />Edit</button>
          {employee.status !== "terminated" && (
            confirming === "delete" ? (
              <button onClick={handleTerminate} disabled={saving} className="py-2 px-4 bg-red-600 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Confirm</button>
            ) : (
              <button onClick={() => setConfirming("delete")} className="py-2 px-4 bg-red-50 text-red-600 text-sm font-semibold rounded-lg border border-red-200 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Terminate</button>
            )
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeesPreviewPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const orgName = ORG_NAME;

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);

  // ── Load mock data (replaces the Supabase fetch) ────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 350)); // simulate network
    setEmployees(prev => prev.length ? prev : MOCK_EMPLOYEES);
    setDepartments(prev => prev.length ? prev : MOCK_DEPARTMENTS);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = employees.filter(e => {
    if (e.status === "terminated") return false;
    const q = search.toLowerCase();
    const matchSearch = !q || e.full_name.toLowerCase().includes(q) || (e.employee_code?.toLowerCase().includes(q)) || (e.email?.toLowerCase().includes(q));
    const matchDept = !deptFilter || e.department === deptFilter;
    const matchStatus = !statusFilter || e.status === statusFilter;
    const matchApproval = !approvalFilter || e.approval_status === approvalFilter;
    return matchSearch && matchDept && matchStatus && matchApproval;
  });

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];
  const active = employees.filter(e => e.status === "active").length;
  const pendingApprovals = employees.filter(e => e.approval_status === "pending").length;
  const onboardingInProgress = employees.filter(e => !e.onboarding_completed).length;

  const handleSaved = (emp: Employee) => { setEmployees(p => [emp, ...p]); setToast({ message: `${emp.full_name} onboarded`, type: "success" }); };
  const handleUpdate = (emp: Employee) => {
    setEmployees(p => p.map(e => e.id === emp.id ? emp : e));
    if (selectedEmp?.id === emp.id) setSelectedEmp(emp);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Preview banner ── */}
      <div className="bg-[#0b1220] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/product" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />Product
            </Link>
            <span className="text-gray-600">|</span>
            <span className="font-semibold">People — interactive preview</span>
            <span className="hidden sm:inline text-xs text-gray-400">Sample data · changes aren&rsquo;t saved</span>
          </div>
          <Link href="/signup" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold px-4 py-1.5 rounded-lg">
            Start free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
      <div className="p-6 flex flex-col gap-5 min-h-full">
      {showDeptModal && <CreateDeptModal existing={departments} onClose={() => setShowDeptModal(false)} onCreated={d => { setDepartments(p => [...p, d]); setShowDeptModal(false); setToast({ message: `Department "${d.name}" created`, type: "success" }); }} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Employees</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5"><Building2 className="w-3 h-3" />{orgName} · {active} active · {employees.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDeptModal(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"><Building2 className="w-4 h-4" />New Dept</button>
          <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
          <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b]"><Plus className="w-4 h-4" />Onboard employee</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <Users className="w-4 h-4" />, label: "Total", value: employees.length, sub: `${active} active`, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: <Clock className="w-4 h-4" />, label: "Pending approval", value: pendingApprovals, sub: "Needs review", color: "text-amber-600", bg: "bg-amber-50" },
          { icon: <UserPlus className="w-4 h-4" />, label: "Onboarding", value: onboardingInProgress, sub: "In progress", color: "text-violet-600", bg: "bg-violet-50" },
          { icon: <Shield className="w-4 h-4" />, label: "Departments", value: departments.length, sub: "Active depts", color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
            <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-lg font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-400">{s.sub}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search name, code, email…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        {[
          { value: deptFilter, setter: setDeptFilter, label: "Department", options: depts },
          { value: statusFilter, setter: setStatusFilter, label: "Status", options: ["active", "inactive"] },
          { value: approvalFilter, setter: setApprovalFilter, label: "Approval", options: ["pending", "approved", "rejected"] },
        ].map(f => (
          <div key={f.label} className="relative">
            <select value={f.value} onChange={e => f.setter(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">All {f.label.toLowerCase()}s</option>
              {f.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        ))}
        {(search || deptFilter || statusFilter || approvalFilter) && (
          <button onClick={() => { setSearch(""); setDeptFilter(""); setStatusFilter(""); setApprovalFilter(""); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" />Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-sm text-gray-500">Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-gray-400" /></div>
            <p className="text-sm font-semibold text-gray-600">{employees.length === 0 ? "No employees yet" : "No matches"}</p>
            {employees.length === 0 && <button onClick={() => setDrawerOpen(true)} className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg"><Plus className="w-4 h-4" />Onboard first employee</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Employee", "Department", "Manager", "Joined", "Gross", "Status", "Approval", ""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(emp => {
                    const g = emp.gross_salary || (emp.basic_salary + emp.hra + emp.special_allowance + emp.other_allowance);
                    const mgr = employees.find(e => e.id === emp.reporting_manager_id);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedEmp(emp); setDetailOpen(true); }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.full_name} />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                              <p className="text-xs text-gray-400">{emp.designation || "—"}{emp.employee_code ? ` · ${emp.employee_code}` : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">{emp.department || "—"}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{mgr?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{emp.date_of_joining ? fmtDate(emp.date_of_joining) : "—"}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{fmtINR(g)}</td>
                        <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                        <td className="px-4 py-3"><ApprovalBadge status={emp.approval_status} /></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">Showing {filtered.length} of {employees.length} · {orgName}</p>
              <p className="text-xs text-gray-400">Click row for profile</p>
            </div>
          </>
        )}
      </div>

      {/* Drawers */}
      <AddEmployeeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} departments={departments} employees={employees} />
      <EmployeeDetailDrawer employee={selectedEmp} open={detailOpen} onClose={() => setDetailOpen(false)} onUpdate={handleUpdate} employees={employees} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
      </div>
    </div>
  );
}