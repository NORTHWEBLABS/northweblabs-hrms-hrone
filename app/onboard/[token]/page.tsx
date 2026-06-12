"use client";
// Route: app/onboard/[token]/page.tsx
// Self-onboarding for new employees via invite link
// 3 steps: Personal → Job & Salary → Compliance & Bank
// Matches screenshots exactly

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  User, Check, AlertCircle, Loader2, Shield,
  ChevronLeft, ChevronRight, CheckCircle2, X,
  Building2, BadgeCheck, Maximize2,
} from "lucide-react";

function useSB() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface InviteInfo {
  id: string;
  org_id: string;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
  designation_id: string | null;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  invite_expires_at: string | null;
  onboarding_completed: boolean;
}

interface Department { id: string; name: string; }
interface Designation { id: string; name: string; department_id: string | null; }

interface IFSCResult {
  BANK: string;
  BRANCH: string;
  CITY: string;
  STATE: string;
  verified: boolean;
}

// ─── Salary structure types ───────────────────────────────────────────────────
type SalaryType = "fixed" | "ctc";
interface SalaryForm {
  type: SalaryType;
  basic: string;
  hra: string;
  special_allowance: string;
  other_allowance: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputBase = "w-full border rounded-xl text-sm outline-none transition-all px-4 py-3 bg-white placeholder:text-gray-400";
const inputNormal = inputBase + " border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const inputError = inputBase + " border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100";

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{msg}</p>;
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-gray-800 mb-2">{text}{required && <span className="text-red-500 ml-0.5">*</span>}</label>;
}

