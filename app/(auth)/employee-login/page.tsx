"use client";
// Route: app/(auth)/employee-login/page.tsx
// Employee-only login — OTP only (no password), lighter gradient theme

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Mail, Loader2, AlertCircle, ArrowRight, RefreshCw,
  Smile, Clock, FileText, Wallet, Smartphone,
} from "lucide-react";

// ─── OTP boxes ────────────────────────────────────────────────────────────────
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
              d?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-gray-200 bg-white"}
            focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:opacity-40`}
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
    : <button onClick={onResend} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
        <RefreshCw className="w-3 h-3"/>Resend OTP
      </button>;
}

type Screen = "email" | "verify";

function EmployeeLoginContent() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setScreen("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally { setLoading(false); }
  };

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
      if (!res.ok) throw new Error(data.error || data.message || JSON.stringify(data));
      // Set session cookie
      if (data.sessionToken) {
        document.cookie = `session_token=${data.sessionToken}; path=/; max-age=${7*24*60*60}; SameSite=Lax`;
      }
      // Store email so /me page can find the user
      localStorage.setItem("userEmail", email.trim().toLowerCase());
      if (data.user?.org_id) localStorage.setItem("activeOrgId", data.user.org_id);
      if (data.user?.name) localStorage.setItem("userName", data.user.name);
      // Employee goes to /me
      window.location.href = "/me";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      console.error("Verify OTP error:", msg);
      setError(msg);
      setOtp("");
    } finally { setLoading(false); }
  };

  const handleResend = () => {
    setOtp(""); setError(""); setDevOtp("");
    fetch("/api/auth/send-otp", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ email }),
    }).then(r=>r.json()).then(d => { if (d.dev && d.otp) setDevOtp(d.otp); });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100/60 border border-indigo-100/60 overflow-hidden">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-8 py-10 text-white text-center relative overflow-hidden">
            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
                {Array.from({length:8}).map((_,i)=>(
                  <line key={`h${i}`} x1="0" y1={i*28} x2="400" y2={i*28} stroke="white" strokeWidth="0.5">
                    <animate attributeName="y1" values={`${i*28};${i*28+14};${i*28}`} dur={`${8+i*0.5}s`} repeatCount="indefinite"/>
                    <animate attributeName="y2" values={`${i*28};${i*28+14};${i*28}`} dur={`${8+i*0.5}s`} repeatCount="indefinite"/>
                  </line>
                ))}
                {Array.from({length:14}).map((_,i)=>(
                  <line key={`v${i}`} x1={i*32} y1="0" x2={i*32} y2="200" stroke="white" strokeWidth="0.5">
                    <animate attributeName="x1" values={`${i*32};${i*32+16};${i*32}`} dur={`${10+i*0.4}s`} repeatCount="indefinite"/>
                    <animate attributeName="x2" values={`${i*32};${i*32+16};${i*32}`} dur={`${10+i*0.4}s`} repeatCount="indefinite"/>
                  </line>
                ))}
              </svg>
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/10">
                <Smile className="w-8 h-8 text-white"/>
              </div>
              <h1 className="text-2xl font-bold mb-1">Employee Portal</h1>
              <p className="text-indigo-200 text-sm">Sign in with your work email</p>
            </div>
          </div>

          {/* Quick features */}
          <div className="grid grid-cols-3 divide-x divide-indigo-100 border-b border-indigo-100">
            {[
              {icon:<Clock className="w-4 h-4"/>, label:"Attendance"},
              {icon:<FileText className="w-4 h-4"/>, label:"Leave"},
              {icon:<Wallet className="w-4 h-4"/>, label:"Payslips"},
            ].map(f=>(
              <div key={f.label} className="py-3.5 flex flex-col items-center gap-1.5 text-indigo-400">
                {f.icon}
                <span className="text-xs font-medium text-gray-500">{f.label}</span>
              </div>
            ))}
          </div>

          {/* ── EMAIL STEP ── */}
          {screen === "email" && (
            <div className="p-8">
              <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400"/>Work email
                  </label>
                  <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                    placeholder="you@company.com" autoFocus autoComplete="email"
                    className={`w-full px-4 py-3.5 text-sm border-2 rounded-2xl outline-none transition-all bg-white placeholder:text-gray-400
                      ${error?"border-red-400 focus:ring-4 focus:ring-red-100":"border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"}`} />
                  {error && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0"/>{error}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-2xl hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                  {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Sending OTP...</>:<>Send OTP<ArrowRight className="w-4 h-4"/></>}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
                <p className="text-xs text-gray-400">
                  Admin or manager? <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Admin login →</Link>
                </p>
                <p className="text-xs text-gray-400">
                  New employee? <Link href="/signup" className="text-indigo-600 font-semibold hover:underline">Sign up →</Link>
                </p>
              </div>
            </div>
          )}

          {/* ── VERIFY STEP ── */}
          {screen === "verify" && (
            <div className="p-8">
              <div className="text-center mb-7">
                <div className="w-14 h-14 bg-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-7 h-7 text-violet-600"/>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Check your email</h2>
                <p className="text-sm text-gray-500">Code sent to <span className="font-bold text-gray-800">{email}</span></p>
              </div>

              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
                {devOtp && (
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-xs font-bold text-amber-800">Dev mode</p>
                      <p className="text-xs text-amber-700 mt-0.5">OTP: <span className="font-mono font-bold tracking-[0.3em] text-base text-amber-900">{devOtp}</span></p>
                    </div>
                  </div>
                )}
                <OTPBoxes value={otp} onChange={v=>{setOtp(v);setError("");}} error={!!error} disabled={loading}/>
                {error && <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/>{error}</p>}
                <button type="submit" disabled={loading||otp.replace(/\s/g,"").length!==6}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-2xl hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                  {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Verifying...</>:<>Verify &amp; Sign in<ArrowRight className="w-4 h-4"/></>}
                </button>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={()=>{setScreen("email");setOtp("");setError("");setDevOtp("");}} className="text-xs text-gray-400 hover:text-gray-600">← Change email</button>
                  <ResendTimer onResend={handleResend}/>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don't have an account? Ask your HR team for an invite link.
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-3px)}40%,80%{transform:translateX(3px)}}
        .shake{animation:shake .35s ease-in-out;}
      `}</style>
    </div>
  );
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500"/></div>}>
      <EmployeeLoginContent/>
    </Suspense>
  );
}