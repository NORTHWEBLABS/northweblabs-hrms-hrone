"use client";
// Route: app/(auth)/login/page.tsx
// OTP-only sign-in (password option removed). Brand panel with dashboard mock
// on the right. Backend untouched: same /api/auth/send-otp + verify-otp calls,
// same Supabase fallbacks, redirects & cookies.

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Mail, Loader2, AlertCircle, ArrowRight, RefreshCw, ChevronLeft,
} from "lucide-react";

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
      else if (i > 0) { refs.current[i-1]?.focus(); onChange(digits.map((d,j)=>j===i-1?"":d).join("")); }
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i-1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i+1]?.focus();
  };
  const handleChange = (i: number, val: string) => {
    const d = val.replace(/\D/g,"").slice(-1);
    onChange(digits.map((x,j)=>j===i?d:x).join(""));
    if (d && i < 5) setTimeout(()=>refs.current[i+1]?.focus(), 0);
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (p) { onChange(p.padEnd(6,"").slice(0,6)); refs.current[Math.min(p.length,5)]?.focus(); }
    e.preventDefault();
  };
  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d,i) => (
        <input key={i} ref={el=>{refs.current[i]=el;}}
          type="text" inputMode="numeric" maxLength={1} value={d} disabled={disabled}
          onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} onPaste={handlePaste}
          autoFocus={i===0}
          className={`w-11 text-center text-xl font-bold border-2 rounded-2xl outline-none transition-all
            ${error?"border-red-400 bg-red-50 text-red-700 shake":
              d?"border-blue-600 bg-blue-50 text-blue-700":"border-gray-200 bg-white"}
            focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-40`}
          style={{height:52}} />
      ))}
    </div>
  );
}

function ResendTimer({ onResend }: { onResend: () => void }) {
  const [secs, setSecs] = useState(30);
  useEffect(() => {
    setSecs(30);
    const t = setInterval(() => setSecs(s => { if (s<=1){clearInterval(t);return 0;} return s-1; }), 1000);
    return () => clearInterval(t);
  }, []);
  return secs > 0
    ? <span className="text-gray-400 text-xs">Resend in <span className="font-bold text-gray-600 tabular-nums">{secs}s</span></span>
    : <button onClick={onResend} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
        <RefreshCw className="w-3 h-3"/>Resend OTP
      </button>;
}

type Screen = "method" | "otp-verify";
const iCls = "w-full pl-11 pr-4 py-3.5 text-sm border-2 border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all bg-white placeholder:text-gray-400";

