"use client";
// Route: app/(auth)/signup/page.tsx
// UI restyled to the NorthWeb Labs marketing design (Full name / Work email /
// Company on step 1, brand panel with dashboard mock on the right). ALL backend
// logic unchanged: same /api/auth/* calls, same Supabase org creation, same
// session cookie & redirects. Company pre-fills the org-setup step.

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Mail, Loader2, AlertCircle, CheckCircle2, User,
  Building2, ChevronDown, ChevronLeft, ArrowRight, Check, RefreshCw,
} from "lucide-react";

const STATES = [
  "Maharashtra","Gujarat","Karnataka","Tamil Nadu","Delhi","Rajasthan",
  "Uttar Pradesh","West Bengal","Telangana","Kerala","Punjab","Haryana",
  "Madhya Pradesh","Bihar","Odisha","Assam","Jharkhand","Chandigarh","Other",
];
const INDUSTRIES = [
  "Manufacturing","Trading / Distribution","IT & Software","Retail",
  "Construction","Healthcare","Education","Hospitality","Finance",
  "Logistics","Real Estate","Professional Services","Other",
];

type Step = "email" | "otp" | "org";

// ─── Google "G" mark ──────────────────────────────────────────────────────────
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29A7.18 7.18 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);

// ─── Brand panel (right side) with dashboard mock ─────────────────────────────
function BrandPanel() {
  return (
    <div className="hidden lg:flex w-[48%] flex-col items-center justify-center p-14 relative overflow-hidden bg-gradient-to-br from-[#dbe5fa] via-[#e7edfc] to-[#f4f7fe]">
      <div className="relative w-full max-w-xl">
        <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#0b1220] leading-tight">
          Everything your team needs, in one place.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
          Pay, attendance, leave and approvals — a glance away the moment you sign in.
        </p>

        {/* Dashboard mock */}
        <div className="mt-10 bg-white/95 rounded-3xl shadow-[0_30px_70px_rgba(15,30,60,0.18)] p-7 relative">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-[#0b1220] text-white text-base font-extrabold flex items-center justify-center">N</div>
            <span className="text-base font-bold text-gray-900">Dashboard</span>
            <span className="ml-auto w-9 h-9 rounded-full bg-blue-200/70" />
          </div>
          <div className="flex gap-4 pt-4">
            {/* Rail */}
            <div className="flex flex-col gap-3.5 pt-1">
              <span className="w-7 h-7 rounded-lg bg-blue-600" />
              {[0, 1, 2, 3].map(i => <span key={i} className="w-7 h-7 rounded-lg bg-blue-100" />)}
            </div>
            {/* Main */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900 mb-4">Good morning, Ananya</p>
              <div className="border border-gray-100 rounded-2xl p-5 shadow-sm flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400">Net pay · June</p>
                  <p className="font-mono text-3xl font-bold text-gray-900 mt-1">₹1,84,200</p>
                </div>
                <div className="flex items-end gap-1 pb-0.5" aria-hidden="true">
                  {[10, 14, 18, 15, 22, 26, 23, 36].map((h, i) => (
                    <span key={i} className={`w-2 rounded-sm ${i === 7 ? "bg-blue-600" : "bg-blue-200"}`} style={{ height: h }} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-gray-400">Leave balance</p>
                  <p className="font-mono text-2xl font-bold text-gray-900 mt-1">14 <span className="text-xs font-normal text-gray-400">days</span></p>
                  <div className="flex gap-1 mt-2" aria-hidden="true">
                    {[1, 1, 1, 1, 0, 0, 0].map((on, i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${on ? "bg-blue-600" : "bg-gray-200"}`} />
                    ))}
                  </div>
                </div>
                <div className="border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-gray-400">Today</p>
                  <p className="text-base font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />Checked in
                  </p>
                  <p className="font-mono text-xs text-gray-400 mt-1">09:02 → 18:30</p>
                </div>
              </div>
              <div className="border border-gray-100 rounded-2xl p-5 shadow-sm mt-3 flex items-center gap-4">
                <div className="flex -space-x-2" aria-hidden="true">
                  <span className="w-9 h-9 rounded-full bg-blue-600 ring-2 ring-white" />
                  <span className="w-9 h-9 rounded-full bg-emerald-500 ring-2 ring-white" />
                  <span className="w-9 h-9 rounded-full bg-[#0b1220] ring-2 ring-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">3 approvals waiting</p>
                  <p className="text-xs text-gray-400">Leave · reimbursement · timesheet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OTP 6-box input ──────────────────────────────────────────────────────────
function OTPBoxes({ value, onChange, error, disabled }: {
  value: string; onChange: (v: string) => void; error?: boolean; disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) onChange(digits.map((d, j) => j === i ? "" : d).join(""));
      else if (i > 0) { refs.current[i - 1]?.focus(); onChange(digits.map((d, j) => j === i - 1 ? "" : d).join("")); }
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handleChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    onChange(digits.map((x, j) => j === i ? d : x).join(""));
    if (d && i < 5) setTimeout(() => refs.current[i + 1]?.focus(), 0);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p) { onChange(p.padEnd(6, "").slice(0, 6)); refs.current[Math.min(p.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1} value={d} disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          autoFocus={i === 0}
          className={`w-11 text-center text-xl font-bold border-2 rounded-2xl outline-none transition-all
            ${error ? "border-red-400 bg-red-50 text-red-700 shake" :
              d ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-900"}
            focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-40`}
          style={{ height: 52 }}
        />
      ))}
    </div>
  );
}

// ─── Resend timer ─────────────────────────────────────────────────────────────
function ResendTimer({ onResend }: { onResend: () => void }) {
  const [secs, setSecs] = useState(30);
  useEffect(() => {
    setSecs(30);
    const t = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, []);
  return secs > 0
    ? <span className="text-gray-400 text-xs">Resend in <span className="font-bold text-gray-600 tabular-nums">{secs}s</span></span>
    : <button onClick={onResend} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
        <RefreshCw className="w-3 h-3" />Resend OTP
      </button>;
}

// ─── Main signup content ──────────────────────────────────────────────────────
function SignupContent() {
  const searchParams = useSearchParams();
  const startStep = (searchParams.get("step") as Step) || "email";

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [step, setStep]       = useState<Step>(startStep);
  const [fullName, setFullName] = useState("");
  const [company, setCompany]   = useState("");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [devOtp, setDevOtp]   = useState("");
  const [userId, setUserId]   = useState("");

  const [orgName, setOrgName]         = useState("");
  const [orgState, setOrgState]       = useState("Maharashtra");
  const [orgIndustry, setOrgIndustry] = useState("Manufacturing");
  const [orgCity, setOrgCity]         = useState("");
  const [orgGstin, setOrgGstin]       = useState("");
  const [orgErrors, setOrgErrors]     = useState<Record<string, string>>({});
  const [orgSaving, setOrgSaving]     = useState(false);

  // UI nicety: company from step 1 pre-fills the org name on the org step.
  useEffect(() => {
    if (step === "org" && !orgName && company) setOrgName(company);
  }, [step, company, orgName]);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!fullName.trim()) { setError("Enter your full name"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.dev && data.otp) setDevOtp(data.otp);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally { setLoading(false); }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.replace(/\s/g, "").length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.replace(/\s/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionToken) {
        document.cookie = `session_token=${data.sessionToken}; path=/; max-age=${7*24*60*60}; SameSite=Lax`;
      }
      if (data.user?.id) setUserId(data.user.id);
      // Store email for all dashboard pages
      localStorage.setItem("userEmail", email.trim().toLowerCase());
      // UI form's full name as fallback; server-provided name still wins below.
      if (fullName.trim()) localStorage.setItem("userName", fullName.trim());
      if (data.user?.name) localStorage.setItem("userName", data.user.name);
      if (data.hasOrg) {
        if (data.user?.org_id) localStorage.setItem("activeOrgId", data.user.org_id);
        window.location.href = "/dashboard";
      } else {
        setStep("org");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
      setOtp("");
    } finally { setLoading(false); }
  };

  // ── Create org ──────────────────────────────────────────────────────────────
  const handleOrgCreate = async () => {
    const errs: Record<string, string> = {};
    if (!orgName.trim()) errs.name = "Company name is required";
    if (orgGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(orgGstin.toUpperCase()))
      errs.gstin = "Invalid GSTIN format";
    setOrgErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setOrgSaving(true);
    try {
      let resolvedUserId = userId;
      if (!resolvedUserId && email) {
        const { data: found } = await supabase
          .from("users").select("id").eq("email", email.toLowerCase().trim()).maybeSingle();
        resolvedUserId = found?.id || "";
      }
      if (!resolvedUserId) throw new Error("Session lost — please go back and sign in again.");

      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: orgName.trim(), state: orgState, industry: orgIndustry,
          city: orgCity || null, gstin: orgGstin ? orgGstin.toUpperCase() : null,
          plan: "starter", plan_status: "trial",
          trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        }).select().single();
      if (orgErr) throw new Error(`Failed to create org: ${orgErr.message}`);

      const { error: userErr } = await supabase
        .from("users").update({ org_id: org.id }).eq("id", resolvedUserId);
      if (userErr) throw new Error(`Failed to link org: ${userErr.message}`);

      // Update session with new org_id
      const sessionToken = document.cookie.split(";").find(c => c.trim().startsWith("session_token="))?.split("=")[1];
      if (sessionToken) {
        await supabase.from("user_sessions").update({ org_id: org.id }).eq("token", sessionToken.trim());
      }

      localStorage.setItem("activeOrgId", org.id);
      localStorage.setItem("activeOrgName", org.name);
      localStorage.setItem("userEmail", email.trim().toLowerCase());
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setOrgErrors({ name: err instanceof Error ? err.message : "Failed to create organization" });
    } finally { setOrgSaving(false); }
  };

  const handleResendOtp = () => {
    setOtp(""); setError(""); setDevOtp("");
    fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(r => r.json()).then(d => { if (d.dev && d.otp) setDevOtp(d.otp); });
  };

  const iCls = "w-full pl-11 pr-4 py-3.5 text-sm border-2 border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all bg-white placeholder:text-gray-400";
  const iErrCls = "w-full pl-11 pr-4 py-3.5 text-sm border-2 border-red-400 rounded-2xl outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all bg-white placeholder:text-gray-400";
  const iPlain = "w-full px-4 py-3.5 text-sm border-2 border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all bg-white placeholder:text-gray-400";
  const iPlainErr = "w-full px-4 py-3.5 text-sm border-2 border-red-400 rounded-2xl outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all bg-white placeholder:text-gray-400";
  const sCls = "w-full px-4 py-3.5 text-sm border-2 border-gray-200 rounded-2xl bg-white appearance-none outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all pr-10";

  const stepLabel = step === "email" ? "" : step === "otp" ? "Step 2 of 3 — Verify email" : "Step 3 of 3 — Set up your organization";

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="px-8 lg:px-20 pt-8">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="NorthWeb Labs home">
            <span className="w-8 h-8 rounded-lg bg-[#0b1220] text-white font-extrabold text-base flex items-center justify-center">N</span>
            <span className="font-extrabold text-gray-900">NorthWeb <span className="text-blue-600">Labs</span></span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-md">

            {/* Back */}
            {step === "email" ? (
              <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 group transition-colors w-fit">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"/>Back
              </Link>
            ) : (
              <button onClick={() => { setStep(step === "org" ? "otp" : "email"); setError(""); setOtp(""); setDevOtp(""); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 group transition-colors">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"/>Back
              </button>
            )}

            {stepLabel && <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">{stepLabel}</p>}

            {/* ══ STEP 1: NAME / EMAIL / COMPANY ══ */}
            {step === "email" && (
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-blue-600 uppercase mb-3">Get started</p>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Create your account</h1>
                <p className="text-gray-500 mb-8">Set up your NorthWeb Labs workspace in under a minute.</p>

                <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Full name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                      <input value={fullName} onChange={e => { setFullName(e.target.value); setError(""); }}
                        placeholder="Ananya Iyer" autoFocus autoComplete="name" className={iCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Work email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                      <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                        placeholder="ananya@company.com" autoComplete="email"
                        className={error && !email ? iErrCls : iCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Company</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                      <input value={company} onChange={e => setCompany(e.target.value)}
                        placeholder="Acme Corp" autoComplete="organization" className={iCls} />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </p>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending code...</> : <>Create account<ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <div className="flex items-center gap-4 my-6">
                  <span className="flex-1 h-px bg-gray-200" />
                  <span className="font-mono text-[11px] tracking-[0.25em] text-gray-400">OR</span>
                  <span className="flex-1 h-px bg-gray-200" />
                </div>
                <button type="button" onClick={() => setError("Google sign-in isn't enabled yet — use email instead.")}
                  className="w-full py-3.5 border-2 border-gray-200 rounded-2xl bg-white text-sm font-bold text-gray-900 hover:border-gray-300 transition-colors flex items-center justify-center gap-3">
                  <GoogleG />Continue with Google
                </button>

                <p className="text-sm text-gray-500 mt-8">
                  Already have an account? <Link href="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  By signing up you agree to our{" "}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and{" "}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </p>
              </div>
            )}

            {/* ══ STEP 2: OTP ══ */}
            {step === "otp" && (
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-blue-600 uppercase mb-3">Get started</p>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Verify your email</h1>
                <p className="text-gray-500 mb-8">Enter the 6-digit code sent to <span className="font-bold text-gray-900">{email}</span></p>

                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                  {devOtp && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">Dev mode — email not configured</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Your OTP: <span className="font-mono font-bold tracking-[0.3em] text-base text-amber-900">{devOtp}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  <OTPBoxes value={otp} onChange={v => { setOtp(v); setError(""); }} error={!!error} disabled={loading} />

                  {error && (
                    <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />{error}
                    </p>
                  )}

                  <button type="submit" disabled={loading || otp.replace(/\s/g, "").length !== 6}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : <>Verify &amp; Continue<ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); setDevOtp(""); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      ← Change email
                    </button>
                    <ResendTimer onResend={handleResendOtp} />
                  </div>
                </form>
              </div>
            )}

            {/* ══ STEP 3: ORG SETUP ══ */}
            {step === "org" && (
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-blue-600 uppercase mb-3">Get started</p>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Set up your organization</h1>
                <p className="text-gray-500 mb-7">Takes 30 seconds. Do this once.</p>

                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 font-semibold">Email verified! Now set up your company.</p>
                  </div>

                  {/* Company name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Company name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                      <input value={orgName} onChange={e => { setOrgName(e.target.value); setOrgErrors(p => ({ ...p, name: "" })); }}
                        placeholder="e.g. Sharma Manufacturing Pvt Ltd" autoFocus
                        className={orgErrors.name ? iErrCls : iCls} />
                    </div>
                    {orgErrors.name && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />{orgErrors.name}
                      </p>
                    )}
                  </div>

                  {/* State + Industry */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">State <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select value={orgState} onChange={e => setOrgState(e.target.value)} className={sCls}>
                          {STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-4 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Industry</label>
                      <div className="relative">
                        <select value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} className={sCls}>
                          {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-4 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* City + GSTIN */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
                      <input value={orgCity} onChange={e => setOrgCity(e.target.value)}
                        placeholder="e.g. Pune" className={iPlain} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        GSTIN <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input value={orgGstin} onChange={e => { setOrgGstin(e.target.value.toUpperCase()); setOrgErrors(p => ({ ...p, gstin: "" })); }}
                        placeholder="27XXXXX1234X1Z5" maxLength={15}
                        className={`${orgErrors.gstin ? iPlainErr : iPlain} font-mono`} />
                      {orgErrors.gstin && <p className="text-xs text-red-500 mt-1">{orgErrors.gstin}</p>}
                    </div>
                  </div>

                  <button onClick={handleOrgCreate} disabled={orgSaving}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-1">
                    {orgSaving
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Creating organization...</>
                      : <>Go to Dashboard<ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: brand panel ── */}
      <BrandPanel />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-3px)}40%,80%{transform:translateX(3px)}}
        .shake{animation:shake .35s ease-in-out;}
      ` }} />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}