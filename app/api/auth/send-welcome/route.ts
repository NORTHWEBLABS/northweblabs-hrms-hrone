// Route: app/api/auth/send-welcome/route.ts
// Sends branded welcome email when employee is approved
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, employeeName, orgName, designation, department, dateOfJoining, employeeCode, approvedBy } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const loginUrl = `${req.nextUrl.origin}/login?email=${encodeURIComponent(email)}`;
    const key = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@northweblabs.com";

    if (!key) {
      console.log("[welcome] DEV MODE — no RESEND_API_KEY. Would send to:", email);
      return NextResponse.json({ success: true, dev: true });
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${orgName} <${fromEmail}>`,
        to: [email],
        subject: `Welcome to ${orgName}, ${employeeName.split(" ")[0]}! 🎉`,
        html: `
          <div style="font-family:'Inter',-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:40px 32px">
            <div style="text-align:center;margin-bottom:28px">
              <div style="display:inline-block;width:52px;height:52px;background:linear-gradient(135deg,#22C55E,#16A34A);border-radius:50%;line-height:52px;text-align:center">
                <span style="color:#fff;font-size:24px">✓</span>
              </div>
            </div>

            <h1 style="font-size:24px;font-weight:800;color:#0F172A;text-align:center;margin:0 0 8px">
              Welcome aboard, ${employeeName.split(" ")[0]}!
            </h1>
            <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 28px">
              Your onboarding at <strong style="color:#0F172A">${orgName}</strong> has been approved.
            </p>

            <div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:16px;padding:24px;margin-bottom:24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#64748B;width:140px">Designation</td>
                  <td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600">${designation}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Department</td>
                  <td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${department}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Date of Joining</td>
                  <td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${dateOfJoining}</td>
                </tr>
                ${employeeCode ? `<tr>
                  <td style="padding:8px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Employee Code</td>
                  <td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${employeeCode}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Approved by</td>
                  <td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${approvedBy}</td>
                </tr>
              </table>
            </div>

            <div style="text-align:center;margin-bottom:24px">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px">
                Login to your Dashboard →
              </a>
            </div>

            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:600">What you can do now:</p>
              <ul style="font-size:13px;color:#166534;margin:8px 0 0;padding-left:20px">
                <li>Mark your daily attendance</li>
                <li>View your salary and payslips</li>
                <li>Apply for leaves</li>
                <li>Complete your profile details</li>
              </ul>
            </div>

            <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
              Login with: <strong>${email}</strong>
            </p>
            <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
            <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">${orgName} · Powered by NorthWebLabs</p>
          </div>
        `,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[welcome]", err.message);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}