function LoginContent() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [screen, setScreen] = useState<Screen>("method");
  const [history, setHistory] = useState<Screen[]>([]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = (s: Screen) => { setHistory(h=>[...h,screen]); setError(""); setOtp(""); setDevOtp(""); setScreen(s); };
  const back = () => { const h=[...history]; const last=h.pop()||"method"; setHistory(h); setError(""); setOtp(""); setDevOtp(""); setScreen(last); };

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.dev && data.otp) setDevOtp(data.otp);
      go("otp-verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally { setLoading(false); }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.replace(/\s/g,"").length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim(), otp: otp.replace(/\s/g,"") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Set session cookie client-side
      if (data.sessionToken) {
        document.cookie = `session_token=${data.sessionToken}; path=/; max-age=${7*24*60*60}; SameSite=Lax`;
      }
      localStorage.setItem("userEmail", email.trim().toLowerCase());
      if (data.user?.name) localStorage.setItem("userName", data.user.name);
      if (data.user?.org_id) localStorage.setItem("activeOrgId", data.user.org_id);
      // Fallback: fetch org from DB if not in response
      if (!data.user?.org_id) {
        const { data: u } = await supabase.from("users").select("org_id,full_name,role").eq("email",email.trim().toLowerCase()).maybeSingle();
        if (u?.org_id) localStorage.setItem("activeOrgId", u.org_id);
        if (u?.full_name) localStorage.setItem("userName", u.full_name);
        // Super admin goes to /organizations
        if (u?.role === "super_admin" || data.user?.role === "super_admin") {
          window.location.href = "/organizations";
          return;
        }
      }
      if (data.user?.role === "super_admin") {
        window.location.href = "/organizations";
        return;
      }
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP"); setOtp("");
    } finally { setLoading(false); }
  };

  const handleResend = () => {
    setOtp(""); setError(""); setDevOtp("");
    fetch("/api/auth/send-otp", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ email }),
    }).then(r=>r.json()).then(d => { if (d.dev && d.otp) setDevOtp(d.otp); });
  };

  const Err = ({ msg }: { msg: string }) => !msg ? null : (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>{msg}
    </div>
  );

  const DevOtpNote = () => !devOtp ? null : (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
      <div><p className="text-xs font-bold text-amber-800">Dev mode</p><p className="text-xs text-amber-700 mt-0.5">OTP: <span className="font-mono font-bold tracking-[0.3em] text-base text-amber-900">{devOtp}</span></p></div>
    </div>
  );

  const emailField = (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">Work email</label>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
        <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
          placeholder="ananya@company.com" autoFocus autoComplete="email"
          className={iCls} />
      </div>
    </div>
  );

  const googleButton = (
    <>
      <div className="flex items-center gap-4 my-6">
        <span className="flex-1 h-px bg-gray-200" />
        <span className="font-mono text-[11px] tracking-[0.25em] text-gray-400">OR</span>
        <span className="flex-1 h-px bg-gray-200" />
      </div>
      <button type="button" onClick={()=>setError("Google sign-in isn't enabled yet — use email instead.")}
        className="w-full py-3.5 border-2 border-gray-200 rounded-2xl bg-white text-sm font-bold text-gray-900 hover:border-gray-300 transition-colors flex items-center justify-center gap-3">
        <GoogleG />Continue with Google
      </button>
    </>
  );

  const isMain = screen === "method";

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

            {!isMain && (
              <button onClick={back} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 group transition-colors">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"/>Back
              </button>
            )}

            {/* ══ SIGN IN (email code) ══ */}
            {isMain && (
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-blue-600 uppercase mb-3">Welcome back</p>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Sign in</h1>
                <p className="text-gray-500 mb-8">Welcome back. Enter your work email and we&rsquo;ll send you a sign-in code.</p>

                <form onSubmit={handleSendOTP} className="flex flex-col gap-5">
                  {emailField}
                  <Err msg={error}/>
                  <button type="submit" disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Sending...</>:<>Email me a code<ArrowRight className="w-4 h-4"/></>}
                  </button>
                </form>

                {googleButton}

                <div className="mt-8 space-y-2">
                  <p className="text-sm text-gray-500">
                    New to NorthWeb Labs? <Link href="/signup" className="text-blue-600 font-bold hover:underline">Create an account</Link>
                  </p>
                  <p className="text-sm text-gray-500">
                    Employee? <Link href="/employee-login" className="text-blue-600 font-bold hover:underline">Employee login</Link>
                  </p>
                </div>
              </div>
            )}

            {/* ══ OTP VERIFY ══ */}
            {screen === "otp-verify" && (
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-blue-600 uppercase mb-3">Welcome back</p>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Check your email</h1>
                <p className="text-gray-500 mb-8">We sent a 6-digit code to <span className="font-bold text-gray-900">{email}</span></p>
                <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
                  <DevOtpNote />
                  <OTPBoxes value={otp} onChange={v=>{setOtp(v);setError("");}} error={!!error} disabled={loading}/>
                  <Err msg={error}/>
                  <button type="submit" disabled={loading||otp.replace(/\s/g,"").length!==6}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Verifying...</>:<>Verify &amp; Sign in<ArrowRight className="w-4 h-4"/></>}
                  </button>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={()=>{setOtp("");setError("");setDevOtp("");back();}} className="text-xs text-gray-400 hover:text-gray-600">← Change email</button>
                    <ResendTimer onResend={handleResend}/>
                  </div>
                </form>
              </div>
            )}


            <p className="text-xs text-gray-400 mt-10">
              Need help? <a href="mailto:support@northweblabs.com" className="text-blue-600 hover:underline">support@northweblabs.com</a>
            </p>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>}>
      <LoginContent/>
    </Suspense>
  );
}