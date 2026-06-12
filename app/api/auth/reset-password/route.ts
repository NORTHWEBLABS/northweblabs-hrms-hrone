// Route: app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key to update auth.users password
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // 1. Find the user in public.users to get their id
    const { data: user, error: findErr } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (findErr || !user) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }

    // 2. Update password via Supabase Admin Auth API
    //    This updates auth.users.encrypted_password properly
    const { error: authErr } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (authErr) {
      // Fallback: try updating via the public.users table directly
      // Check what password column exists
      const cols = ["password_hash", "encrypted_password", "password"];
      let updated = false;

      for (const col of cols) {
        const { error } = await supabase
          .from("users")
          .update({ [col]: password })
          .eq("id", user.id);
        if (!error) { updated = true; break; }
      }

      if (!updated) {
        return NextResponse.json({ 
          error: "Could not update password. Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local" 
        }, { status: 500 });
      }
    }

    // 3. Create session so user is auto-logged in
    const token = crypto.randomUUID();
    await supabase.from("user_sessions").insert({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).catch(() => {
      // user_sessions might not have user_id — try minimal
      return supabase.from("user_sessions").insert({
        token,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("session_token", token, {
      path: "/",
      maxAge: 7 * 86400,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}