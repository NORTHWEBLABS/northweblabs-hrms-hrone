"use client";
// Route: app/onboard/self/page.tsx
// 5-step self-onboarding: Personal → Education → Experience → Address → Documents & Bank

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  User, GraduationCap, Briefcase, MapPin, FileCheck, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, Upload, X, Plus, Trash2, Camera,
  Sparkles,
} from "lucide-react";

function useSB() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Education { qualification: string; institution: string; board_university: string; passing_year: string; percentage: string; }
interface Experience { company_name: string; designation: string; from_date: string; to_date: string; reason_for_leaving: string; }
interface Address { address_line1: string; address_line2: string; city: string; state: string; pincode: string; }
interface DocUpload { file: File | null; preview: string; doc_subtype: string; }

const QUALIFICATIONS = ["10th", "12th", "Diploma", "Graduate", "Post Graduate", "PhD", "Other"];
const ADDRESS_PROOF_TYPES = [
  { value: "driving_licence", label: "Driving Licence" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "utility_bill", label: "Utility Bill" },
  { value: "rent_agreement", label: "Rent Agreement" },
];
const BANK_PROOF_TYPES = [
  { value: "cancelled_cheque", label: "Cancelled Cheque" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "passbook", label: "Passbook First Page" },
];
const GENDERS = ["Male", "Female", "Other"];
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh","Puducherry","Jammu & Kashmir","Ladakh"];

const emptyEdu = (): Education => ({ qualification: "", institution: "", board_university: "", passing_year: "", percentage: "" });
const emptyExp = (): Experience => ({ company_name: "", designation: "", from_date: "", to_date: "", reason_for_leaving: "" });
const emptyAddr = (): Address => ({ address_line1: "", address_line2: "", city: "", state: "", pincode: "" });

