// app/api/notifications/events/route.ts
// Call this daily via a cron job (Vercel Cron, GitHub Actions, or external scheduler)
// URL: POST /api/notifications/events
// Add to vercel.json: { "crons": [{ "path": "/api/notifications/events", "schedule": "0 8 * * *" }] }

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_xxx")) {
    console.log(`[events-notify] Would send to ${to}: ${subject}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "HROne <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

function birthdayEmailHtml(empName: string, orgName: string, isToday: boolean): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
      <p style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:24px">${orgName}</p>
      <div style="background:#fdf2f8;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:16px">🎂</div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px">
          ${isToday ? `Today is ${empName}'s Birthday!` : `${empName}'s Birthday in 3 Days`}
        </h2>
        <p style="color:#64748b;font-size:14px">
          ${isToday
            ? `Don't forget to wish ${empName} a happy birthday today! 🎉`
            : `${empName}'s birthday is coming up on ${new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString("en-IN",{day:"numeric",month:"long"})}.`
          }
        </p>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center">HROne by North Web Labs</p>
    </div>
  `;
}

function eventEmailHtml(eventTitle: string, orgName: string, isToday: boolean, note?: string): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
      <p style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:24px">${orgName}</p>
      <div style="background:#f0f9ff;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:16px">📅</div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px">
          ${isToday ? `Today: ${eventTitle}` : `Upcoming: ${eventTitle} in 3 days`}
        </h2>
        ${note ? `<p style="color:#64748b;font-size:14px">${note}</p>` : ""}
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center">HROne by North Web Labs</p>
    </div>
  `;
}

export async function POST() {
  try {
    const today = new Date();
    const todayStr    = today.toISOString().split("T")[0];
    const in3DaysDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in3DaysStr  = in3DaysDate.toISOString().split("T")[0];

    const todayMMDD    = todayStr.slice(5);    // MM-DD
    const in3DaysMMDD  = in3DaysStr.slice(5);  // MM-DD

    let emailsSent = 0;

    // Get all orgs with their admin emails
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name");

    for (const org of orgs || []) {
      // Get org admin emails
      const { data: admins } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", org.id)
        .in("role", ["owner", "admin"]);

      const adminEmails = (admins || []).map(a => a.email).filter(Boolean) as string[];
      if (adminEmails.length === 0) continue;

      // ── Birthday notifications ──────────────────────────────────────────────
      const { data: employees } = await supabase
        .from("employees")
        .select("full_name, date_of_birth")
        .eq("org_id", org.id)
        .eq("status", "active")
        .not("date_of_birth", "is", null);

      for (const emp of employees || []) {
        const dobMMDD = (emp.date_of_birth as string).slice(5); // MM-DD

        // Today's birthday
        if (dobMMDD === todayMMDD) {
          for (const email of adminEmails) {
            await sendEmail(
              email,
              `🎂 Today is ${emp.full_name}'s Birthday!`,
              birthdayEmailHtml(emp.full_name, org.name, true)
            );
            emailsSent++;
          }
        }

        // 3 days before birthday
        if (dobMMDD === in3DaysMMDD) {
          for (const email of adminEmails) {
            await sendEmail(
              email,
              `🎂 ${emp.full_name}'s Birthday in 3 days`,
              birthdayEmailHtml(emp.full_name, org.name, false)
            );
            emailsSent++;
          }
        }
      }

      // ── Company event notifications ─────────────────────────────────────────
      const { data: events } = await supabase
        .from("company_events")
        .select("title, date, note, recurring")
        .eq("org_id", org.id);

      for (const ev of events || []) {
        const evDate   = (ev.date as string).slice(0, 10);
        const evMMDD   = evDate.slice(5);
        const matchToday   = ev.recurring ? evMMDD === todayMMDD   : evDate === todayStr;
        const matchIn3Days = ev.recurring ? evMMDD === in3DaysMMDD : evDate === in3DaysStr;

        if (matchToday) {
          for (const email of adminEmails) {
            await sendEmail(
              email,
              `📅 Today: ${ev.title}`,
              eventEmailHtml(ev.title, org.name, true, ev.note)
            );
            emailsSent++;
          }
        }

        if (matchIn3Days) {
          for (const email of adminEmails) {
            await sendEmail(
              email,
              `📅 Reminder: ${ev.title} in 3 days`,
              eventEmailHtml(ev.title, org.name, false, ev.note)
            );
            emailsSent++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent });
  } catch (err: unknown) {
    console.error("[events-notify]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

// Also allow GET for easy testing in browser
export async function GET() {
  return POST();
}