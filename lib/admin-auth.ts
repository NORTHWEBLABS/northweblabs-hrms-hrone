import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const SUPER_ADMIN_EMAIL = "hello@northweblabs.com";

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Resolve the signed-in user from the session_token cookie.
export async function currentUser(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return null;
  const sb = adminClient();
  const { data: session } = await sb
    .from("user_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!session) return null;
  if (session.expires_at && new Date(session.expires_at) < new Date()) return null;
  const { data: user } = await sb
    .from("users")
    .select("id, email, role, full_name, org_id")
    .eq("id", session.user_id)
    .maybeSingle();
  return user || null;
}

export function isSuper(user: any): boolean {
  if (!user) return false;
  return (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL || user.role === "super_admin";
}

// Convenience: returns the user if super-admin, else null.
export async function getSuper(req: NextRequest) {
  const u = await currentUser(req);
  return isSuper(u) ? u : null;
}