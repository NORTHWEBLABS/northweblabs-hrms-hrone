"use client";
// Route: app/(dashboard)/employees/add/page.tsx
// Admin/HR adds a new employee — basic info + HR fields + send onboarding link

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  User, Briefcase, Wallet, Phone, ChevronLeft,
  Loader2, CheckCircle2, AlertCircle, Send, Plus, X,
  Copy,
} from "lucide-react";

function useSB() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

const DEPARTMENTS = ["Human Resources","Engineering","Finance","Sales","Operations","Marketing","Design","Support","Legal","Administration","Product","Quality Assurance","Customer Success","Logistics"];
const ROLES = ["employee","manager","hr","admin"];
const SALARY_TYPES = ["monthly","annual"];

export default function AddEmployeePage() {
  const sb = useSB();
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [onboardLink, setOnboardLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Employee fields
  const [first_name, setFirstName] = useState("");
  const [middle_name, setMiddleName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  // HR fields
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [doj, setDoj] = useState(new Date().toISOString().split("T")[0]);
  const [employee_code, setEmployeeCode] = useState("");
  const [role, setRole] = useState("employee");

  // Salary
  const [salary_type, setSalaryType] = useState("monthly");
  const [basic, setBasic] = useState("");
  const [hra, setHra] = useState("");
  const [special, setSpecial] = useState("");
  const [otherAllow, setOtherAllow] = useState("");

  // Options
  const [sendLink, setSendLink] = useState(true);

  useEffect(() => {
    const oid = localStorage.getItem("activeOrgId") || "";
    setOrgId(oid);
    setOnboardLink(`${window.location.origin}/onboard/self?org=${oid}`);
  }, []);

  const gross = [basic, hra, special, otherAllow].reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!first_name.trim()) e.first_name = "Required";
    if (!last_name.trim()) e.last_name = "Required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (!phone || phone.length < 10) e.phone = "10-digit number required";
    if (!department) e.department = "Required";
    if (!designation.trim()) e.designation = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true); setError("");
    try {
      const fullName = [first_name, middle_name, last_name].filter(Boolean).join(" ").trim();
      const empPayload: Record<string, any> = {
        org_id: orgId || null,
        first_name: first_name.trim(),
        middle_name: middle_name.trim() || null,
        last_name: last_name.trim(),
        full_name: fullName,
        email: email.toLowerCase().trim(),
        phone: "+91" + phone,
        gender: gender || null,
        date_of_birth: dob || null,
        department,
        designation: designation.trim(),
        date_of_joining: doj || null,
        employee_code: employee_code.trim() || null,
        salary_type: salary_type,
        basic_salary: parseFloat(basic) || null,
        hra: parseFloat(hra) || null,
        special_allowance: parseFloat(special) || null,
        other_allowance: parseFloat(otherAllow) || null,
        gross_salary: gross || null,
        status: "active",
        approval_status: "pending",
        onboarding_completed: false,
      };

      // Check if employee exists
      const { data: existing } = await sb.from("employees").select("id").eq("email", empPayload.email).maybeSingle();
      let empId: string;
      if (existing) {
        await sb.from("employees").update(empPayload).eq("id", existing.id);
        empId = existing.id;
      } else {
        const { data: ins, error: ie } = await sb.from("employees").insert(empPayload).select("id").single();
        if (ie) throw new Error(ie.message);
        empId = ins.id;
      }

      // Also create user record so they can login
      const { error: ue } = await sb.from("users").insert({
        email: empPayload.email,
        full_name: fullName,
        role: role,
        org_id: orgId || null,
        phone: "+91" + phone,
      });
      if (ue && !ue.message.includes("duplicate")) console.warn("User insert:", ue.message);

      // Generate personal onboarding link
      const personalLink = `${window.location.origin}/onboard/self?org=${orgId}&email=${encodeURIComponent(empPayload.email)}`;
      setOnboardLink(personalLink);

      setDone(true);
    } catch (e: any) {
      setError(e.message || "Failed to add employee");
    } finally { setSaving(false); }
  };

  const copyLink = () => { navigator.clipboard.writeText(onboardLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (done) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Employee Added!</h2>
        <p className="text-sm text-gray-500 mb-6">{first_name} {last_name} has been added. Share the onboarding link:</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200 max-w-lg mx-auto mb-6">
          <code className="flex-1 text-xs text-gray-600 truncate">{onboardLink}</code>
          <button onClick={copyLink} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${copied ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
            {copied ? <><CheckCircle2 className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push("/employees")} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200">View Employees</button>
          <button onClick={() => { setDone(false); setFirstName(""); setMiddleName(""); setLastName(""); setEmail(""); setPhone(""); setDepartment(""); setDesignation(""); setBasic(""); setHra(""); setSpecial(""); setOtherAllow(""); }}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" />Add Another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
        <div><h1 className="text-xl font-bold text-gray-900">Add New Employee</h1><p className="text-sm text-gray-500">Enter employee details and HR fields</p></div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" /><p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      <div className="space-y-8">
        {/* Personal */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5"><User className="w-5 h-5 text-indigo-500" /><h2 className="text-base font-bold text-gray-900">Personal Details</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
              <input value={first_name} onChange={e => setFirstName(e.target.value)} placeholder="First name"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.first_name ? "border-red-300" : "border-gray-200"}`} />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Middle Name</label>
              <input value={middle_name} onChange={e => setMiddleName(e.target.value)} placeholder="Middle name"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
              <input value={last_name} onChange={e => setLastName(e.target.value)} placeholder="Last name"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.last_name ? "border-red-300" : "border-gray-200"}`} />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.email ? "border-red-300" : "border-gray-200"}`} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <div className="flex">
                <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500">+91</span>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" type="tel"
                  className={`flex-1 px-4 py-2.5 bg-gray-50 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.phone ? "border-red-300" : "border-gray-200"}`} />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender</label>
              <div className="flex gap-2">
                {["Male","Female","Other"].map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${gender === g ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HR Fields */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5"><Briefcase className="w-5 h-5 text-violet-500" /><h2 className="text-base font-bold text-gray-900">Job Details (HR Fields)</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department <span className="text-red-500">*</span></label>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none ${errors.department ? "border-red-300" : "border-gray-200"}`}>
                <option value="">Select</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Designation <span className="text-red-500">*</span></label>
              <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Software Engineer"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.designation ? "border-red-300" : "border-gray-200"}`} />
              {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Joining</label>
              <input type="date" value={doj} onChange={e => setDoj(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Employee Code</label>
              <input value={employee_code} onChange={e => setEmployeeCode(e.target.value)} placeholder="EMP001"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none">
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Salary */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5"><Wallet className="w-5 h-5 text-emerald-500" /><h2 className="text-base font-bold text-gray-900">Salary Structure</h2></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Basic (₹)</label>
              <input type="number" value={basic} onChange={e => setBasic(e.target.value)} placeholder="20000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">HRA (₹)</label>
              <input type="number" value={hra} onChange={e => setHra(e.target.value)} placeholder="8000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Allow. (₹)</label>
              <input type="number" value={special} onChange={e => setSpecial(e.target.value)} placeholder="5000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Other Allow. (₹)</label>
              <input type="number" value={otherAllow} onChange={e => setOtherAllow(e.target.value)} placeholder="2000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
          {gross > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-sm font-semibold text-emerald-700">Gross Salary</span>
              <span className="text-lg font-bold text-emerald-700">₹{gross.toLocaleString("en-IN")}/mo</span>
            </div>
          )}
        </section>

        {/* Send link option */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Send className="w-5 h-5 text-blue-500" /><h2 className="text-base font-bold text-gray-900">Onboarding</h2></div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={sendLink} onChange={e => setSendLink(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Generate self-onboarding link for employee to complete their profile (education, documents, address, bank details)</span>
          </label>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="px-5 py-2.5 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-100">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold rounded-xl hover:from-indigo-600 hover:to-violet-600 transition shadow-lg shadow-indigo-200/40 disabled:opacity-50 flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <><Plus className="w-4 h-4" />Add Employee</>}
          </button>
        </div>
      </div>
    </div>
  );
}