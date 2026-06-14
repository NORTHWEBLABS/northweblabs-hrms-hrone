// Route: app/api/auth/send-welcome/route.ts
// Sent when admin/HR APPROVES an employee → "Welcome aboard!" with login link.
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      employeeName,
      orgName,
      designation,
      department,
      dateOfJoining,
      employeeCode,
      approvedBy,
    } = await request.json();

    if (!email || !employeeName || !orgName) {
      return NextResponse.json(
        { error: "email, employeeName and orgName required" },
        { status: 400 }
      );
    }

    const loginUrl = `${request.nextUrl.origin}/login?email=${encodeURIComponent(email)}`;
    const key = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@northweblabs.com";

    const detailRow = (label: string, value?: string) =>
      value
        ? `<tr>
             <td style="padding:6px 0;font-size:13px;color:#64748B">${label}</td>
             <td style="padding:6px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right">${value}</td>
           </tr>`
        : "";

    const html = `
      <div style="font-family:'Inter',-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 32px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:14px;line-height:48px;text-align:center">
            <span style="color:#fff;font-size:20px;font-weight:bold">N</span>
          </div>
        </div>
        <h1 style="font-size:22px;font-weight:700;color:#0F172A;text-align:center;margin:0 0 8px">
          Welcome aboard! 🎉
        </h1>
        <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 24px">
          Hi ${employeeName}, your onboarding at <strong>${orgName}</strong> has been approved. You're all set.
        </p>
        <div style="background:#F0FDF4;border:2px solid #BBF7D0;border-radius:16px;padding:24px;margin-bottom:24px">
          <p style="font-size:14px;color:#166534;margin:0 0 16px;text-align:center">
            Sign in to access your dashboard, mark attendance, apply for leave and view your payslips.
          </p>
          <div style="text-align:center">
            <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#16A34A,#22C55E);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px">
              Sign in to ${orgName} →
            </a>
          </div>
        </div>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="font-size:13px;color:#334155;margin:0 0 12px;font-weight:600">Your details</p>
          <table style="width:100%;border-collapse:collapse">
            ${detailRow("Employee code", employeeCode)}
            ${detailRow("Designation", designation)}
            ${detailRow("Department", department)}
            ${detailRow("Date of Joining", dateOfJoining)}
            ${detailRow("Approved by", approvedBy)}
          </table>
        </div>
        <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
          Your login email: <strong>${email}</strong>
        </p>
        <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
        <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">NorthWebLabs HRMS Platform</p>
      </div>`;

    if (!key) {
      console.log("[welcome] DEV MODE — no RESEND_API_KEY. Login URL:", loginUrl);
      return NextResponse.json({ success: true, dev: true, loginUrl });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `NorthWebLabs <${fromEmail}>`,
        to: [email],
        subject: `Welcome aboard at ${orgName} — your account is approved`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("[welcome] email failed:", await res.text());
      return NextResponse.json({ error: "Failed to send welcome email" }, { status: 502 });
    }

    return NextResponse.json({ success: true, loginUrl });
  } catch (err: any) {
    console.error("[welcome]", err.message);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}