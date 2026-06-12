// Route: app/api/auth/send-otp/route.ts
// ONLY generates OTP, stores in DB, sends email via Resend
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => request.cookies.get(n)?.value, set: () => {}, remove: () => {} } }
    );

    await supabase.from("otp_tokens").insert({
      email: cleanEmail,
      otp,
      expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
    });

    // Send email
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.log("[OTP] DEV MODE:", otp);
      return NextResponse.json({ success: true, dev: true, otp });
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `NorthWebLabs <${process.env.RESEND_FROM_EMAIL || "hello@northweblabs.com"}>`,
        to: [cleanEmail],
        subject: "Your verification code",
        html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px;text-align:center"><div style="width:48px;height:48px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:14px;margin:0 auto 20px;line-height:48px"><span style="color:#fff;font-size:20px;font-weight:bold">N</span></div><h2 style="color:#0F172A;margin:0 0 8px">Verification Code</h2><p style="color:#64748B;font-size:14px;margin:0 0 24px">Use this code to verify your email</p><div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 20px"><div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#0F172A;font-family:monospace">${otp}</div></div><p style="color:#94A3B8;font-size:13px">Expires in 10 minutes</p><hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/><p style="color:#CBD5E1;font-size:11px">NorthWebLabs</p></div>`,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-otp]", err.message);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}