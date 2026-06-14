import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that require a valid session
const PROTECTED = [
  "/dashboard", "/organizations", "/employees", "/attendance", "/payroll",
  "/leaves", "/approvals", "/offboarding", "/letters", "/store", "/cashflow",
  "/cash-register", "/expenses", "/settings", "/documents", "/compliance",
  "/reports", "/me",
];

// Everything except the super-admin platform page
const FULL_APP = PROTECTED.filter((p) => p !== "/organizations");

// Default landing page per role (also fallback when a role hits a page it can't access)
const HOME: Record<string, string> = {
  super_admin: "/organizations",
  owner: "/dashboard",
  admin: "/dashboard",
  hr: "/dashboard",
  manager: "/dashboard",
  employee: "/me",
};

// Allowed path prefixes per role
const ACCESS: Record<string, string[]> = {
  super_admin: ["/organizations"],
  owner: FULL_APP,
  admin: FULL_APP, // billing distinction handled inside /settings UI, not here
  hr: ["/dashboard", "/employees", "/attendance", "/payroll", "/leaves",
       "/approvals", "/documents", "/compliance", "/reports", "/me"],
  manager: ["/dashboard", "/approvals", "/attendance", "/leaves", "/me"],
  employee: ["/me", "/attendance", "/leaves", "/approvals"],
};

// Boundary-aware match: "/me" matches /me and /me/* but NOT /menu
function matchPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function canAccess(role: string | null, pathname: string): boolean {
  if (!role) return false;
  const allowed = ACCESS[role];
  if (!allowed) return false; // unknown role
  return matchPath(pathname, allowed);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const pathname = request.nextUrl.pathname;
  const isProtected = matchPath(pathname, PROTECTED);
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const sessionToken = request.cookies.get("session_token")?.value;

  // Unauthenticated user hitting a protected page → login
  if (isProtected && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Nothing to validate
  if (!sessionToken || (!isProtected && !isAuthPage)) {
    return response;
  }

  // Validate the session once (needed for both access control and auth-page redirects)
  let role: string | null = null;
  let valid = false;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            response.cookies.set({ name, value, ...options });
          },
          remove: (name: string, options: CookieOptions) => {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: session } = await supabase
      .from("user_sessions")
      .select("user_id, role, expires_at")
      .eq("token", sessionToken)
      .single();

    if (session && new Date(session.expires_at) >= new Date()) {
      const r = session.role ?? null;
      if (r && r in HOME) {
        valid = true;
        role = r;
      }
      // null/unknown role → leave invalid (forces re-login; legacy pre-role sessions)
    }
  } catch {
    // DB error: redirect to login in prod, let through in dev
    if (isProtected && process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Logged-in user on an auth page → bounce to their role home
  if (isAuthPage) {
    if (valid) {
      return NextResponse.redirect(new URL(HOME[role!], request.url));
    }
    response.cookies.delete("session_token"); // stale token
    return response;
  }

  // Protected page, invalid/expired session → clear cookie, login
  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete("session_token");
    return res;
  }

  // Valid session but role not allowed on this path → send to role home
  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL(HOME[role!], request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};