"use client";
// Route: app/(auth)/login/page.tsx

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Mail, Loader2, AlertCircle, ArrowRight, Check, RefreshCw,
  Shield, Users, Zap, Sparkles, KeyRound,
  Eye, EyeOff, ChevronLeft, CheckCircle2, Smartphone,
} from "lucide-react";

// ─── Infinite walking mesh animation ──────────────────────────────────────────
function MeshWalk() {
  // Creates an infinite moving mesh/grid with nodes that drift
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base moving grid */}
      <svg className="absolute w-[200%] h-[200%]" style={{ animation: "meshDrift 60s linear infinite" }}>
        <defs>
          <pattern id="meshGrid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(129,140,248,0.07)" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(129,140,248,0.07)" strokeWidth="1" />
          </pattern>
          <radialGradient id="meshNodeG" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#meshGrid)" />
      </svg>

      {/* Floating nodes with connections */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
        {/* Drifting connection lines */}
        {[
          [80,120,260,90],[260,90,400,180],[80,120,140,280],[260,90,320,250],
          [400,180,520,140],[400,180,460,330],[140,280,320,250],[320,250,460,330],
          [140,280,100,440],[320,250,280,420],[460,330,520,480],[100,440,280,420],
          [280,420,460,500],[100,440,160,580],[280,420,340,600],[460,500,520,620],
          [160,580,340,600],[340,600,520,620],[160,580,80,720],[340,600,260,740],
          [520,620,460,760],[80,720,260,740],[260,740,460,760],
        ].map(([x1,y1,x2,y2], i) => (
          <g key={`e${i}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(129,140,248,0.12)" strokeWidth="1">
              <animate attributeName="stroke-opacity" values="0.04;0.2;0.04"
                dur={`${3+(i%5)*0.8}s`} repeatCount="indefinite" begin={`${(i%8)*0.5}s`} />
            </line>
            {i < 12 && (
              <circle r="1.5" fill="rgba(165,180,252,0.6)">
                <animateMotion dur={`${4+i*0.3}s`} repeatCount="indefinite" begin={`${i*0.6}s`}
                  path={`M${x1},${y1} L${x2},${y2}`} />
              </circle>
            )}
          </g>
        ))}

        {/* Nodes */}
        {[
          [80,120],[260,90],[400,180],[140,280],[320,250],[460,330],
          [100,440],[280,420],[460,500],[160,580],[340,600],[520,620],
          [80,720],[260,740],[460,760],[520,140],
        ].map(([x,y], i) => (
          <g key={`n${i}`}>
            <circle cx={x} cy={y} r="4" fill="url(#meshNodeG)">
              <animate attributeName="r" values="3;5.5;3" dur={`${2.5+(i%4)*0.6}s`}
                repeatCount="indefinite" begin={`${i*0.35}s`} />
              <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2.8+(i%3)*0.5}s`}
                repeatCount="indefinite" begin={`${i*0.25}s`} />
            </circle>
            <circle cx={x} cy={y} r="14" fill="none" stroke="rgba(129,140,248,0.08)">
              <animate attributeName="r" values="6;20;6" dur={`${3.5+(i%4)*0.6}s`}
                repeatCount="indefinite" begin={`${i*0.4}s`} />
              <animate attributeName="opacity" values="0.2;0;0.2" dur={`${3.5+(i%4)*0.6}s`}
                repeatCount="indefinite" begin={`${i*0.4}s`} />
            </circle>
          </g>
        ))}
      </svg>

      {/* Slow-moving gradient orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/[0.08] rounded-full blur-3xl"
        style={{ animation: "orbFloat1 20s ease-in-out infinite" }} />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-violet-600/[0.06] rounded-full blur-3xl"
        style={{ animation: "orbFloat2 25s ease-in-out infinite" }} />
      <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-blue-500/[0.05] rounded-full blur-3xl"
        style={{ animation: "orbFloat3 22s ease-in-out infinite" }} />
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

type Screen = "method"|"password"|"otp-email"|"otp-verify"|"forgot-email"|"forgot-otp"|"forgot-newpw";
const iCls = "w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white placeholder:text-gray-400";

function LoginContent() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [screen, setScreen] = useState<Screen>("method");
  const [history, setHistory] = useState<Screen[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  const go = (s: Screen) => { setHistory(h=>[...h,screen]); setError(""); setOtp(""); setDevOtp(""); setScreen(s); };
  const back = () => { const h=[...history]; const last=h.pop()||"method"; setHistory(h); setError(""); setOtp(""); setDevOtp(""); setScreen(last); };

  // ── Password login ──────────────────────────────────────────────────────────
  const handlePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Enter your email"); return; }
    if (!password.trim()) { setError("Enter your password"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("userEmail", email.trim().toLowerCase());
      if (data.user?.org_id) localStorage.setItem("activeOrgId", data.user.org_id);
      if (data.user?.name) localStorage.setItem("userName", data.user.name);
      // Fallback: fetch org from DB if not in response
      if (!data.user?.org_id) {
        const { data: u } = await supabase.from("users").select("org_id,full_name").eq("email",email.trim().toLowerCase()).maybeSingle();
        if (u?.org_id) localStorage.setItem("activeOrgId", u.org_id);
        if (u?.full_name) localStorage.setItem("userName", u.full_name);
      }
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

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
      if (data.user?.orgName) localStorage.setItem("activeOrgName", data.user.orgName);
      // Fallback: fetch from DB if not in response
      if (!data.user?.org_id || !data.user?.name || data.user.name === email.split("@")[0]) {
        const { data: u } = await supabase.from("users").select("org_id, full_name, role").eq("email", email.trim().toLowerCase()).order("org_id", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
        if (u?.org_id) localStorage.setItem("activeOrgId", u.org_id);
        if (u?.full_name && u.full_name !== email.split("@")[0]) localStorage.setItem("userName", u.full_name);
        if (u?.role === "super_admin" || data.user?.role === "super_admin") {
          window.location.href = "/organizations";
          return;
        }
        // Fetch org name if we have org_id but no name
        if (u?.org_id && !data.user?.orgName) {
          const { data: org } = await supabase.from("organizations").select("brand_name, name").eq("id", u.org_id).maybeSingle();
          if (org) localStorage.setItem("activeOrgName", org.brand_name || org.name || "");
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

  // ── Forgot password ─────────────────────────────────────────────────────────
  const handleForgotSend = async (e?: React.FormEvent) => {
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
      go("forgot-otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const handleForgotVerify = async (e?: React.FormEvent) => {
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
      go("forgot-newpw");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP"); setOtp("");
    } finally { setLoading(false); }
  };

  const handleSetNewPassword = async () => {
    if (newPw.length < 8) { setError("Min 8 characters"); return; }
    if (newPw !== newPwConfirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim(), password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("userEmail", email.trim().toLowerCase());
      const { data: u } = await supabase.from("users").select("org_id,full_name").eq("email",email.trim().toLowerCase()).maybeSingle();
      if (u?.org_id) localStorage.setItem("activeOrgId", u.org_id);
      if (u?.full_name) localStorage.setItem("userName", u.full_name);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
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

  const emailField = (onSubmit?: () => void) => (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
        <Mail className="w-3.5 h-3.5 text-gray-400"/>Work email
      </label>
      <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
        placeholder="you@company.com" autoFocus autoComplete="email"
        onKeyDown={e=>{if(e.key==="Enter"&&onSubmit)onSubmit();}}
        className={iCls} />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left panel with mesh walking animation ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-[#0f172a] p-12 text-white relative overflow-hidden">
        <MeshWalk />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none z-10" />

        <div className="relative z-20">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-5 h-5 text-white"/>
            </div>
            <span className="text-lg font-bold tracking-tight">NorthWebLabs</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            Welcome<br/>
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">back.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Sign in to manage your team, track attendance, and run payroll seamlessly.
          </p>

          <div className="space-y-4">
            {[
              {icon:<Shield className="w-4 h-4"/>, text:"End-to-end encrypted"},
              {icon:<Users className="w-4 h-4"/>, text:"500+ companies trust us"},
              {icon:<Zap className="w-4 h-4"/>, text:"Password or OTP — your choice"},
              {icon:<Sparkles className="w-4 h-4"/>, text:"AI-powered HR insights"},
            ].map(f=>(
              <div key={f.text} className="flex items-center gap-3 text-slate-400">
                <div className="text-indigo-400 flex-shrink-0">{f.icon}</div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-20 text-slate-600 text-xs">© 2025 NorthWebLabs · NorthWebLabs</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50/60 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#0f172a] rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-white"/>
            </div>
            <span className="text-lg font-bold text-gray-900">NorthWebLabs</span>
          </div>

          {screen !== "method" && (
            <button onClick={back} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 group transition-colors">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"/>Back
            </button>
          )}

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

            {/* ══ METHOD SELECTION ══ */}
            {screen === "method" && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
                <p className="text-gray-500 text-sm mb-7">Choose how you'd like to sign in</p>

                <div className="space-y-3">
                  <button onClick={()=>go("password")}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group text-left">
                    <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                      <KeyRound className="w-5 h-5 text-indigo-600"/>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">Password</p>
                      <p className="text-xs text-gray-500 mt-0.5">Email & password</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all"/>
                  </button>

                  <button onClick={()=>go("otp-email")}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-violet-200 hover:bg-violet-50/50 transition-all group text-left">
                    <div className="w-11 h-11 bg-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                      <Smartphone className="w-5 h-5 text-violet-600"/>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">OTP</p>
                      <p className="text-xs text-gray-500 mt-0.5">One-time code to your email</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all"/>
                  </button>
                </div>

                <div className="mt-7 pt-5 border-t border-gray-100 text-center space-y-2">
                  <p className="text-xs text-gray-400">
                    New here? <Link href="/signup" className="text-indigo-600 font-semibold hover:underline">Create account →</Link>
                  </p>
                  <p className="text-xs text-gray-400">
                    Employee? <Link href="/employee-login" className="text-indigo-600 font-semibold hover:underline">Employee login →</Link>
                  </p>
                </div>
              </div>
            )}

            {/* ══ PASSWORD ══ */}
            {screen === "password" && (
              <div className="p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center"><KeyRound className="w-5 h-5 text-indigo-600"/></div>
                  <div><h2 className="text-lg font-bold text-gray-900">Password login</h2><p className="text-xs text-gray-500">Sign in with email & password</p></div>
                </div>
                <form onSubmit={handlePassword} className="flex flex-col gap-4">
                  {emailField(()=>{})}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-700">Password</label>
                      <button type="button" onClick={()=>go("forgot-email")} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">Forgot password?</button>
                    </div>
                    <div className="relative">
                      <input type={showPw?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}}
                        placeholder="Enter your password" autoComplete="current-password" className={iCls+" pr-12"} />
                      <button type="button" onClick={()=>setShowPw(s=>!s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>
                  <Err msg={error}/>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white font-bold text-sm rounded-2xl hover:from-[#1e293b] hover:to-[#334155] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-gray-900/10">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Signing in...</>:<>Sign in<ArrowRight className="w-4 h-4"/></>}
                  </button>
                  <p className="text-center text-xs text-gray-400">No password? <button type="button" onClick={()=>go("otp-email")} className="text-indigo-600 font-semibold hover:underline">Use OTP</button></p>
                </form>
              </div>
            )}

            {/* ══ OTP EMAIL ══ */}
            {screen === "otp-email" && (
              <div className="p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center"><Mail className="w-5 h-5 text-violet-600"/></div>
                  <div><h2 className="text-lg font-bold text-gray-900">OTP login</h2><p className="text-xs text-gray-500">We'll email you a 6-digit code</p></div>
                </div>
                <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
                  {emailField(()=>{})}
                  <Err msg={error}/>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm rounded-2xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-violet-200">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Sending...</>:<>Send OTP<ArrowRight className="w-4 h-4"/></>}
                  </button>
                </form>
              </div>
            )}

            {/* ══ OTP VERIFY ══ */}
            {screen === "otp-verify" && (
              <div className="p-8">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><Smartphone className="w-7 h-7 text-violet-600"/></div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Check your email</h2>
                  <p className="text-sm text-gray-500">Code sent to <span className="font-bold text-gray-800">{email}</span></p>
                </div>
                <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
                  {devOtp && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                      <div><p className="text-xs font-bold text-amber-800">Dev mode</p><p className="text-xs text-amber-700 mt-0.5">OTP: <span className="font-mono font-bold tracking-[0.3em] text-base text-amber-900">{devOtp}</span></p></div>
                    </div>
                  )}
                  <OTPBoxes value={otp} onChange={v=>{setOtp(v);setError("");}} error={!!error} disabled={loading}/>
                  <Err msg={error}/>
                  <button type="submit" disabled={loading||otp.replace(/\s/g,"").length!==6}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm rounded-2xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-violet-200">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Verifying...</>:<>Verify &amp; Sign in<ArrowRight className="w-4 h-4"/></>}
                  </button>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={()=>{setOtp("");setError("");setDevOtp("");go("otp-email");}} className="text-xs text-gray-400 hover:text-gray-600">← Change email</button>
                    <ResendTimer onResend={handleResend}/>
                  </div>
                </form>
              </div>
            )}

            {/* ══ FORGOT EMAIL ══ */}
            {screen === "forgot-email" && (
              <div className="p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center"><KeyRound className="w-5 h-5 text-amber-600"/></div>
                  <div><h2 className="text-lg font-bold text-gray-900">Reset password</h2><p className="text-xs text-gray-500">We'll send a code to your email</p></div>
                </div>
                <form onSubmit={handleForgotSend} className="flex flex-col gap-4">
                  {emailField(()=>{})}
                  <Err msg={error}/>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-amber-200">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Sending...</>:<>Send Reset Code<ArrowRight className="w-4 h-4"/></>}
                  </button>
                </form>
              </div>
            )}

            {/* ══ FORGOT OTP ══ */}
            {screen === "forgot-otp" && (
              <div className="p-8">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><Mail className="w-7 h-7 text-amber-600"/></div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Verify it's you</h2>
                  <p className="text-sm text-gray-500">Code sent to <span className="font-bold text-gray-800">{email}</span></p>
                </div>
                <form onSubmit={handleForgotVerify} className="flex flex-col gap-5">
                  {devOtp && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                      <div><p className="text-xs font-bold text-amber-800">Dev mode</p><p className="text-xs text-amber-700 mt-0.5">OTP: <span className="font-mono font-bold tracking-[0.3em] text-base text-amber-900">{devOtp}</span></p></div>
                    </div>
                  )}
                  <OTPBoxes value={otp} onChange={v=>{setOtp(v);setError("");}} error={!!error} disabled={loading}/>
                  <Err msg={error}/>
                  <button type="submit" disabled={loading||otp.replace(/\s/g,"").length!==6}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Verifying...</>:<>Verify<ArrowRight className="w-4 h-4"/></>}
                  </button>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={back} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
                    <ResendTimer onResend={handleResend}/>
                  </div>
                </form>
              </div>
            )}

            {/* ══ NEW PASSWORD ══ */}
            {screen === "forgot-newpw" && (
              <div className="p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600"/></div>
                  <div><h2 className="text-lg font-bold text-gray-900">New password</h2><p className="text-xs text-gray-500">Choose a strong password</p></div>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">New password</label>
                    <div className="relative">
                      <input type={showNewPw?"text":"password"} value={newPw} onChange={e=>{setNewPw(e.target.value);setError("");}}
                        placeholder="Min. 8 characters" className={iCls+" pr-12"}/>
                      <button type="button" onClick={()=>setShowNewPw(s=>!s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNewPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Confirm password</label>
                    <input type="password" value={newPwConfirm} onChange={e=>{setNewPwConfirm(e.target.value);setError("");}}
                      placeholder="Re-enter password" className={iCls}/>
                  </div>
                  {newPw&&(
                    <div className="grid grid-cols-2 gap-1">
                      {[{l:"8+ characters",ok:newPw.length>=8},{l:"Has number",ok:/\d/.test(newPw)},{l:"Has uppercase",ok:/[A-Z]/.test(newPw)},{l:"Passwords match",ok:newPw===newPwConfirm&&newPwConfirm.length>0}].map(r=>(
                        <div key={r.l} className={`flex items-center gap-1.5 text-xs ${r.ok?"text-emerald-600":"text-gray-400"}`}>
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${r.ok?"bg-emerald-500":"bg-gray-200"}`}>
                            {r.ok&&<Check className="w-2 h-2 text-white"/>}
                          </div>{r.l}
                        </div>
                      ))}
                    </div>
                  )}
                  <Err msg={error}/>
                  <button onClick={handleSetNewPassword} disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-emerald-200">
                    {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:<>Set Password &amp; Sign in<ArrowRight className="w-4 h-4"/></>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Need help? <a href="mailto:support@northweblabs.com" className="text-indigo-600 hover:underline">support@northweblabs.com</a>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-3px)}40%,80%{transform:translateX(3px)}}
        .shake{animation:shake .35s ease-in-out;}
        @keyframes meshDrift{0%{transform:translate(0,0)}100%{transform:translate(-60px,-60px)}}
        @keyframes orbFloat1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,60px)}}
        @keyframes orbFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,-50px)}}
        @keyframes orbFloat3{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,-40px)}}
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500"/></div>}>
      <LoginContent/>
    </Suspense>
  );
}