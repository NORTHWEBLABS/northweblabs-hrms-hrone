// Route: app/api/auth/send-invite/route.ts
// Sends a branded invite email to org owner (not an OTP)
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { email, orgName, ownerName, orgId } = await request.json();
    if (!email || !orgName) return NextResponse.json({ error: "Email and org name required" }, { status: 400 });

    const loginUrl = `${request.nextUrl.origin}/login?email=${encodeURIComponent(email)}&org=${orgId || ""}`;

    // Send via Resend
    const key = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@northweblabs.com";

    if (!key) {
      console.log("[invite] DEV MODE — no RESEND_API_KEY. Login URL:", loginUrl);
      return NextResponse.json({ success: true, dev: true, loginUrl });
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `NorthWebLabs <${fromEmail}>`,
        to: [email],
        subject: `You're invited to manage ${orgName} on NorthWebLabs`,
        html: `
          <div style="font-family:'Inter',-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 32px">
            <div style="text-align:center;margin-bottom:32px">
              <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:14px;line-height:48px;text-align:center">
                <span style="color:#fff;font-size:20px;font-weight:bold">N</span>
              </div>
            </div>
            <h1 style="font-size:22px;font-weight:700;color:#0F172A;text-align:center;margin:0 0 8px">
              Welcome to NorthWebLabs
            </h1>
            <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 24px">
              Hi ${ownerName || "there"}, your organization <strong>${orgName}</strong> has been created.
            </p>
            <div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:16px;padding:24px;margin-bottom:24px">
              <p style="font-size:14px;color:#334155;margin:0 0 16px;text-align:center">
                Sign in to set up your company profile, create departments, and start onboarding your team.
              </p>
              <div style="text-align:center">
                <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px">
                  Sign in & Set Up →
                </a>
              </div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:600">What you can do:</p>
              <ul style="font-size:13px;color:#166534;margin:8px 0 0;padding-left:20px">
                <li>Configure your org structure & locations</li>
                <li>Create departments & verticals</li>
                <li>Add employees & assign roles</li>
                <li>Set up attendance, leaves & payroll</li>
              </ul>
            </div>
            <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
              Your login email: <strong>${email}</strong>
            </p>
            <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
            <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">NorthWebLabs HRMS Platform</p>
          </div>
        `,
      }),
    });

    return NextResponse.json({ success: true, loginUrl });
  } catch (err: any) {
    console.error("[invite]", err.message);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}