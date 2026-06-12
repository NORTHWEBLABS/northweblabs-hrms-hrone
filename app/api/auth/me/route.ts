// Route: app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ error: "No session" }, { status: 401 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  // Try user_id first, fallback to employee_id
  let userId: string | null = null;
  const { data: session } = await supabase.from("user_sessions").select("*").eq("token", token).maybeSingle();
  if (session) {
    userId = session.user_id || session.employee_id || null;
  }

  if (!userId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  // Get user
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, email, role, org_id, phone, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    // Maybe user_id points to employees table instead
    const { data: emp } = await supabase
      .from("employees")
      .select("id, full_name, email, department, designation, org_id, phone, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (emp) {
      return NextResponse.json({
        user: { id: emp.id, full_name: emp.full_name, email: emp.email, role: "employee", org_id: emp.org_id, phone: emp.phone, created_at: emp.created_at }
      });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}