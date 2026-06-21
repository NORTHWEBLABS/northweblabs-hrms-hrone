// app/api/tasks/notify/route.ts
// Creates an in-app notification (service role) + emails the recipient.
// Accepts employeeId (preferred — tasks store employee ids) or userId.
// POST { employeeId?, userId?, orgId?, title, body?, type?, link? }

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
    const { employeeId, userId, orgId, title, body = null, type = "info", link = "/tasks" } = await request.json();
    if (!title || (!employeeId && !userId)) {
      return NextResponse.json({ error: "title and employeeId|userId are required" }, { status: 400 });
    }

    // resolve recipient -> users.id + email (employee email is the bridge)
    let resolvedUserId: string | undefined = userId;
    let to: string | undefined;

    if (resolvedUserId) {
      const { data: u } = await supabase.from("users").select("email").eq("id", resolvedUserId).maybeSingle();
      to = u?.email || undefined;
    } else if (employeeId) {
      const { data: emp } = await supabase.from("employees").select("email").eq("id", employeeId).maybeSingle();
      const email = (emp?.email || "").trim();
      if (email) {
        const { data: u } = await supabase.from("users").select("id, email").ilike("email", email).maybeSingle();
        if (u) { resolvedUserId = u.id; to = u.email || email; }
        else { to = email; }
      }
    }

    if (!resolvedUserId && !to) {
      return NextResponse.json({ success: true, delivered: false, reason: "recipient not found" });
    }

    // in-app notification (try without org_id; if the schema requires it, retry with it)
    let delivered = false;
    if (resolvedUserId) {
      let insErr = (await supabase.from("notifications").insert({ user_id: resolvedUserId, title, body, type, link })).error;
      if (insErr && orgId) {
        insErr = (await supabase.from("notifications").insert({ user_id: resolvedUserId, title, body, type, link, org_id: orgId })).error;
      }
      if (insErr) throw new Error(insErr.message);
      delivered = true;
    }

    // email (best-effort)
    let emailed = false;
    if (to) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.northweblabs.com";
      emailed = await sendEmail(to, title, emailHtml(title, body, link, base));
    }

    return NextResponse.json({ success: true, delivered, emailed });
  } catch (err: unknown) {
    console.error("[task-notify]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
