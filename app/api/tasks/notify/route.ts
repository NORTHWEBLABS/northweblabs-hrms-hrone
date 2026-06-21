// app/api/tasks/notify/route.ts
// Creates an in-app notification (service role) and emails the recipient.
// POST { userId, title, body?, type?, link?, email? }

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_xxx")) {
    console.log(`[task-notify] Would send to ${to}: ${subject}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "HROne <onboarding@resend.dev>", to, subject, html }),
  });
  return res.ok;
}

function emailHtml(title: string, body: string | null, link: string, base: string): string {
  const url = `${base}${link?.startsWith("/") ? link : "/" + (link || "tasks")}`;
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
      <p style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:24px">HROne</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
        <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">${esc(title)}</h2>
        ${body ? `<p style="color:#64748b;font-size:14px;line-height:1.5;margin:0 0 20px">${esc(body)}</p>` : ""}
        <a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px">Open task</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">HROne by North Web Labs</p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const { userId, title, body = null, type = "info", link = "/tasks", email: emailHint } = await request.json();
    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
    }

    // 1) in-app notification (service role bypasses RLS)
    const { error: insErr } = await supabase.from("notifications").insert({
      user_id: userId, title, body, type, link,
    });
    if (insErr) throw new Error(insErr.message);

    // 2) email the recipient (best-effort)
    let to: string | undefined = emailHint;
    if (!to) {
      const { data: u } = await supabase.from("users").select("email").eq("id", userId).maybeSingle();
      to = u?.email || undefined;
    }
    let emailed = false;
    if (to) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.northweblabs.com";
      emailed = await sendEmail(to, title, emailHtml(title, body, link, base));
    }

    return NextResponse.json({ success: true, emailed });
  } catch (err: unknown) {
    console.error("[task-notify]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
