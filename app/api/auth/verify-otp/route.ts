// Route: app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.replace(/\s/g, "");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => request.cookies.get(n)?.value, set: () => {}, remove: () => {} } }
    );

    // 1. Find OTP
    const { data: token, error: otpErr } = await supabase
      .from("otp_tokens")
      .select("id, otp, expires_at, used, attempts")
      .eq("email", cleanEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[verify] OTP lookup:", { found: !!token, err: otpErr?.message });

    if (!token) return NextResponse.json({ error: "No OTP found. Request a new one." }, { status: 400 });
    if (new Date(token.expires_at) < new Date()) return NextResponse.json({ error: "OTP expired." }, { status: 400 });
    if ((token.attempts || 0) >= 5) return NextResponse.json({ error: "Too many attempts." }, { status: 400 });

    await supabase.from("otp_tokens").update({ attempts: (token.attempts || 0) + 1 }).eq("id", token.id);

    if (token.otp !== cleanOtp) {
      return NextResponse.json({ error: `Wrong OTP. ${4 - (token.attempts || 0)} tries left.` }, { status: 400 });
    }

    await supabase.from("otp_tokens").update({ used: true }).eq("id", token.id);

    // 2. Find or create user (may have multiple orgs — pick the one with org_id first)
    let { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, org_id, role")
      .eq("email", cleanEmail)
      .order("org_id", { ascending: false, nullsFirst: false })
      .limit(5);

    let user = (users && users.length > 0) ? users[0] : null;
    // Prefer super_admin if exists
    const superAdmin = users?.find((u: any) => u.role === "super_admin");
    if (superAdmin) user = superAdmin;

    console.log("[verify] User lookup:", { found: !!user, role: user?.role, org_id: user?.org_id });

    console.log("[verify] User lookup:", { found: !!user, org_id: user?.org_id });

    if (!user) {
      const { data: newUser, error: createErr } = await supabase
        .from("users")
        .insert({ email: cleanEmail, full_name: cleanEmail.split("@")[0], role: "owner" })
        .select("id, full_name, email, org_id, role")
        .single();
      console.log("[verify] User created:", { id: newUser?.id, err: createErr?.message });
      user = newUser;
    }

    if (!user) return NextResponse.json({ error: "Failed to create account" }, { status: 500 });

    // 3. Check if employee is approved (block unapproved employees)
    if (user.org_id && user.role === "employee") {
      const { data: emp } = await supabase.from("employees")
        .select("approval_status, full_name")
        .eq("email", cleanEmail).eq("org_id", user.org_id).maybeSingle();
      if (emp && emp.approval_status === "pending") {
        return NextResponse.json({ error: "Your account is pending approval. Please contact your HR/Admin." }, { status: 403 });
      }
      if (emp && emp.approval_status === "rejected") {
        return NextResponse.json({ error: "Your onboarding was not approved. Please contact your HR/Admin." }, { status: 403 });
      }
    }

    // 3. Fetch org name if user has org
    let orgName = "";
    if (user.org_id) {
      const { data: org } = await supabase.from("organizations").select("brand_name, name").eq("id", user.org_id).maybeSingle();
      orgName = org?.brand_name || org?.name || "";
    }

    // 4. Create session WITH org_id and role
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("user_sessions").insert({
      token: sessionToken,
      user_id: user.id,
      org_id: user.org_id || null,
      role: user.role || "employee",
      expires_at: expiresAt,
    });

    console.log("[verify] Session created:", { token: sessionToken.slice(0, 8), org_id: user.org_id, role: user.role });

    return NextResponse.json({
      success: true,
      sessionToken,
      user: { id: user.id, email: user.email, name: user.full_name, role: user.role, org_id: user.org_id, orgName },
      hasOrg: !!user.org_id,
    });
  } catch (err: any) {
    console.error("[verify] CRASH:", err.message);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}