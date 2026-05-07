"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Users, Plus, Search, X, Phone, Mail, Building2, Calendar,
  IndianRupee, Briefcase, ChevronDown, Edit2, Trash2, Shield,
  FileText, Loader2, AlertCircle, CheckCircle2, RefreshCw,
  Upload, MoreHorizontal, UserCheck, Maximize2, Minimize2,
} from "lucide-react";

// ─── Single stable Supabase client per component ──────────────────────────────
function useSupabase() {
  return useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
  []);
}

// ─── Types (match your Supabase schema exactly) ───────────────────────────────
interface Employee {
  id: string;
  org_id: string;
  employee_code: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  department: string | null;
  designation: string | null;
  date_of_joining: string;
  date_of_birth: string | null;
  gender: string | null;
  pan: string | null;
  aadhaar_last4: string | null;
  uan: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  salary_type: "fixed" | "variable";
  basic_salary: number;
  hra: number;
  special_allowance: number;
  other_allowance: number;
  gross_salary: number;
  pf_applicable: boolean;
  esic_applicable: boolean;
  pt_applicable: boolean;
  status: "active" | "inactive" | "terminated";
  whatsapp_registered: boolean;
  created_at: string;
}

interface NewEmployeeFormData {
  // Step 1 — Personal
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  // Step 2 — Job
  department: string;
  designation: string;
  date_of_joining: string;
  employee_code: string;
  salary_type: "fixed" | "variable";
  basic_salary: string;
  hra: string;
  special_allowance: string;
  other_allowance: string;
  // Step 3 — Compliance & Bank
  pan: string;
  aadhaar_last4: string;
  uan: string;
  bank_account: string;
  bank_ifsc: string;
  bank_name: string;
  bank_branch: string;
  pf_applicable: boolean;
  esic_applicable: boolean;
  pt_applicable: boolean;
}

const EMPTY_FORM: NewEmployeeFormData = {
  full_name: "", phone: "", email: "", date_of_birth: "", gender: "",
  department: "", designation: "", date_of_joining: "", employee_code: "",
  salary_type: "fixed", basic_salary: "", hra: "", special_allowance: "", other_allowance: "",
  pan: "", aadhaar_last4: "", uan: "", bank_account: "", bank_ifsc: "", bank_name: "", bank_branch: "",
  pf_applicable: true, esic_applicable: false, pt_applicable: true,
};