// ─── STEP 1: Personal ─────────────────────────────────────────────────────────
function StepPersonal({ data, onChange, errors }: {
  data: { full_name: string; phone: string; email: string; dob: string; gender: string };
  onChange: (k: string, v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {/* WhatsApp notice */}
      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
        <p className="text-sm text-indigo-700">WhatsApp attendance bot will use the mobile number to track check-ins</p>
      </div>

      {/* Full name */}
      <div>
        <Label text="Full name" required />
        <input value={data.full_name} onChange={e => onChange("full_name", e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className={errors.full_name ? inputError : inputNormal} />
        <FieldErr msg={errors.full_name} />
      </div>

      {/* Mobile */}
      <div>
        <Label text="Mobile number" required />
        <div className={`flex items-center border rounded-xl overflow-hidden bg-white transition-all ${errors.phone ? "border-red-400 ring-2 ring-red-100" : "border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"}`}>
          <span className="px-4 py-3 text-sm font-semibold text-gray-500 border-r border-gray-200 bg-gray-50 flex-shrink-0">+91</span>
          <input value={data.phone} onChange={e => onChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210" type="tel" maxLength={10}
            className="flex-1 px-4 py-3 text-sm outline-none bg-transparent" />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">10-digit Indian number — used for WhatsApp bot</p>
        <FieldErr msg={errors.phone} />
      </div>

      {/* Email */}
      <div>
        <Label text="Email address" />
        <input value={data.email} onChange={e => onChange("email", e.target.value)}
          placeholder="rahul@company.com" type="email"
          className={inputNormal} />
      </div>

      {/* DOB + Gender */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Date of birth" />
          <input value={data.dob} onChange={e => onChange("dob", e.target.value)}
            type="date" max={new Date().toISOString().split("T")[0]}
            className={inputNormal} />
        </div>
        <div>
          <Label text="Gender" required />
          <select value={data.gender} onChange={e => onChange("gender", e.target.value)}
            className={errors.gender ? inputError + " appearance-none" : inputNormal + " appearance-none"}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          <FieldErr msg={errors.gender} />
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2: Job & Salary ─────────────────────────────────────────────────────
function StepJobSalary({ data, onChange, salary, onSalary, departments, designations, errors }: {
  data: { department_id: string; designation: string; doj: string; employee_code: string };
  onChange: (k: string, v: string) => void;
  salary: SalaryForm;
  onSalary: (k: keyof SalaryForm, v: string) => void;
  departments: Department[];
  designations: Designation[];
  errors: Record<string, string>;
}) {
  const filteredDesig = data.department_id
    ? designations.filter(d => !d.department_id || d.department_id === data.department_id)
    : designations;

  // Calculate gross
  const gross = [salary.basic, salary.hra, salary.special_allowance, salary.other_allowance]
    .map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Dept + Designation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Department" required />
          <select value={data.department_id} onChange={e => onChange("department_id", e.target.value)}
            className={errors.department_id ? inputError + " appearance-none" : inputNormal + " appearance-none"}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <FieldErr msg={errors.department_id} />
        </div>
        <div>
          <Label text="Designation" required />
          <input value={data.designation} onChange={e => onChange("designation", e.target.value)}
            placeholder="e.g. Software Engineer"
            className={errors.designation ? inputError : inputNormal} />
          <FieldErr msg={errors.designation} />
        </div>
      </div>

      {/* DOJ + Employee code */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Date of joining" required />
          <input value={data.doj} onChange={e => onChange("doj", e.target.value)}
            type="date"
            className={errors.doj ? inputError : inputNormal} />
          <FieldErr msg={errors.doj} />
        </div>
        <div>
          <Label text="Employee code" />
          <input value={data.employee_code} onChange={e => onChange("employee_code", e.target.value)}
            placeholder="Auto-generated (e.g. srh001)"
            className={inputNormal} />
          <p className="text-xs text-gray-400 mt-1.5">Auto-generated if left blank (e.g. srh001)</p>
        </div>
      </div>

      {/* Salary structure */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Salary Structure</p>
          <select value={salary.type} onChange={e => onSalary("type", e.target.value as SalaryType)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:border-indigo-400 appearance-none">
            <option value="fixed">Fixed salary</option>
            <option value="ctc">CTC based</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "basic" as keyof SalaryForm, label: "Basic salary (₹/mo)", placeholder: "25,000", required: true },
            { key: "hra" as keyof SalaryForm, label: "HRA (₹/mo)", placeholder: "10,000" },
            { key: "special_allowance" as keyof SalaryForm, label: "Special allowance (₹/mo)", placeholder: "5,000" },
            { key: "other_allowance" as keyof SalaryForm, label: "Other allowance (₹/mo)", placeholder: "0" },
          ].map(f => (
            <div key={f.key}>
              <Label text={f.label} required={f.required} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                <input
                  value={salary[f.key]}
                  onChange={e => onSalary(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  type="number" min="0"
                  className={`${f.key === "basic" && errors.basic ? inputError : inputNormal} pl-7`} />
              </div>
              {f.key === "basic" && <FieldErr msg={errors.basic} />}
            </div>
          ))}
        </div>

        {gross > 0 && (
          <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
            <span className="text-sm text-indigo-700 font-medium">Gross salary / month</span>
            <span className="text-base font-bold text-indigo-800">₹{gross.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STEP 3: Compliance & Bank ────────────────────────────────────────────────
function StepCompliance({ data, onChange, gross, errors }: {
  data: {
    pan: string; aadhaar_last4: string; uan: string;
    ifsc: string; account_number: string; bank_name: string;
    pf: boolean; esic: boolean; pt: boolean;
  };
  onChange: (k: string, v: any) => void;
  gross: number;
  errors: Record<string, string>;
}) {
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscResult, setIfscResult]   = useState<IFSCResult | null>(null);
  const [ifscError, setIfscError]     = useState("");
  const ifscTimer = useRef<NodeJS.Timeout | null>(null);

  // PF deduction: 12% of basic (max ₹15,000 basic → ₹1,800)
  const pfDeduction = Math.min(1800, Math.round(gross * 0.12));
  // ESIC: applicable only if gross <= 21,000
  const esicApplicable = gross > 0 && gross <= 21000;

  // IFSC auto-lookup via Razorpay API
  const lookupIFSC = useCallback(async (ifsc: string) => {
    if (ifsc.length < 11) { setIfscResult(null); setIfscError(""); return; }
    setIfscLoading(true); setIfscError("");
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      const result: IFSCResult = { BANK: json.BANK, BRANCH: json.BRANCH, CITY: json.CITY, STATE: json.STATE, verified: true };
      setIfscResult(result);
      onChange("bank_name", json.BANK);
    } catch {
      setIfscResult(null);
      setIfscError("IFSC not found. Please verify.");
      onChange("bank_name", "");
    } finally {
      setIfscLoading(false);
    }
  }, [onChange]);

  const handleIFSC = (val: string) => {
    onChange("ifsc", val.toUpperCase());
    setIfscResult(null); setIfscError("");
    if (ifscTimer.current) clearTimeout(ifscTimer.current);
    if (val.length === 11) {
      ifscTimer.current = setTimeout(() => lookupIFSC(val), 400);
    }
  };

  return (
    <div className="space-y-6">
      {/* Security notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Encrypted & secure</p>
          <p className="text-xs text-amber-700 mt-0.5">Aadhaar, PAN, and bank details are encrypted at rest. Only org admins can access this data.</p>
        </div>
      </div>

      {/* PAN + Aadhaar */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="PAN" />
          <input value={data.pan} onChange={e => onChange("pan", e.target.value.toUpperCase())}
            placeholder="ABCDE1234F" maxLength={10}
            className={errors.pan ? inputError : inputNormal} />
          <p className="text-xs text-gray-400 mt-1">Format: ABCDE1234F</p>
          <FieldErr msg={errors.pan} />
        </div>
        <div>
          <Label text="Aadhaar (last 4 digits)" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-0.5">
              {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-gray-300" />)}
            </span>
            <input value={data.aadhaar_last4}
              onChange={e => onChange("aadhaar_last4", e.target.value.replace(/\D/g,"").slice(0,4))}
              placeholder="1234" maxLength={4}
              className={inputNormal + " pl-12"} />
          </div>
          <p className="text-xs text-gray-400 mt-1">We store only last 4 digits</p>
        </div>
      </div>

      {/* UAN */}
      <div>
        <Label text="UAN (PF account number)" />
        <input value={data.uan} onChange={e => onChange("uan", e.target.value)}
          placeholder="100XXXXXXXXX"
          className={inputNormal} />
      </div>

      {/* Bank Details */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bank Details</p>

        {/* IFSC */}
        <div className="mb-3">
          <Label text="IFSC code" />
          <div className="relative">
            <input value={data.ifsc} onChange={e => handleIFSC(e.target.value)}
              placeholder="SBIN0001234" maxLength={11}
              className={`${ifscError ? inputError : inputNormal} pr-10 uppercase`} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {ifscLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                : ifscResult ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : null}
            </div>
          </div>
          {ifscResult && (
            <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">{ifscResult.BANK}</p>
                <p className="text-xs text-emerald-600">{ifscResult.BRANCH}, {ifscResult.CITY}</p>
              </div>
            </div>
          )}
          {ifscResult && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />Bank verified via Razorpay API
            </p>
          )}
          {ifscError && <p className="text-xs text-red-500 mt-1">{ifscError}</p>}
          <p className="text-xs text-gray-400 mt-1">Auto-fills bank name and branch</p>
        </div>

        {/* Account + Bank name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label text="Account number" />
            <input value={data.account_number} onChange={e => onChange("account_number", e.target.value)}
              placeholder="123456789012"
              className={inputNormal} />
          </div>
          <div>
            <Label text="Bank name" />
            <input value={data.bank_name} readOnly={!!ifscResult}
              onChange={e => onChange("bank_name", e.target.value)}
              placeholder={ifscResult ? "" : "Auto-filled from IFSC"}
              className={inputNormal + (ifscResult ? " bg-gray-50 text-gray-600" : "")} />
          </div>
        </div>
      </div>

      {/* Statutory applicability */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Statutory Applicability</p>
        <div className="space-y-2">
          {/* PF */}
          <label className={`flex items-center gap-3 border rounded-2xl px-4 py-3.5 cursor-pointer transition-all ${data.pf ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white"}`}>
            <input type="checkbox" checked={data.pf} onChange={e => onChange("pf", e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">Provident Fund (PF)</p>
                {data.pf && gross > 0 && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Deduction: ₹{pfDeduction.toLocaleString("en-IN")}/mo</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">12% of basic (max ₹15k) deducted monthly</p>
            </div>
            {data.pf && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
          </label>

          {/* ESIC */}
          <label className={`flex items-center gap-3 border rounded-2xl px-4 py-3.5 cursor-pointer transition-all ${!esicApplicable ? "opacity-60 cursor-not-allowed" : data.esic ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white"}`}>
            <input type="checkbox" checked={data.esic} disabled={!esicApplicable}
              onChange={e => onChange("esic", e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded disabled:cursor-not-allowed" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">ESIC</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {esicApplicable
                  ? "3.25% employee + 0.75% employer contribution"
                  : `Exempt — gross ₹${gross.toLocaleString("en-IN")} > ₹21,000`}
              </p>
            </div>
            {data.esic && esicApplicable && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
          </label>

          {/* PT */}
          <label className={`flex items-center gap-3 border rounded-2xl px-4 py-3.5 cursor-pointer transition-all ${data.pt ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white"}`}>
            <input type="checkbox" checked={data.pt} onChange={e => onChange("pt", e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Professional Tax (PT)</p>
              <p className="text-xs text-gray-500 mt-0.5">₹200/month — deducted per state rules</p>
            </div>
            {data.pt && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
export default function OnboardPage() {
  const params    = useParams();
  const router    = useRouter();
  const sb        = useSB();
  const token     = params?.token as string;

  const [step, setStep]       = useState(1);
  const [invite, setInvite]   = useState<InviteInfo | null>(null);
  const [depts, setDepts]     = useState<Department[]>([]);
  const [desigs, setDesigs]   = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");
  const [errors, setErrors]   = useState<Record<string,string>>({});

  // Form state
  const [personal, setPersonal] = useState({ full_name: "", phone: "", email: "", dob: "", gender: "" });
  const [job, setJob] = useState({ department_id: "", designation: "", doj: new Date().toISOString().split("T")[0], employee_code: "" });
  const [salary, setSalary] = useState<SalaryForm>({ type: "fixed", basic: "", hra: "", special_allowance: "", other_allowance: "" });
  const [compliance, setCompliance] = useState({
    pan: "", aadhaar_last4: "", uan: "",
    ifsc: "", account_number: "", bank_name: "",
    pf: true, esic: false, pt: true,
  });

  // Gross for statutory calc
  const gross = [salary.basic, salary.hra, salary.special_allowance, salary.other_allowance]
    .map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0);

  // ── Validate invite token ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError("Invalid invite link."); setLoading(false); return; }
    (async () => {
      const { data, error: err } = await sb
        .from("employees")
        .select("id, org_id, full_name, email, department_id, designation_id, invite_expires_at, onboarding_completed, department:departments(id,name), designation:designations(id,name)")
        .eq("invite_token", token)
        .maybeSingle();

      if (err || !data) { setError("This invite link is invalid or has expired."); setLoading(false); return; }
      if (data.onboarding_completed) { setError("Onboarding already completed. Please log in."); setLoading(false); return; }
      if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) { setError("This invite link has expired. Ask HR to generate a new one."); setLoading(false); return; }

      setInvite(data as InviteInfo);
      setPersonal(p => ({
        ...p,
        full_name: data.full_name || "",
        email: data.email || "",
      }));
      if (data.department_id) setJob(j => ({ ...j, department_id: data.department_id! }));
      if ((data.designation as any)?.name) setJob(j => ({ ...j, designation: (data.designation as any).name }));

      // Load departments + designations for org
      const [dRes, dsRes] = await Promise.all([
        sb.from("departments").select("id,name").eq("org_id", data.org_id).order("name"),
        sb.from("designations").select("id,name,department_id").eq("org_id", data.org_id).order("name"),
      ]);
      setDepts((dRes.data || []) as Department[]);
      setDesigs((dsRes.data || []) as Designation[]);
      setLoading(false);
    })();
  }, [token, sb]);

  // ── Validators ────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!personal.full_name.trim()) e.full_name = "Full name is required";
    if (!personal.phone.trim()) e.phone = "Mobile number is required";
    else if (personal.phone.length !== 10) e.phone = "Enter a valid 10-digit number";
    if (!personal.gender) e.gender = "Please select gender";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!job.department_id) e.department_id = "Please select a department";
    if (!job.designation.trim()) e.designation = "Designation is required";
    if (!job.doj) e.doj = "Date of joining is required";
    if (!salary.basic.trim() || parseFloat(salary.basic) <= 0) e.basic = "Basic salary is required";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setErrors({});
    setStep(s => s + 1);
  };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!invite) return;
    setSaving(true);
    try {
      // 1. Update employee record
      const { error: upErr } = await sb.from("employees").update({
        full_name:               personal.full_name.trim(),
        phone:                   "+91" + personal.phone,
        email:                   personal.email || invite.email,
        date_of_birth:           personal.dob || null,
        gender:                  personal.gender || null,
        department_id:           job.department_id || null,
        designation_id:          null, // designation entered as text below
        date_of_joining:         job.doj,
        employee_code:           job.employee_code || null,
        salary:                  gross || parseFloat(salary.basic) || null,
        pan_number:              compliance.pan || null,
        aadhar_number:           compliance.aadhaar_last4 || null,
        bank_ifsc:               compliance.ifsc || null,
        bank_account:            compliance.account_number || null,
        bank_name:               compliance.bank_name || null,
        onboarding_completed:    true,
        invite_token:            null, // invalidate token
        updated_at:              new Date().toISOString(),
      }).eq("id", invite.id);

      if (upErr) throw upErr;

      // 2. Save designation if it doesn't exist yet
      if (job.designation.trim()) {
        const { data: existDesig } = await sb.from("designations")
          .select("id").eq("org_id", invite.org_id).eq("name", job.designation.trim()).maybeSingle();
        let desigId = existDesig?.id;
        if (!desigId) {
          const { data: newDesig } = await sb.from("designations")
            .insert({ org_id: invite.org_id, name: job.designation.trim(), department_id: job.department_id || null })
            .select().single();
          desigId = newDesig?.id;
        }
        if (desigId) await sb.from("employees").update({ designation_id: desigId }).eq("id", invite.id);
      }

      // 3. Seed leave balances
      await sb.from("leave_balances").upsert([
        { employee_id: invite.id, leave_type: "Casual Leave",  total: 12, used: 0 },
        { employee_id: invite.id, leave_type: "Sick Leave",    total: 10, used: 0 },
        { employee_id: invite.id, leave_type: "Earned Leave",  total: 15, used: 0 },
        { employee_id: invite.id, leave_type: "Compensatory",  total: 5,  used: 0 },
      ], { onConflict: "employee_id,leave_type" });

      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Step config ──────────────────────────────────────────────────────────
  const STEPS = [
    { label: "Personal",          icon: <User className="w-4 h-4" /> },
    { label: "Job & Salary",      icon: <Building2 className="w-4 h-4" /> },
    { label: "Compliance & Bank", icon: <Shield className="w-4 h-4" /> },
  ];

  // ─── Loading / error / done states ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-600 font-medium">Verifying invite link…</span>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <a href="/employee-login" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700">
            Go to login
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set! 🎉</h2>
          <p className="text-gray-500 text-sm mb-2">Onboarding complete. Welcome to the team!</p>
          <p className="text-gray-400 text-xs mb-8">HR will review your details and activate your account. You'll receive an email with your login credentials.</p>
          <a href="/employee-login"
            className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            Go to Employee Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: "96vh" }}>

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Onboard new employee</h2>
              <p className="text-xs text-gray-500">Step {step} of {STEPS.length} — {STEPS[step-1].label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400"><Maximize2 className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Progress bar + step labels ── */}
        <div className="px-6 pb-4 flex-shrink-0">
          {/* Bar */}
          <div className="flex gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-200">
                <div className={`h-full rounded-full transition-all duration-500 ${i < step ? "bg-indigo-600" : ""}`}
                  style={{ width: i < step ? "100%" : "0%" }} />
              </div>
            ))}
          </div>
          {/* Labels */}
          <div className="flex">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1">
                <p className={`text-xs font-semibold transition-colors ${i + 1 === step ? "text-indigo-600" : i + 1 < step ? "text-gray-500" : "text-gray-300"}`}>
                  {i + 1 < step && <span className="inline-block mr-1">✓</span>}{s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Step content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {step === 1 && (
            <StepPersonal
              data={personal}
              onChange={(k, v) => setPersonal(p => ({ ...p, [k]: v }))}
              errors={errors}
            />
          )}
          {step === 2 && (
            <StepJobSalary
              data={job}
              onChange={(k, v) => setJob(j => ({ ...j, [k]: v }))}
              salary={salary}
              onSalary={(k, v) => setSalary(s => ({ ...s, [k]: v }))}
              departments={depts}
              designations={desigs}
              errors={errors}
            />
          )}
          {step === 3 && (
            <StepCompliance
              data={compliance}
              onChange={(k, v) => setCompliance(c => ({ ...c, [k]: v }))}
              gross={gross}
              errors={errors}
            />
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Footer navigation ── */}
        <div className="px-6 py-4 flex items-center justify-between bg-white flex-shrink-0">
          {step > 1
            ? <button onClick={back} className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />Back
              </button>
            : <button className="text-sm text-gray-400 hover:text-gray-600 px-2">Cancel</button>}

          {step < 3
            ? <button onClick={next}
                className="flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white font-bold text-sm rounded-2xl hover:bg-[#16213e] transition-colors">
                Continue ({STEPS[step].label} <ChevronRight className="w-4 h-4" />)
              </button>
            : <button onClick={submit} disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><BadgeCheck className="w-4 h-4" />Complete onboarding</>}
              </button>}
        </div>

        {/* Step hint */}
        <div className="pb-4 text-center">
          <p className="text-xs text-gray-400">Step {step} of {STEPS.length} — {step === 1 ? "basic info" : step === 2 ? "role & compensation" : "compliance & banking"}</p>
        </div>
      </div>
    </div>
  );
}