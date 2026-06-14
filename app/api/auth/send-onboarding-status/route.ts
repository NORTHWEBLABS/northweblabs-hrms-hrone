// Route: app/api/auth/send-onboarding-status/route.ts
// Two email types: employee_pending + admin_approve
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to, employeeName, approverName, orgName, designation, department, dateOfJoining, employeeCode, type, orgId } = await req.json();
    if (!to) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const key = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@northweblabs.com";
    const approveUrl = `${req.nextUrl.origin}/employees`;
    const joinDate = dateOfJoining ? new Date(dateOfJoining).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "TBD";

    if (!key) {
      console.log(`[onboarding-email] DEV MODE | type=${type} | to=${to}`);
      return NextResponse.json({ success: true, dev: true });
    }

    let subject = "", html = "";

    if (type === "employee_pending") {
      subject = `Onboarding complete — pending approval at ${orgName}`;
      html = `
        <div style="font-family:'Inter',-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:40px 32px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#F59E0B,#D97706);border-radius:50%;line-height:48px;text-align:center">
              <span style="color:#fff;font-size:22px">⏳</span>
            </div>
          </div>
          <h1 style="font-size:22px;font-weight:800;color:#0F172A;text-align:center;margin:0 0 8px">Onboarding submitted!</h1>
          <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 24px">
            Hi ${employeeName.split(" ")[0]}, your onboarding at <strong style="color:#0F172A">${orgName}</strong> has been submitted and is pending HR/Admin approval.
          </p>
          <div style="background:#FFFBEB;border:2px solid #FDE68A;border-radius:16px;padding:20px;margin-bottom:24px">
            <p style="font-size:13px;color:#92400E;font-weight:600;margin:0 0 12px">Your details</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;font-size:13px;color:#92400E;width:130px">Name</td><td style="padding:6px 0;font-size:14px;color:#78350F;font-weight:600">${employeeName}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#92400E;border-top:1px solid #FDE68A">Designation</td><td style="padding:6px 0;font-size:14px;color:#78350F;font-weight:600;border-top:1px solid #FDE68A">${designation || "—"}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#92400E;border-top:1px solid #FDE68A">Department</td><td style="padding:6px 0;font-size:14px;color:#78350F;font-weight:600;border-top:1px solid #FDE68A">${department || "—"}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#92400E;border-top:1px solid #FDE68A">Date of joining</td><td style="padding:6px 0;font-size:14px;color:#78350F;font-weight:600;border-top:1px solid #FDE68A">${joinDate}</td></tr>
              ${employeeCode ? `<tr><td style="padding:6px 0;font-size:13px;color:#92400E;border-top:1px solid #FDE68A">Employee code</td><td style="padding:6px 0;font-size:14px;color:#78350F;font-weight:600;border-top:1px solid #FDE68A">${employeeCode}</td></tr>` : ""}
            </table>
          </div>
          <p style="font-size:13px;color:#64748B;text-align:center;margin:0 0 8px">
            You'll receive a welcome email once approved. You can then login and access your dashboard.
          </p>
          <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
          <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">${orgName} · Powered by NorthWebLabs</p>
        </div>`;
    }

    if (type === "admin_approve") {
      subject = `Action required: Approve ${employeeName}'s onboarding`;
      html = `
        <div style="font-family:'Inter',-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:40px 32px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:50%;line-height:48px;text-align:center">
              <span style="color:#fff;font-size:22px">👤</span>
            </div>
          </div>
          <h1 style="font-size:22px;font-weight:800;color:#0F172A;text-align:center;margin:0 0 8px">New employee needs approval</h1>
          <p style="font-size:14px;color:#64748B;text-align:center;margin:0 0 24px">
            Hi ${(approverName || "Admin").split(" ")[0]}, a new employee has been onboarded at <strong style="color:#0F172A">${orgName}</strong> and needs your approval.
          </p>
          <div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:16px;padding:20px;margin-bottom:24px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;width:130px">Name</td><td style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600">${employeeName}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Designation</td><td style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${designation || "—"}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Department</td><td style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${department || "—"}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Date of joining</td><td style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${joinDate}</td></tr>
              ${employeeCode ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748B;border-top:1px solid #E2E8F0">Employee code</td><td style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;border-top:1px solid #E2E8F0">${employeeCode}</td></tr>` : ""}
            </table>
          </div>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${approveUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#22C55E,#16A34A);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px">
              Review & Approve →
            </a>
          </div>
          <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
            Click the button above or go to Employees page in your dashboard.
          </p>
          <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0 12px"/>
          <p style="font-size:11px;color:#CBD5E1;text-align:center;margin:0">${orgName} · Powered by NorthWebLabs</p>
        </div>`;
    }

    if (!subject) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${orgName} <${fromEmail}>`, to: [to], subject, html }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[onboarding-email]", err.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}