const DEPARTMENTS = ["Engineering","Product","Design","HR","Sales","Finance","Production","Quality","Logistics","Procurement","Operations","Administration"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm"|"md"|"lg" }) {
  const colors = [
    "bg-indigo-100 text-indigo-700","bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700","bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700","bg-orange-100 text-orange-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-11 h-11 text-sm" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none`}>
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: Employee["status"] }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-amber-100 text-amber-700",
    terminated: "bg-red-100 text-red-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success"|"error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
      ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/> : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5"/></button>
    </div>
  );
}

// ─── Form Field components ────────────────────────────────────────────────────
function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors placeholder:text-gray-300";
const selectCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors appearance-none";

// ─── Add Employee Drawer (Onboarding) ─────────────────────────────────────────
function AddEmployeeDrawer({
  open,
  onClose,
  onSaved,
  orgId,
  onOrgIdResolved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (emp: Employee) => void;
  orgId: string;
  onOrgIdResolved: (id: string) => void;
}) {
  const supabase = useSupabase();
  const [step, setStep] = useState<1|2|3>(1);
  const [form, setForm] = useState<NewEmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewEmployeeFormData, string>>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);

  const set = (key: keyof NewEmployeeFormData, value: string | boolean) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => { const n = { ...p }; delete n[key]; return n; });
  };

  // ── IFSC auto-fill ──────────────────────────────────────────────────────────
  const lookupIFSC = async (ifsc: string) => {
    const clean = ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) return;
    setIfscLoading(true);
    setIfscVerified(false);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${clean}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setForm(p => ({
        ...p,
        bank_name: data.BANK || p.bank_name,
        bank_branch: data.BRANCH || p.bank_branch,
      }));
      setIfscVerified(true);
    } catch {
      setErrors(p => ({ ...p, bank_ifsc: "IFSC not found — check the code" }));
    } finally {
      setIfscLoading(false);
    }
  };

  const handleIfscChange = (val: string) => {
    const upper = val.toUpperCase();
    set("bank_ifsc", upper);
    setIfscVerified(false);
    if (upper.length === 11) lookupIFSC(upper);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: typeof errors = {};
    if (s === 1) {
      if (!form.full_name.trim()) errs.full_name = "Full name is required";
      else if (form.full_name.trim().split(" ").length < 2) errs.full_name = "Enter first and last name";
      if (!form.phone.trim()) errs.phone = "Mobile number is required";
      else {
        const cleaned = form.phone.trim().replace(/\s|-/g, "").replace(/^(\+91|0091|91|0)/, "");
        if (!/^[6-9]\d{9}$/.test(cleaned)) errs.phone = "Enter a valid 10-digit Indian mobile number";
      }
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address";
      if (!form.gender) errs.gender = "Please select gender";
    }
    if (s === 2) {
      if (!form.department) errs.department = "Department is required";
      if (!form.designation.trim()) errs.designation = "Designation is required";
      if (!form.date_of_joining) errs.date_of_joining = "Date of joining is required";
      else if (new Date(form.date_of_joining) > new Date()) errs.date_of_joining = "Joining date cannot be in the future";
      if (!form.basic_salary || isNaN(Number(form.basic_salary)) || Number(form.basic_salary) <= 0)
        errs.basic_salary = "Enter a valid basic salary";
      else if (Number(form.basic_salary) < 5000)
        errs.basic_salary = "Basic salary cannot be less than ₹5,000";
    }
    if (s === 3) {
      if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan.toUpperCase()))
        errs.pan = "Invalid PAN — format should be ABCDE1234F";
      if (form.aadhaar_last4 && !/^\d{4}$/.test(form.aadhaar_last4))
        errs.aadhaar_last4 = "Enter exactly 4 digits";
      if (form.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bank_ifsc.toUpperCase()))
        errs.bank_ifsc = "Invalid IFSC — format should be SBIN0001234";
      if (form.bank_account && form.bank_account.length < 9)
        errs.bank_account = "Account number too short";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep(p => (p < 3 ? (p + 1) as 1|2|3 : p)); };
  const back = () => setStep(p => (p > 1 ? (p - 1) as 1|2|3 : p));

  // ── ESIC auto-set ───────────────────────────────────────────────────────────
  const computedGross =
    Number(form.basic_salary || 0) +
    Number(form.hra || 0) +
    Number(form.special_allowance || 0) +
    Number(form.other_allowance || 0);

  useEffect(() => {
    if (computedGross > 0) {
      set("esic_applicable", computedGross <= 21000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedGross]);

  // ── Save ────────────────────────────────────────────────────────────────────
  // ── Auto-generate employee code ──────────────────────────────────────────────
  const generateEmployeeCode = async (resolvedOrgId: string): Promise<string> => {
    // Get org name for prefix — first 3 letters of org name, uppercase (ACME→ACM, Sharma→SHA)
    const { data: org } = await supabase
      .from("organizations").select("name").eq("id", resolvedOrgId).maybeSingle();

    const orgNameClean = (org?.name || "EMP")
      .replace(/[^a-zA-Z]/g, "")  // strip non-alpha (spaces, dots, Pvt, Ltd etc removed)
      .toUpperCase();

    const prefix = orgNameClean.slice(0, 3).padEnd(3, "X");  // ACM, SHA, NOR, etc.

    // Count current employees in this org to get next sequential number
    const { count } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("org_id", resolvedOrgId);

    const num = String((count || 0) + 1).padStart(3, "0");
    return `${prefix}${num}`;  // e.g. ACM001, SHA002, NOR003
  };

  const handleSave = async () => {
    if (!validateStep(3)) return;
    setSaving(true);
    try {
      let resolvedOrgId = orgId;
      if (!resolvedOrgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: ud } = await supabase.from("users").select("org_id").eq("id", user.id).maybeSingle();
          if (ud?.org_id) resolvedOrgId = ud.org_id;
        }
        if (!resolvedOrgId) {
          const { data: firstOrg } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
          if (firstOrg?.id) resolvedOrgId = firstOrg.id;
        }
      }
      if (!resolvedOrgId) throw new Error("No organization found. Please create one first.");
      if (resolvedOrgId !== orgId) onOrgIdResolved(resolvedOrgId);

      // Auto-generate code if not manually entered
      const autoCode = form.employee_code.trim() || await generateEmployeeCode(resolvedOrgId);

      const payload = {
        org_id: resolvedOrgId,
        employee_code: autoCode,
        full_name: form.full_name.trim(),
        phone: form.phone.trim().replace(/\s|-/g, "").replace(/^(\+91|0091|91|0)/, ""),
        email: form.email || null,
        department: form.department || null,
        designation: form.designation.trim() || null,
        date_of_joining: form.date_of_joining,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        pan: form.pan ? form.pan.toUpperCase() : null,
        aadhaar_last4: form.aadhaar_last4 || null,
        uan: form.uan || null,
        bank_account: form.bank_account || null,
        bank_ifsc: form.bank_ifsc ? form.bank_ifsc.toUpperCase() : null,
        bank_name: form.bank_name || null,
        salary_type: form.salary_type,
        basic_salary: Number(form.basic_salary),
        hra: Number(form.hra || 0),
        special_allowance: Number(form.special_allowance || 0),
        other_allowance: Number(form.other_allowance || 0),
        pf_applicable: form.pf_applicable,
        esic_applicable: form.esic_applicable,
        pt_applicable: form.pt_applicable,
        status: "active" as const,
        whatsapp_registered: false,
      };

      const { data, error } = await supabase.from("employees").insert(payload).select().single();
      if (error) throw error;

      onSaved(data as Employee);
      setForm(EMPTY_FORM);
      setStep(1);
      setIfscVerified(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save employee";
      setErrors({ full_name: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setStep(1);
    setErrors({});
    setIfscVerified(false);
    setFullscreen(false);
    onClose();
  };

  const steps = ["Personal", "Job & Salary", "Compliance & Bank"];
  const stepIcons = ["👤", "💼", "🏦"];

  if (!open) return null;

  const drawerWidth = fullscreen ? "w-full max-w-full" : "w-full max-w-[520px]";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={handleClose}/>

      <div className={`fixed right-0 top-0 h-full ${drawerWidth} bg-white shadow-2xl z-50 flex flex-col transition-all duration-200`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-indigo-600"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Onboard new employee</h2>
              <p className="text-xs text-gray-400">Step {step} of 3 — {steps[step - 1]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFullscreen(p => !p)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen
                ? <Minimize2 className="w-4 h-4 text-gray-500"/>
                : <Maximize2 className="w-4 h-4 text-gray-500"/>
              }
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500"/>
            </button>
          </div>
        </div>

        {/* ── Step progress bar ── */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className={`${fullscreen ? "max-w-2xl mx-auto" : ""}`}>
            <div className="flex gap-2 mb-3">
              {steps.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded-full transition-all duration-300 ${i < step ? "bg-indigo-600" : "bg-gray-200"}`}/>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {steps.map((s, i) => (
                <p key={s} className={`text-xs font-medium transition-colors ${i + 1 === step ? "text-indigo-600" : i + 1 < step ? "text-gray-500" : "text-gray-300"}`}>
                  {i + 1 < step ? "✓ " : ""}{s}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className={`px-6 py-5 ${fullscreen ? "max-w-2xl mx-auto" : ""}`}>

            {/* Step 1 — Personal */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"/>
                  <p className="text-xs text-blue-700">WhatsApp attendance bot will use the mobile number to track check-ins</p>
                </div>

                <Field label="Full name" required>
                  <input
                    className={`${inputCls} ${errors.full_name ? "border-red-300 focus:ring-red-200 focus:border-red-400" : ""}`}
                    placeholder="e.g. Rahul Sharma"
                    value={form.full_name}
                    onChange={e => set("full_name", e.target.value)}
                    autoFocus
                  />
                  {errors.full_name
                    ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.full_name}</p>
                    : form.full_name.trim().split(" ").length >= 2 && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Looks good</p>
                  }
                </Field>

                <Field label="Mobile number" required hint="10-digit Indian number — used for WhatsApp bot">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-400 font-medium select-none">+91</span>
                    <input
                      className={`${inputCls} pl-10 ${errors.phone ? "border-red-300 focus:ring-red-200 focus:border-red-400" : ""}`}
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      maxLength={10}
                    />
                    {form.phone.length === 10 && !errors.phone && (
                      <CheckCircle2 className="absolute right-3 top-2.5 w-4 h-4 text-emerald-500"/>
                    )}
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.phone}</p>}
                </Field>

                <Field label="Email address">
                  <input
                    className={`${inputCls} ${errors.email ? "border-red-300 focus:ring-red-200 focus:border-red-400" : ""}`}
                    type="email"
                    placeholder="rahul@company.com"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.email}</p>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of birth">
                    <input className={inputCls} type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                    />
                  </Field>
                  <Field label="Gender" required>
                    <div className="relative">
                      <select
                        className={`${selectCls} ${errors.gender ? "border-red-300" : ""}`}
                        value={form.gender}
                        onChange={e => set("gender", e.target.value)}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                    </div>
                    {errors.gender && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.gender}</p>}
                  </Field>
                </div>
              </div>
            )}

            {/* Step 2 — Job & Salary */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Department" required>
                    <div className="relative">
                      <select
                        className={`${selectCls} ${errors.department ? "border-red-300" : ""}`}
                        value={form.department}
                        onChange={e => set("department", e.target.value)}
                      >
                        <option value="">Select department</option>
                        {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                    </div>
                    {errors.department && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.department}</p>}
                  </Field>
                  <Field label="Designation" required>
                    <input
                      className={`${inputCls} ${errors.designation ? "border-red-300" : ""}`}
                      placeholder="e.g. Senior Engineer"
                      value={form.designation}
                      onChange={e => set("designation", e.target.value)}
                    />
                    {errors.designation && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.designation}</p>}
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of joining" required>
                    <input
                      className={`${inputCls} ${errors.date_of_joining ? "border-red-300" : ""}`}
                      type="date"
                      value={form.date_of_joining}
                      onChange={e => set("date_of_joining", e.target.value)}
                    />
                    {errors.date_of_joining && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.date_of_joining}</p>}
                  </Field>
                  <Field label="Employee code" hint="Auto-generated if left blank (e.g. srh001)">
                    <input
                      className={inputCls}
                      placeholder="Auto-generated (e.g. srh001)"
                      value={form.employee_code}
                      onChange={e => set("employee_code", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    />
                  </Field>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Salary structure</p>
                    <div className="relative">
                      <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white appearance-none pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        value={form.salary_type} onChange={e => set("salary_type", e.target.value)}>
                        <option value="fixed">Fixed salary</option>
                        <option value="variable">Variable salary</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400 pointer-events-none"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Basic salary (₹/mo)" required>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm text-gray-400">₹</span>
                        <input
                          className={`${inputCls} pl-7 ${errors.basic_salary ? "border-red-300" : ""}`}
                          type="number"
                          placeholder="25,000"
                          value={form.basic_salary}
                          onChange={e => set("basic_salary", e.target.value)}
                        />
                      </div>
                      {errors.basic_salary && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.basic_salary}</p>}
                    </Field>
                    <Field label="HRA (₹/mo)">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm text-gray-400">₹</span>
                        <input className={`${inputCls} pl-7`} type="number" placeholder="10,000" value={form.hra} onChange={e => set("hra", e.target.value)}/>
                      </div>
                    </Field>
                    <Field label="Special allowance (₹/mo)">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm text-gray-400">₹</span>
                        <input className={`${inputCls} pl-7`} type="number" placeholder="5,000" value={form.special_allowance} onChange={e => set("special_allowance", e.target.value)}/>
                      </div>
                    </Field>
                    <Field label="Other allowance (₹/mo)">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm text-gray-400">₹</span>
                        <input className={`${inputCls} pl-7`} type="number" placeholder="0" value={form.other_allowance} onChange={e => set("other_allowance", e.target.value)}/>
                      </div>
                    </Field>
                  </div>
                </div>

                {computedGross > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Gross salary</span>
                      <span className="text-xl font-bold text-indigo-900">{fmtINR(computedGross)}<span className="text-xs font-normal text-indigo-400">/mo</span></span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-1.5 bg-white/60 rounded-lg">
                        <p className="text-indigo-400 mb-0.5">PF (EE 12%)</p>
                        <p className="font-semibold text-red-600">-{fmtINR(Math.round(Math.min(Number(form.basic_salary), 15000) * 0.12))}</p>
                      </div>
                      <div className="text-center p-1.5 bg-white/60 rounded-lg">
                        <p className="text-indigo-400 mb-0.5">ESIC</p>
                        <p className="font-semibold text-red-600">{computedGross <= 21000 ? `-${fmtINR(Math.round(computedGross * 0.0075))}` : "Exempt"}</p>
                      </div>
                      <div className="text-center p-1.5 bg-white/60 rounded-lg">
                        <p className="text-indigo-400 mb-0.5">Est. net</p>
                        <p className="font-semibold text-emerald-700">{fmtINR(computedGross - Math.round(Math.min(Number(form.basic_salary), 15000) * 0.12) - (computedGross <= 21000 ? Math.round(computedGross * 0.0075) : 0))}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Compliance & Bank */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Encrypted & secure</p>
                    <p className="text-xs text-amber-700 mt-0.5">Aadhaar, PAN, and bank details are encrypted at rest. Only org admins can access this data.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="PAN" hint="Format: ABCDE1234F">
                    <input
                      className={`${inputCls} font-mono tracking-wider ${errors.pan ? "border-red-300" : form.pan.length === 10 && !errors.pan ? "border-emerald-300" : ""}`}
                      placeholder="ABCDE1234F"
                      value={form.pan}
                      onChange={e => set("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      maxLength={10}
                    />
                    {errors.pan
                      ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.pan}</p>
                      : form.pan.length === 10 && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Valid PAN format</p>
                    }
                  </Field>
                  <Field label="Aadhaar (last 4 digits)" hint="We store only last 4 digits">
                    <input
                      className={`${inputCls} font-mono tracking-widest ${errors.aadhaar_last4 ? "border-red-300" : ""}`}
                      placeholder="●●●● 1234"
                      value={form.aadhaar_last4}
                      onChange={e => set("aadhaar_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                    />
                    {errors.aadhaar_last4 && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.aadhaar_last4}</p>}
                  </Field>
                  <Field label="UAN (PF account number)">
                    <input className={`${inputCls} font-mono`} placeholder="100XXXXXXXXX" value={form.uan} onChange={e => set("uan", e.target.value.replace(/\D/g, "").slice(0, 12))} maxLength={12} inputMode="numeric"/>
                  </Field>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Bank details</p>

                  <Field label="IFSC code" hint="Auto-fills bank name and branch">
                    <div className="relative">
                      <input
                        className={`${inputCls} font-mono tracking-wider pr-10 ${errors.bank_ifsc ? "border-red-300" : ifscVerified ? "border-emerald-300" : ""}`}
                        placeholder="SBIN0001234"
                        value={form.bank_ifsc}
                        onChange={e => handleIfscChange(e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase())}
                        maxLength={11}
                      />
                      <div className="absolute right-3 top-2.5">
                        {ifscLoading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin"/>}
                        {ifscVerified && !ifscLoading && <CheckCircle2 className="w-4 h-4 text-emerald-500"/>}
                      </div>
                    </div>
                    {errors.bank_ifsc
                      ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.bank_ifsc}</p>
                      : ifscVerified && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Bank verified via Razorpay API</p>
                    }
                  </Field>

                  {/* Auto-filled bank info */}
                  {(form.bank_name || form.bank_branch) && (
                    <div className="mt-2 mb-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">{form.bank_name}</p>
                        {form.bank_branch && <p className="text-xs text-emerald-600">{form.bank_branch}</p>}
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0"/>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Field label="Account number">
                      <input
                        className={`${inputCls} font-mono ${errors.bank_account ? "border-red-300" : ""}`}
                        placeholder="123456789012"
                        value={form.bank_account}
                        onChange={e => set("bank_account", e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                      />
                      {errors.bank_account && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.bank_account}</p>}
                    </Field>
                    <Field label="Bank name">
                      <input
                        className={`${inputCls} ${ifscVerified ? "bg-gray-50 text-gray-600" : ""}`}
                        placeholder="Auto-filled from IFSC"
                        value={form.bank_name}
                        onChange={e => set("bank_name", e.target.value)}
                        readOnly={ifscVerified}
                      />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Statutory applicability</p>
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        key: "pf_applicable" as const,
                        label: "Provident Fund (PF)",
                        hint: "12% of basic (max ₹15k) deducted monthly",
                        badge: form.pf_applicable ? `Deduction: ${fmtINR(Math.round(Math.min(Number(form.basic_salary || 0), 15000) * 0.12))}/mo` : null,
                      },
                      {
                        key: "esic_applicable" as const,
                        label: "ESIC",
                        hint: computedGross > 0
                          ? computedGross <= 21000
                            ? `Auto-set — gross ₹${computedGross.toLocaleString()} ≤ ₹21,000`
                            : `Exempt — gross ₹${computedGross.toLocaleString()} > ₹21,000`
                          : "Applicable if gross ≤ ₹21,000/mo",
                        badge: form.esic_applicable && computedGross > 0 ? `${fmtINR(Math.round(computedGross * 0.0075))}/mo` : null,
                      },
                      {
                        key: "pt_applicable" as const,
                        label: "Professional Tax (PT)",
                        hint: "₹200/month — deducted per state rules",
                        badge: null,
                      },
                    ].map(item => (
                      <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${form[item.key] ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200 hover:border-gray-300"}
                        ${item.key === "esic_applicable" && computedGross > 0 ? "opacity-75 cursor-not-allowed" : ""}`}>
                        <input
                          type="checkbox"
                          checked={form[item.key] as boolean}
                          onChange={e => set(item.key, e.target.checked)}
                          disabled={item.key === "esic_applicable" && computedGross > 0}
                          className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-md font-medium">{item.badge}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{item.hint}</p>
                        </div>
                        {form[item.key] && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0"/>}
                      </label>
                    ))}
                  </div>
                </div>

                {errors.full_name && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>
                    <p className="text-sm text-red-700">{errors.full_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <div className={`flex items-center gap-3 ${fullscreen ? "max-w-2xl mx-auto" : ""}`}>
            {step > 1 ? (
              <button onClick={back} className="px-5 py-2.5 text-sm text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
                ← Back
              </button>
            ) : (
              <button onClick={handleClose} className="px-5 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
            )}
            <div className="flex-1 flex items-center gap-2">
              {step < 3 ? (
                <button onClick={next} className="flex-1 py-2.5 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] transition-colors flex items-center justify-center gap-2">
                  Continue <span className="text-white/70">({steps[step]} →)</span>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving employee...</>
                    : <><UserCheck className="w-4 h-4"/>Complete onboarding</>
                  }
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {step === 1 ? "Step 1 of 3 — basic info" : step === 2 ? "Step 2 of 3 — role & compensation" : "Step 3 of 3 — compliance & banking"}
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Employee Detail Slide-over ───────────────────────────────────────────────
function EmployeeDetailDrawer({ employee, open, onClose, onDelete }: {
  employee: Employee | null; open: boolean; onClose: () => void; onDelete: (id: string) => void;
}) {
  const supabase = useSupabase();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open || !employee) return null;

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("employees").update({ status: "terminated" }).eq("id", employee.id);
    setDeleting(false);
    if (!error) { onDelete(employee.id); onClose(); }
  };

  const gross = employee.gross_salary || (employee.basic_salary + employee.hra + employee.special_allowance + employee.other_allowance);
  const pf = Math.round(Math.min(employee.basic_salary, 15000) * 0.12);
  const esic = employee.esic_applicable ? Math.round(gross * 0.0075) : 0;
  const net = gross - pf - esic;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]" onClick={onClose}/>
      <div className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Employee profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500"/></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile header */}
          <div className="px-6 py-5 flex items-start gap-4 border-b border-gray-100">
            <Avatar name={employee.full_name} size="lg"/>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{employee.full_name}</h3>
              <p className="text-sm text-gray-500 truncate">{employee.designation} · {employee.department}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={employee.status}/>
                {employee.whatsapp_registered && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">WhatsApp ✓</span>
                )}
              </div>
            </div>
          </div>

          {/* Info sections */}
          <div className="px-6 py-4 flex flex-col gap-5">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0"/>{employee.phone}
                </div>
                {employee.email && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0"/>{employee.email}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Employment</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon:<Building2 className="w-3.5 h-3.5"/>, label:"Department", value:employee.department || "—" },
                  { icon:<Briefcase className="w-3.5 h-3.5"/>, label:"Employee code", value:employee.employee_code || "—" },
                  { icon:<Calendar className="w-3.5 h-3.5"/>, label:"Joined", value:fmtDate(employee.date_of_joining) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">{item.icon}<span className="text-xs">{item.label}</span></div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Salary breakdown</p>
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                {[
                  ["Basic", fmtINR(employee.basic_salary), "text-gray-700"],
                  ["HRA", fmtINR(employee.hra), "text-gray-700"],
                  ["Special allowance", fmtINR(employee.special_allowance), "text-gray-700"],
                  ["Gross", fmtINR(gross), "text-gray-900 font-bold"],
                  ["PF (employee)", `-${fmtINR(pf)}`, "text-red-600"],
                  ...(esic > 0 ? [["ESIC (employee)", `-${fmtINR(esic)}`, "text-red-600"] as [string,string,string]] : []),
                  ["Net take-home", fmtINR(net), "text-emerald-700 font-bold"],
                ].map(([label, value, cls]) => (
                  <div key={label} className={`flex justify-between items-center text-sm ${label === "Gross" || label === "Net take-home" ? "pt-2 mt-1 border-t border-gray-200" : ""}`}>
                    <span className="text-gray-500 text-xs">{label}</span>
                    <span className={`text-xs font-mono ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Compliance</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label:"PF", active:employee.pf_applicable },
                  { label:"ESIC", active:employee.esic_applicable },
                  { label:"PT", active:employee.pt_applicable },
                ].map(c => (
                  <span key={c.label} className={`px-3 py-1 rounded-full text-xs font-semibold border ${c.active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-100 border-gray-200 text-gray-400"}`}>
                    {c.label} {c.active ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5"/>Edit
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="py-2 px-4 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5"/>Terminate
            </button>
          ) : (
            <button onClick={handleDelete} disabled={deleting} className="py-2 px-4 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-60">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
              Confirm
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Add Organization Modal ───────────────────────────────────────────────────
interface OrgForm {
  name: string;
  state: string;
  industry: string;
  gstin: string;
  address: string;
  city: string;
}

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh",
];

const INDUSTRIES = [
  "Manufacturing","Trading / Distribution","IT & Software","Retail",
  "Construction","Healthcare","Education","Hospitality","Finance",
  "Logistics","Real Estate","Professional Services","Other",
];

function AddOrgModal({ onCreated }: { onCreated: (orgId: string, orgName: string) => void }) {
  const supabase = useSupabase();
  const [form, setForm] = useState<OrgForm>({
    name: "", state: "Maharashtra", industry: "Manufacturing",
    gstin: "", address: "", city: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<OrgForm>>({});

  const set = (k: keyof OrgForm, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Partial<OrgForm> = {};
    if (!form.name.trim()) e.name = "Organization name is required";
    if (!form.state) e.state = "State is required";
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin.toUpperCase()))
      e.gstin = "Invalid GSTIN format";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: form.name.trim(),
          state: form.state,
          industry: form.industry,
          gstin: form.gstin.toUpperCase() || null,
          address: form.address || null,
          city: form.city || null,
          plan: "starter",
          plan_status: "trial",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      onCreated(data.id, data.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create organization";
      setErrors({ name: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600"/>
            </div>
            <h2 className="text-base font-bold text-gray-900">Set up your organization</h2>
          </div>
          <p className="text-xs text-gray-400 ml-12">This is required before adding employees</p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700">You only need to do this once. All employees will be linked to this organization.</p>
          </div>

          <Field label="Organization / Company name" required>
            <input
              className={`${inputCls} ${errors.name ? "border-red-300" : ""}`}
              placeholder="e.g. Sharma Manufacturing Pvt Ltd"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.name}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="State" required>
              <div className="relative">
                <select
                  className={`${selectCls} ${errors.state ? "border-red-300" : ""}`}
                  value={form.state}
                  onChange={e => set("state", e.target.value)}
                >
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
              </div>
            </Field>
            <Field label="Industry">
              <div className="relative">
                <select className={selectCls} value={form.industry} onChange={e => set("industry", e.target.value)}>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input className={inputCls} placeholder="e.g. Pune" value={form.city} onChange={e => set("city", e.target.value)}/>
            </Field>
            <Field label="GSTIN" hint="Optional — 15-digit GST number">
              <input
                className={`${inputCls} font-mono tracking-wider ${errors.gstin ? "border-red-300" : ""}`}
                placeholder="27XXXXX1234X1Z5"
                value={form.gstin}
                onChange={e => set("gstin", e.target.value.toUpperCase())}
                maxLength={15}
              />
              {errors.gstin && <p className="text-xs text-red-500 mt-1">{errors.gstin}</p>}
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin"/>Creating organization...</>
              : <><CheckCircle2 className="w-4 h-4"/>Create organization & continue</>
            }
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">14-day free trial · No credit card required</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const supabase = useSupabase();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [showOrgModal, setShowOrgModal] = useState(false);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success"|"error" } | null>(null);

  // ── Resolve org then fetch employees ─────────────────────────────────────────
  const resolveOrgAndFetch = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedOrgId = orgId;

      if (!resolvedOrgId) {
        // 1. Check localStorage (set by sidebar org switcher)
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("activeOrgId");
          const storedName = localStorage.getItem("activeOrgName");
          if (stored) {
            resolvedOrgId = stored;
            if (storedName) setOrgName(storedName);
          }
        }
      }

      if (!resolvedOrgId) {
        // 2. Try logged-in user's org
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: ud } = await supabase
            .from("users").select("org_id").eq("id", user.id).maybeSingle();
          if (ud?.org_id) resolvedOrgId = ud.org_id;
        }
      }

      if (!resolvedOrgId) {
        // 3. Dev fallback — grab first org in DB
        const { data: firstOrg } = await supabase
          .from("organizations").select("id, name").order("created_at").limit(1).maybeSingle();
        if (firstOrg?.id) {
          resolvedOrgId = firstOrg.id;
          setOrgName(firstOrg.name);
        }
      }

      // 4. No org found — show create org modal
      if (!resolvedOrgId) {
        setShowOrgModal(true);
        setLoading(false);
        return;
      }

      setOrgId(resolvedOrgId);

      // Fetch org name if not set
      if (!orgName) {
        const { data: org } = await supabase
          .from("organizations").select("name").eq("id", resolvedOrgId).maybeSingle();
        if (org?.name) {
          setOrgName(org.name);
          if (typeof window !== "undefined") {
            localStorage.setItem("activeOrgId", resolvedOrgId);
            localStorage.setItem("activeOrgName", org.name);
          }
        }
      }

      // Fetch ONLY this org's employees — strict filter
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("org_id", resolvedOrgId)
        .neq("status", "terminated")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data as Employee[]);
    } catch (err) {
      console.error("Fetch error:", err);
      setToast({ message: "Failed to load employees", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [supabase, orgId, orgName]);

  useEffect(() => { resolveOrgAndFetch(); }, [resolveOrgAndFetch]);

  // ── Realtime — org-scoped only ────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`employees:${orgId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "employees",
        filter: `org_id=eq.${orgId}`,
      }, () => resolveOrgAndFetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, supabase, resolveOrgAndFetch]);

  // ── Listen for org switch from sidebar ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { orgId: newOrgId, orgName: newOrgName } = (e as CustomEvent).detail;
      setOrgId(newOrgId);
      setOrgName(newOrgName);
      setEmployees([]);
    };
    window.addEventListener("orgSwitch", handler);
    return () => window.removeEventListener("orgSwitch", handler);
  }, []);

  // ── Org created callback ───────────────────────────────────────────────────────
  const handleOrgCreated = (newOrgId: string, newOrgName: string) => {
    setOrgId(newOrgId);
    setOrgName(newOrgName);
    setShowOrgModal(false);
    setToast({ message: `Organization "${newOrgName}" created!`, type: "success" });
    resolveOrgAndFetch();
  };

  // ── Filtered list — always org-scoped ────────────────────────────────────────
  const filtered = employees.filter(e => {
    const matchSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_code?.toLowerCase().includes(search.toLowerCase())) ||
      (e.email?.toLowerCase().includes(search.toLowerCase()));
    const matchDept = !deptFilter || e.department === deptFilter;
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const active = employees.filter(e => e.status === "active").length;
  const pfCount = employees.filter(e => e.pf_applicable).length;
  const esicCount = employees.filter(e => e.esic_applicable).length;
  const avgSalary = employees.length > 0
    ? Math.round(employees.reduce((a, e) => a + e.basic_salary, 0) / employees.length)
    : 0;

  const handleSaved = (emp: Employee) => {
    setEmployees(p => [emp, ...p]);
    setToast({ message: `${emp.full_name} onboarded successfully`, type: "success" });
  };

  const handleDelete = (id: string) => {
    setEmployees(p => p.filter(e => e.id !== id));
    setToast({ message: "Employee terminated", type: "success" });
  };

  return (
    <div className="flex flex-col gap-5 min-h-full">

      {/* Org modal */}
      {showOrgModal && <AddOrgModal onCreated={handleOrgCreated}/>}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Employees</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orgName ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3"/>
                {orgName} · {active} active · {employees.length} total
              </span>
            ) : (
              `${active} active · ${employees.length} total`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resolveOrgAndFetch} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500"/>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4"/>Bulk import
          </button>
          <button
            onClick={() => {
              if (!orgId) { setShowOrgModal(true); return; }
              setDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <Plus className="w-4 h-4"/>Onboard employee
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:<Users className="w-4 h-4"/>, label:"Total employees", value:employees.length, sub:"All statuses", color:"text-blue-600", bg:"bg-blue-50" },
          { icon:<UserCheck className="w-4 h-4"/>, label:"Active", value:active, sub:"Currently employed", color:"text-emerald-600", bg:"bg-emerald-50" },
          { icon:<Shield className="w-4 h-4"/>, label:"PF enrolled", value:`${pfCount}/${employees.length}`, sub:`${esicCount} on ESIC`, color:"text-indigo-600", bg:"bg-indigo-50" },
          { icon:<IndianRupee className="w-4 h-4"/>, label:"Avg basic salary", value:fmtINR(avgSalary), sub:"per month", color:"text-amber-600", bg:"bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
          <input
            type="text"
            placeholder="Search by name, code, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
        </div>
        <div className="relative">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none text-gray-600">
            <option value="">All departments</option>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none text-gray-600">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
        </div>
        {(search || deptFilter || statusFilter) && (
          <button onClick={() => { setSearch(""); setDeptFilter(""); setStatusFilter(""); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5"/>Clear
          </button>
        )}
      </div>

      {/* Employee table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin"/>
            <span className="text-sm text-gray-500">Loading employees...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-400"/>
            </div>
            <p className="text-sm font-semibold text-gray-600">
              {employees.length === 0 ? "No employees yet" : "No employees match your filters"}
            </p>
            <p className="text-xs text-gray-400">
              {employees.length === 0 ? "Onboard your first employee to get started" : "Try adjusting your search or filters"}
            </p>
            {employees.length === 0 && (
              <button
                onClick={() => { if (!orgId) { setShowOrgModal(true); return; } setDrawerOpen(true); }}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b] transition-colors"
              >
                <Plus className="w-4 h-4"/>Onboard first employee
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Employee","Department","Joined","Gross salary","Status","PF/ESIC",""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(emp => {
                    const gross = emp.gross_salary || (emp.basic_salary + emp.hra + emp.special_allowance + emp.other_allowance);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => { setSelectedEmp(emp); setDetailOpen(true); }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.full_name}/>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                              <p className="text-xs text-gray-400">{emp.designation || "—"} {emp.employee_code ? `· ${emp.employee_code}` : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">{emp.department || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(emp.date_of_joining)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{fmtINR(gross)}</td>
                        <td className="px-4 py-3"><StatusBadge status={emp.status}/></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {emp.pf_applicable && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-semibold">PF</span>}
                            {emp.esic_applicable && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-semibold">ESIC</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-400"/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">Showing {filtered.length} of {employees.length} employees · {orgName}</p>
              <p className="text-xs text-gray-400">Click any row to view full profile</p>
            </div>
          </>
        )}
      </div>

      {/* Drawers */}
      <AddEmployeeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        orgId={orgId}
        onOrgIdResolved={(id) => setOrgId(id)}
      />
      <EmployeeDetailDrawer
        employee={selectedEmp}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDelete={handleDelete}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  );
}