import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require login
const PROTECTED = [
  "/dashboard", "/employees", "/attendance", "/payroll",
  "/leaves", "/settings", "/documents", "/compliance", "/reports",
  "/store", "/cashflow", "/cash-register", "/expenses", "/offboarding",
  "/letters", "/whatsapp", "/erp", "/me", "/approvals", "/notifications",
  "/onboard", "/organizations",
];

// Routes restricted by role (role → allowed routes)
const ROLE_ROUTES: Record<string, string[]> = {
  super_admin: [], // access everything including /organizations
  owner:    [], // access everything
  admin:    [], // access everything
  hr:       ["/dashboard","/employees","/attendance","/payroll","/leaves","/offboarding","/letters","/approvals","/documents","/reports","/me","/notifications","/settings","/onboard"],
  manager:  ["/dashboard","/employees","/attendance","/leaves","/approvals","/documents","/reports","/me","/notifications"],
  employee: ["/dashboard","/me","/approvals","/notifications","/leaves","/documents","/attendance"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/employee-login";
  const sessionToken = request.cookies.get("session_token")?.value;

  // No cookie + protected → login
  if (isProtected && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Has cookie → validate
  if (sessionToken && (isProtected || isAuthPage)) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name) => request.cookies.get(name)?.value,
            set: (name: string, value: string, options: CookieOptions) => { response.cookies.set({ name, value, ...options }); },
            remove: (name: string, options: CookieOptions) => { response.cookies.set({ name, value: "", ...options }); },
          },
        }
      );

      const { data: session } = await supabase
        .from("user_sessions")
        .select("user_id, expires_at")
        .eq("token", sessionToken)
        .single();

      if (!session || new Date(session.expires_at) < new Date()) {
        // Invalid/expired session
        if (isProtected) {
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          const res = NextResponse.redirect(url);
          res.cookies.delete("session_token");
          return res;
        }
        // On auth page with bad session — clear cookie, stay
        response.cookies.delete("session_token");
        return response;
      }

      // Valid session on auth page → dashboard
      if (isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Role-based access check
      if (isProtected && session.user_id) {
        const { data: user } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user_id)
          .maybeSingle();

        const role = user?.role || "employee";
        const allowed = ROLE_ROUTES[role];

        // If allowed is empty array (owner/admin), skip check — full access
        if (allowed && allowed.length > 0) {
          const hasAccess = allowed.some(r => pathname.startsWith(r));
          if (!hasAccess) {
            // No access → redirect to dashboard with error
            return NextResponse.redirect(new URL("/dashboard?access=denied", request.url));
          }
        }
      }
    } catch {
      // DB error — let through in dev
      if (isProtected && process.env.NODE_ENV === "production") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};