// ── Field & Upload components ────────────────────────────────────────────────
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", ...props }: any) {
  return <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" {...props} />;
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] | string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition appearance-none">
      <option value="">{placeholder || "Select"}</option>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function FileUpload({ label, preview, onUpload, onRemove, accept = "image/*,.pdf" }: {
  label: string; preview: string; onUpload: (f: File) => void; onRemove: () => void; accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      {preview ? (
        <div className="relative group">
          {preview.endsWith(".pdf") || preview.includes("pdf") ? (
            <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center"><FileCheck className="w-8 h-8 text-gray-400" /><span className="ml-2 text-sm text-gray-500">PDF uploaded</span></div>
          ) : (
            <img src={preview} alt={label} className="w-full h-40 object-cover rounded-xl border border-gray-200" />
          )}
          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => ref.current?.click()} className="px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg flex items-center gap-1"><Camera className="w-3.5 h-3.5" />Change</button>
            <button onClick={onRemove} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Remove</button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-500">
          <Upload className="w-6 h-6" />
          <span className="text-xs font-medium">Click to upload</span>
          <span className="text-[10px] text-gray-400">JPG, PNG or PDF (max 5MB)</span>
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; } onUpload(f); } e.target.value = ""; }} />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SelfOnboardPage() {
  const sb = useSB();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // User info
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [orgId, setOrgId] = useState("");

  // Step 1: Personal
  const [personal, setPersonal] = useState({ first_name: "", middle_name: "", last_name: "", phone: "", dob: "", gender: "", email: "" });

  // Step 2: Education
  const [educations, setEducations] = useState<Education[]>([emptyEdu()]);

  // Step 3: Experience
  const [hasExperience, setHasExperience] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([emptyExp()]);

  // Step 4: Addresses
  const [currentAddr, setCurrentAddr] = useState<Address>(emptyAddr());
  const [permanentAddr, setPermanentAddr] = useState<Address>(emptyAddr());
  const [sameAsCurrentAddr, setSameAsCurrentAddr] = useState(false);

  // Step 5: Documents & Bank
  const [photo, setPhoto] = useState<DocUpload>({ file: null, preview: "", doc_subtype: "photo" });
  const [panCard, setPanCard] = useState<DocUpload>({ file: null, preview: "", doc_subtype: "pan_card" });
  const [addressProof, setAddressProof] = useState<DocUpload & { doc_subtype: string }>({ file: null, preview: "", doc_subtype: "" });
  const [bankProof, setBankProof] = useState<DocUpload & { doc_subtype: string }>({ file: null, preview: "", doc_subtype: "" });
  const [bank, setBank] = useState({ account: "", ifsc: "", bank_name: "", pan: "", aadhaar_last4: "" });

  // Init
  useEffect(() => {
    (async () => {
      // Check URL params for org and email
      const params = new URLSearchParams(window.location.search);
      const urlOrg = params.get("org") || "";
      const urlEmail = params.get("email") || "";

      const em = urlEmail || localStorage.getItem("userEmail") || "";
      let oid = urlOrg || localStorage.getItem("activeOrgId") || "";
      setUserEmail(em);
      if (em) {
        const { data } = await sb.from("users").select("id, full_name, email, org_id, phone").eq("email", em).maybeSingle();
        if (data) {
          setUserId(data.id);
          const parts = (data.full_name || "").split(" ");
          setPersonal(p => ({
            ...p,
            first_name: parts[0] || "",
            middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
            last_name: parts.length > 1 ? parts[parts.length - 1] : "",
            email: data.email,
            phone: data.phone?.replace("+91", "") || "",
          }));
          if (!oid && data.org_id) { oid = data.org_id; localStorage.setItem("activeOrgId", oid); }
        }
      }
      setOrgId(oid);
      if (oid) localStorage.setItem("activeOrgId", oid);
      setLoading(false);
    })();
  }, [sb]);

  // IFSC lookup
  const lookupIFSC = useCallback(async (ifsc: string) => {
    if (ifsc.length !== 11) return;
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      if (res.ok) { const d = await res.json(); setBank(b => ({ ...b, bank_name: d.BANK + " — " + d.BRANCH })); }
    } catch {}
  }, []);

  // Pincode lookup
  const lookupPincode = useCallback(async (pin: string, setter: (fn: (a: Address) => Address) => void) => {
    if (pin.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
        const po = data[0].PostOffice[0];
        setter(a => ({ ...a, city: po.District || a.city, state: po.State || a.state }));
      }
    } catch {}
  }, []);
  const fileToPreview = (f: File): string => URL.createObjectURL(f);

  // Upload file to Supabase storage
  const uploadFile = async (file: File, empId: string, docType: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${empId}/${docType}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("employee-docs").upload(path, file, { upsert: true });
    if (error) throw new Error("Upload failed: " + error.message);
    const { data: urlData } = sb.storage.from("employee-docs").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!personal.first_name.trim()) e.first_name = "Required";
      if (!personal.last_name.trim()) e.last_name = "Required";
      if (!personal.phone || personal.phone.length < 10) e.phone = "Valid 10-digit number required";
      if (!personal.dob) e.dob = "Required";
      if (!personal.gender) e.gender = "Required";
    }
    if (step === 1) {
      educations.forEach((edu, i) => {
        if (!edu.qualification) e[`edu_${i}_q`] = "Required";
      });
    }
    if (step === 3) {
      if (!currentAddr.address_line1.trim()) e.curr_addr1 = "Required";
      if (!currentAddr.city.trim()) e.curr_city = "Required";
      if (!currentAddr.state) e.curr_state = "Required";
      if (!currentAddr.pincode || currentAddr.pincode.length !== 6) e.curr_pin = "6-digit pincode required";
    }
    if (step === 4) {
      if (!bank.pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(bank.pan.toUpperCase())) e.pan = "Valid PAN required (e.g. ABCDE1234F)";
      if (!bank.aadhaar_last4 || bank.aadhaar_last4.length !== 4) e.aadhaar = "Last 4 digits required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, 4)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validate()) return;
    setSaving(true); setError("");
    try {
      const email = personal.email || userEmail;
      if (!email) throw new Error("No email found.");

      const fullName = [personal.first_name, personal.middle_name, personal.last_name].filter(Boolean).join(" ").trim();

      // 1. Upsert employee (minimal — no HR fields)
      const empPayload: Record<string, any> = {
        first_name: personal.first_name.trim(),
        middle_name: personal.middle_name.trim() || null,
        last_name: personal.last_name.trim(),
        full_name: fullName,
        email,
        phone: "+91" + personal.phone,
        date_of_birth: personal.dob || null,
        gender: personal.gender || null,
        pan: bank.pan.toUpperCase() || null,
        aadhaar_last4: bank.aadhaar_last4 || null,
        bank_account: bank.account || null,
        bank_ifsc: bank.ifsc.toUpperCase() || null,
        bank_name: bank.bank_name || null,
        status: "active",
        onboarding_completed: true,
      };
      if (orgId) empPayload.org_id = orgId;

      const { data: existing } = await sb.from("employees").select("id").eq("email", email).maybeSingle();

      let empId: string;
      if (existing) {
        const { error: ue } = await sb.from("employees").update(empPayload).eq("id", existing.id);
        if (ue) { console.warn("Update err:", ue.message); }
        empId = existing.id;
      } else {
        const { data: ins, error: ie } = await sb.from("employees").insert(empPayload).select("id").single();
        if (ie) throw new Error("Failed to create employee: " + ie.message);
        empId = ins.id;
      }

      // 2. Education records
      await sb.from("employee_education").delete().eq("employee_id", empId);
      const eduRows = educations.filter(e => e.qualification).map(e => ({
        employee_id: empId,
        qualification: e.qualification,
        institution: e.institution || null,
        board_university: e.board_university || null,
        passing_year: e.passing_year ? parseInt(e.passing_year) : null,
        percentage: e.percentage ? parseFloat(e.percentage) : null,
      }));
      if (eduRows.length) {
        const { error: ee } = await sb.from("employee_education").insert(eduRows);
        if (ee) console.warn("Education save err:", ee.message);
      }

      // 3. Experience records
      if (hasExperience) {
        await sb.from("employee_experience").delete().eq("employee_id", empId);
        const expRows = experiences.filter(e => e.company_name).map(e => ({
          employee_id: empId,
          company_name: e.company_name,
          designation: e.designation || null,
          from_date: e.from_date || null,
          to_date: e.to_date || null,
          reason_for_leaving: e.reason_for_leaving || null,
        }));
        if (expRows.length) {
          const { error: xe } = await sb.from("employee_experience").insert(expRows);
          if (xe) console.warn("Experience save err:", xe.message);
        }
      }

      // 4. Addresses
      await sb.from("employee_addresses").delete().eq("employee_id", empId);
      const addrs = [
        { ...currentAddr, address_type: "current", employee_id: empId },
        { ...(sameAsCurrentAddr ? currentAddr : permanentAddr), address_type: "permanent", employee_id: empId },
      ].filter(a => a.address_line1);
      if (addrs.length) {
        const { error: ae } = await sb.from("employee_addresses").insert(addrs);
        if (ae) console.warn("Address save err:", ae.message);
      }

      // 5. Upload documents
      const docs: { file: File; doc_type: string; doc_subtype: string }[] = [];
      if (photo.file) docs.push({ file: photo.file, doc_type: "photo", doc_subtype: "photo" });
      if (panCard.file) docs.push({ file: panCard.file, doc_type: "pan_card", doc_subtype: "pan_card" });
      if (addressProof.file) docs.push({ file: addressProof.file, doc_type: "address_proof", doc_subtype: addressProof.doc_subtype });
      if (bankProof.file) docs.push({ file: bankProof.file, doc_type: "bank_proof", doc_subtype: bankProof.doc_subtype });

      for (const doc of docs) {
        try {
          const url = await uploadFile(doc.file, empId, doc.doc_type);
          await sb.from("employee_documents").insert({
            employee_id: empId,
            doc_type: doc.doc_type,
            doc_subtype: doc.doc_subtype,
            file_url: url,
            file_name: doc.file.name,
          });
        } catch (e: any) { console.warn(`Doc upload (${doc.doc_type}) err:`, e.message); }
      }

      // 6. Update user record
      if (userId) {
        try {
          await sb.from("users").update({ full_name: fullName }).eq("id", userId);
        } catch {}
      }

      // 7. Notify admin/HR
      try {
        await sb.from("notifications").insert({
          org_id: orgId || null,
          type: "onboarding_submitted",
          title: "Onboarding submitted",
          message: `${fullName} has submitted onboarding details for review.`,
          employee_id: empId,
          action_url: `/employees/${empId}`,
        });
      } catch {}

      // 8. Set approval_status to pending
      try { await sb.from("employees").update({ approval_status: "pending" }).eq("id", empId); } catch {}

      setDone(true);
      setTimeout(() => router.push("/me"), 2500);
    } catch (e: any) {
      console.error("Submit error:", e);
      setError(e.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  // ── Steps config ───────────────────────────────────────────────────────────
  const STEPS = [
    { label: "Personal", icon: <User className="w-4 h-4" /> },
    { label: "Education", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Experience", icon: <Briefcase className="w-4 h-4" /> },
    { label: "Address", icon: <MapPin className="w-4 h-4" /> },
    { label: "Documents", icon: <FileCheck className="w-4 h-4" /> },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  );

  if (done) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Onboarding complete!</h2>
        <p className="text-sm text-gray-500">Redirecting to your dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Left sidebar stepper */}
      <div className="hidden lg:flex w-80 bg-gradient-to-b from-indigo-600 to-violet-700 text-white flex-col">
        <div className="p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">N</div>
            <span className="font-bold tracking-tight">NorthWebLabs</span>
          </div>
          <h2 className="text-lg font-bold mb-2">Employee Onboarding</h2>
          <p className="text-sm text-indigo-200 mb-10">Complete your profile to get started</p>

          <div className="space-y-1">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => { if (i < step) setStep(i); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${i === step ? "bg-white/20 text-white" : i < step ? "text-indigo-200 hover:bg-white/10 cursor-pointer" : "text-indigo-300/50 cursor-default"}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${i < step ? "bg-emerald-400 text-white" : i === step ? "bg-white text-indigo-600" : "bg-white/10 text-indigo-300"}`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile stepper */}
        <div className="lg:hidden px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                ${i === step ? "bg-indigo-100 text-indigo-700" : i < step ? "text-emerald-600" : "text-gray-400"}`}>
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}.</span>}
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-100"><div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1"><p className="text-sm font-semibold text-red-800">Error</p><p className="text-sm text-red-600">{error}</p></div>
                <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
              </div>
            )}

            {/* ── STEP 0: Personal ──────────────────────────────────── */}
            {step === 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Personal Information</h2>
                <p className="text-sm text-gray-500 mb-6">Basic details about yourself</p>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <Field label="First Name" required error={errors.first_name}>
                      <Input value={personal.first_name} onChange={(v: string) => setPersonal(p => ({ ...p, first_name: v }))} placeholder="First name" />
                    </Field>
                    <Field label="Middle Name">
                      <Input value={personal.middle_name} onChange={(v: string) => setPersonal(p => ({ ...p, middle_name: v }))} placeholder="Middle name (optional)" />
                    </Field>
                    <Field label="Last Name" required error={errors.last_name}>
                      <Input value={personal.last_name} onChange={(v: string) => setPersonal(p => ({ ...p, last_name: v }))} placeholder="Last name" />
                    </Field>
                  </div>
                  <Field label="Email">
                    <Input value={personal.email || userEmail} disabled />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Phone Number" required error={errors.phone}>
                      <div className="flex">
                        <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500 font-medium">+91</span>
                        <input type="tel" maxLength={10} value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))} placeholder="9876543210"
                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                      </div>
                    </Field>
                    <Field label="Date of Birth" required error={errors.dob}>
                      <Input type="date" value={personal.dob} onChange={(v: string) => setPersonal(p => ({ ...p, dob: v }))} />
                    </Field>
                  </div>
                  <Field label="Gender" required error={errors.gender}>
                    <div className="flex gap-3">
                      {GENDERS.map(g => (
                        <button key={g} onClick={() => setPersonal(p => ({ ...p, gender: g }))}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition
                            ${personal.gender === g ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`}>{g}</button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* ── STEP 1: Education ─────────────────────────────────── */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Educational Qualifications</h2>
                <p className="text-sm text-gray-500 mb-6">Add your qualifications</p>
                <div className="space-y-6">
                  {educations.map((edu, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 relative">
                      {educations.length > 1 && (
                        <button onClick={() => setEducations(e => e.filter((_, j) => j !== i))}
                          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Qualification" required error={errors[`edu_${i}_q`]}>
                          <Select value={edu.qualification} onChange={v => { const n = [...educations]; n[i].qualification = v; setEducations(n); }} options={QUALIFICATIONS} />
                        </Field>
                        <Field label="Institution / School">
                          <Input value={edu.institution} onChange={(v: string) => { const n = [...educations]; n[i].institution = v; setEducations(n); }} placeholder="Institution name" />
                        </Field>
                        <Field label="Board / University">
                          <Input value={edu.board_university} onChange={(v: string) => { const n = [...educations]; n[i].board_university = v; setEducations(n); }} placeholder="CBSE, State Board, etc." />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Passing Year">
                            <Input type="number" value={edu.passing_year} onChange={(v: string) => { const n = [...educations]; n[i].passing_year = v; setEducations(n); }} placeholder="2020" />
                          </Field>
                          <Field label="Percentage / CGPA">
                            <Input value={edu.percentage} onChange={(v: string) => { const n = [...educations]; n[i].percentage = v; setEducations(n); }} placeholder="85%" />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEducations(e => [...e, emptyEdu()])}
                    className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-xl hover:bg-indigo-50 transition">
                    <Plus className="w-4 h-4" />Add another qualification
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Experience ────────────────────────────────── */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Work Experience</h2>
                <p className="text-sm text-gray-500 mb-6">Previous employment history</p>
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-12 h-7 rounded-full transition-colors relative ${hasExperience ? "bg-indigo-500" : "bg-gray-300"}`}
                      onClick={() => setHasExperience(!hasExperience)}>
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasExperience ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">I have previous work experience</span>
                  </label>
                </div>
                {hasExperience && (
                  <div className="space-y-6">
                    {experiences.map((exp, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 relative">
                        {experiences.length > 1 && (
                          <button onClick={() => setExperiences(e => e.filter((_, j) => j !== i))}
                            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Company Name" required>
                            <Input value={exp.company_name} onChange={(v: string) => { const n = [...experiences]; n[i].company_name = v; setExperiences(n); }} placeholder="Company name" />
                          </Field>
                          <Field label="Designation">
                            <Input value={exp.designation} onChange={(v: string) => { const n = [...experiences]; n[i].designation = v; setExperiences(n); }} placeholder="Job title" />
                          </Field>
                          <Field label="From Date">
                            <Input type="date" value={exp.from_date} onChange={(v: string) => { const n = [...experiences]; n[i].from_date = v; setExperiences(n); }} />
                          </Field>
                          <Field label="To Date">
                            <Input type="date" value={exp.to_date} onChange={(v: string) => { const n = [...experiences]; n[i].to_date = v; setExperiences(n); }} />
                          </Field>
                          <div className="sm:col-span-2">
                            <Field label="Reason for Leaving">
                              <Input value={exp.reason_for_leaving} onChange={(v: string) => { const n = [...experiences]; n[i].reason_for_leaving = v; setExperiences(n); }} placeholder="Optional" />
                            </Field>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setExperiences(e => [...e, emptyExp()])}
                      className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-xl hover:bg-indigo-50 transition">
                      <Plus className="w-4 h-4" />Add another job
                    </button>
                  </div>
                )}
                {!hasExperience && (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No previous experience? That&apos;s fine!</p>
                    <p className="text-xs text-gray-400">Click the toggle above if you want to add any.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Addresses ─────────────────────────────────── */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Address Details</h2>
                <p className="text-sm text-gray-500 mb-6">Your current and permanent address</p>
                <div className="space-y-8">
                  {/* Current Address */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500" />Current Address</h3>
                    <div className="space-y-4">
                      <Field label="Address Line 1" required error={errors.curr_addr1}>
                        <Input value={currentAddr.address_line1} onChange={(v: string) => setCurrentAddr(a => ({ ...a, address_line1: v }))} placeholder="House/Flat No., Building, Street" />
                      </Field>
                      <Field label="Address Line 2">
                        <Input value={currentAddr.address_line2} onChange={(v: string) => setCurrentAddr(a => ({ ...a, address_line2: v }))} placeholder="Locality, Area (optional)" />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="City" required error={errors.curr_city}>
                          <Input value={currentAddr.city} onChange={(v: string) => setCurrentAddr(a => ({ ...a, city: v }))} placeholder="City" />
                        </Field>
                        <Field label="State" required error={errors.curr_state}>
                          <Select value={currentAddr.state} onChange={v => setCurrentAddr(a => ({ ...a, state: v }))} options={STATES} />
                        </Field>
                        <Field label="Pincode" required error={errors.curr_pin}>
                          <Input type="tel" maxLength={6} value={currentAddr.pincode} onChange={(v: string) => { setCurrentAddr(a => ({ ...a, pincode: v.replace(/\D/g, "") })); if (v.replace(/\D/g, "").length === 6) lookupPincode(v.replace(/\D/g, ""), setCurrentAddr); }} placeholder="400001" />
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* Same as current */}
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <input type="checkbox" checked={sameAsCurrentAddr} onChange={e => setSameAsCurrentAddr(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                    <span className="text-sm font-medium text-indigo-700">Permanent address is same as current</span>
                  </label>

                  {/* Permanent */}
                  {!sameAsCurrentAddr && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-500" />Permanent Address</h3>
                      <div className="space-y-4">
                        <Field label="Address Line 1"><Input value={permanentAddr.address_line1} onChange={(v: string) => setPermanentAddr(a => ({ ...a, address_line1: v }))} placeholder="House/Flat No." /></Field>
                        <Field label="Address Line 2"><Input value={permanentAddr.address_line2} onChange={(v: string) => setPermanentAddr(a => ({ ...a, address_line2: v }))} placeholder="Locality (optional)" /></Field>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <Field label="City"><Input value={permanentAddr.city} onChange={(v: string) => setPermanentAddr(a => ({ ...a, city: v }))} placeholder="City" /></Field>
                          <Field label="State"><Select value={permanentAddr.state} onChange={v => setPermanentAddr(a => ({ ...a, state: v }))} options={STATES} /></Field>
                          <Field label="Pincode"><Input type="tel" maxLength={6} value={permanentAddr.pincode} onChange={(v: string) => { setPermanentAddr(a => ({ ...a, pincode: v.replace(/\D/g, "") })); if (v.replace(/\D/g, "").length === 6) lookupPincode(v.replace(/\D/g, ""), setPermanentAddr); }} placeholder="400001" /></Field>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 4: Documents & Bank ──────────────────────────── */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Documents & Bank</h2>
                <p className="text-sm text-gray-500 mb-6">Upload required documents and bank details</p>
                <div className="space-y-8">
                  {/* Photo & PAN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FileUpload label="Passport Photo" preview={photo.preview}
                      onUpload={f => setPhoto({ file: f, preview: fileToPreview(f), doc_subtype: "photo" })}
                      onRemove={() => setPhoto({ file: null, preview: "", doc_subtype: "photo" })} accept="image/*" />
                    <FileUpload label="PAN Card" preview={panCard.preview}
                      onUpload={f => setPanCard({ file: f, preview: fileToPreview(f), doc_subtype: "pan_card" })}
                      onRemove={() => setPanCard({ file: null, preview: "", doc_subtype: "pan_card" })} />
                  </div>

                  {/* Address Proof */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Address Proof (OVD)</h3>
                    <div className="mb-3">
                      <Select value={addressProof.doc_subtype} onChange={v => setAddressProof(a => ({ ...a, doc_subtype: v }))} options={ADDRESS_PROOF_TYPES} placeholder="Select document type" />
                    </div>
                    {addressProof.doc_subtype && (
                      <FileUpload label={ADDRESS_PROOF_TYPES.find(t => t.value === addressProof.doc_subtype)?.label || "Address Proof"} preview={addressProof.preview}
                        onUpload={f => setAddressProof(a => ({ ...a, file: f, preview: fileToPreview(f) }))}
                        onRemove={() => setAddressProof(a => ({ ...a, file: null, preview: "" }))} />
                    )}
                  </div>

                  {/* Bank Proof */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Bank Proof</h3>
                    <div className="mb-3">
                      <Select value={bankProof.doc_subtype} onChange={v => setBankProof(a => ({ ...a, doc_subtype: v }))} options={BANK_PROOF_TYPES} placeholder="Select proof type" />
                    </div>
                    {bankProof.doc_subtype && (
                      <FileUpload label={BANK_PROOF_TYPES.find(t => t.value === bankProof.doc_subtype)?.label || "Bank Proof"} preview={bankProof.preview}
                        onUpload={f => setBankProof(a => ({ ...a, file: f, preview: fileToPreview(f) }))}
                        onRemove={() => setBankProof(a => ({ ...a, file: null, preview: "" }))} />
                    )}
                  </div>

                  {/* Bank & Compliance Details */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Bank & Compliance Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="PAN Number" required error={errors.pan}>
                        <Input value={bank.pan} onChange={(v: string) => setBank(b => ({ ...b, pan: v.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} />
                      </Field>
                      <Field label="Aadhaar (last 4 digits)" required error={errors.aadhaar}>
                        <Input type="tel" maxLength={4} value={bank.aadhaar_last4} onChange={(v: string) => setBank(b => ({ ...b, aadhaar_last4: v.replace(/\D/g, "") }))} placeholder="1234" />
                      </Field>
                      <Field label="Bank Account Number">
                        <Input value={bank.account} onChange={(v: string) => setBank(b => ({ ...b, account: v }))} placeholder="Account number" />
                      </Field>
                      <Field label="IFSC Code">
                        <Input value={bank.ifsc} onChange={(v: string) => { setBank(b => ({ ...b, ifsc: v.toUpperCase() })); if (v.length === 11) lookupIFSC(v.toUpperCase()); }} placeholder="SBIN0001234" maxLength={11} />
                      </Field>
                      {bank.bank_name && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{bank.bank_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation ──────────────────────────────────────── */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
              {step > 0 ? (
                <button onClick={prev} className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition">
                  <ChevronLeft className="w-4 h-4" />Back
                </button>
              ) : <div />}
              {step < 4 ? (
                <button onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-200/40">
                  Next<ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-200/40 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Sparkles className="w-4 h-4" />Complete Onboarding</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}