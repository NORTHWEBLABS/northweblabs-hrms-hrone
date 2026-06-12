"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Loader2, AlertCircle, CheckCircle2, Building2, RefreshCw } from "lucide-react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [orgName, setOrgName]       = useState("");
  const [role, setRole]             = useState("");
  const [inviteError, setInviteError] = useState("");
  const [checking, setChecking]     = useState(true);

  const [email, setEmail]   = useState("");
  const [otp, setOtp]       = useState("");
  const [step, setStep]     = useState<"email"|"otp">("email");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [error, setError]   = useState("");

  // Load and validate invite
  useEffect(() => {
    if (!token) return;
    const check = async () => {
      const { data, error } = await supabase
        .from("org_invites")
        .select("org_id, role, used, expires_at, organizations(name)")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) { setInviteError("This invite link is invalid."); setChecking(false); return; }
      if (data.used)       { setInviteError("This invite has already been used."); setChecking(false); return; }
      if (new Date(data.expires_at) < new Date()) { setInviteError("This invite has expired."); setChecking(false); return; }

      setOrgName((data.organizations as { name: string })?.name || "");
      setRole(data.role);
      setChecking(false);
    };
    check();
  }, [token, supabase]);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError("Valid email required"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    if (data.dev && data.otp) setDevOtp(data.otp);
    setStep("otp");
    setLoading(false);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Enter 6-digit OTP"); return; }
    setLoading(true); setError("");
    try {
      // Verify OTP
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Accept invite — link user to org
      const userId = data.user?.id;
      if (userId) {
        // Get org_id from invite
        const { data: inv } = await supabase
          .from("org_invites").select("org_id, role").eq("token", token).single();

        if (inv) {
          await supabase.from("users").update({ org_id: inv.org_id, role: inv.role }).eq("id", userId);
          await supabase.from("org_invites").update({ used: true, used_by: userId }).eq("token", token);
          localStorage.setItem("activeOrgId", inv.org_id);
          localStorage.setItem("activeOrgName", orgName);
        }
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message.replace("unusable","Invalid or expired OTP — request a new one") : "Invalid OTP");
      setOtp("");
    } finally { setLoading(false); }
  };

  if (checking) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin"/>
    </div>
  );

  if (inviteError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-500"/>
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-2">Invalid invite</h2>
        <p className="text-sm text-gray-500">{inviteError}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-lg font-bold text-[#0f172a]">North Web Labs</span>
          </div>
        </div>

        {/* Invite banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-indigo-600"/>
          </div>
          <div>
            <p className="text-xs text-indigo-500 mb-0.5">You&apos;ve been invited to</p>
            <p className="text-base font-bold text-indigo-900">{orgName}</p>
            <p className="text-xs text-indigo-500 capitalize mt-0.5">{role} access</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <h1 className="text-base font-bold text-gray-900 mb-1">
            {step === "email" ? "Sign in to accept" : "Enter OTP"}
          </h1>
          <p className="text-xs text-gray-500 mb-5">
            {step === "email" ? "Enter your email to join" : `Code sent to ${email}`}
          </p>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                  placeholder="you@company.com" autoFocus
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 ${error?"border-red-300":"border-gray-200"}`}/>
              </div>
              {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Sending...</>:"Send OTP →"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="flex flex-col gap-3">
              {devOtp && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-800">Dev OTP: <span className="font-mono tracking-widest">{devOtp}</span></p>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0"/>
                <p className="text-xs text-indigo-700">Sent to <span className="font-semibold">{email}</span></p>
              </div>
              <input type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={e=>{setOtp(e.target.value.replace(/\D/g,""));setError("");}}
                placeholder="000000" autoFocus
                className={`w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300
                  ${error?"border-red-300 bg-red-50":otp.length===6?"border-emerald-300 bg-emerald-50/40":"border-gray-200"}`}/>
              {error && <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
              <button type="submit" disabled={loading||otp.length!==6}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Joining...</>:"Join organization →"}
              </button>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={()=>{setStep("email");setOtp("");setError("");}} className="text-gray-400 hover:text-gray-600">← Change email</button>
                <button type="button" onClick={()=>{
                  setOtp("");setError("");setDevOtp("");
                  fetch("/api/auth/send-otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})})
                    .then(r=>r.json()).then(d=>{if(d.dev&&d.otp)setDevOtp(d.otp);});
                }} className="flex items-center gap-1 text-indigo-600 font-medium"><RefreshCw className="w-3 h-3"/>Resend</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}