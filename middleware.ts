import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MODULES } from "@/lib/modules";

const PROTECTED = [
  "/dashboard", "/organizations", "/employees", "/attendance", "/payroll",
  "/loans", "/leaves", "/approvals", "/offboarding", "/letters", "/store", "/cashflow",
  "/cash-register", "/expenses", "/settings", "/documents", "/compliance",
  "/reports", "/me", "/my-attendance", "/org-structure",
];

const FULL_APP = PROTECTED.filter((p) => p !== "/organizations");

const HOME: Record<string, string> = {
  super_admin: "/organizations",
  owner: "/dashboard",
  admin: "/dashboard",
  hr: "/dashboard",
  manager: "/dashboard",
  employee: "/me",
};

const ACCESS: Record<string, string[]> = {
  super_admin: ["/organizations"],
  owner: FULL_APP,
  admin: FULL_APP,
  hr: ["/dashboard", "/employees", "/attendance", "/payroll", "/loans", "/leaves",
       "/approvals", "/documents", "/compliance", "/reports", "/me", "/my-attendance", "/org-structure"],
  manager: ["/dashboard", "/approvals", "/attendance", "/leaves", "/me", "/my-attendance"],
  employee: ["/me", "/my-attendance", "/attendance", "/leaves", "/approvals"],
};

const CONFIGURABLE_KEYS = new Set(MODULES.filter((m) => m.configurable).map((m) => m.key));

function matchPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function canAccess(role: string | null, pathname: string): boolean {
  if (!role) return false;
  const allowed = ACCESS[role];
  if (!allowed) return false;
  return matchPath(pathname, allowed);
}

function moduleKeyFor(pathname: string): string | null {
  const seg = "/" + (pathname.split("/")[1] || "");
  return CONFIGURABLE_KEYS.has(seg) ? seg : null;
}

async function hasModuleGrant(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  role: string,
  moduleKey: string
): Promise<boolean> {
  try {
    const { data: ov } = await supabase
      .from("user_module_overrides")
      .select("enabled")
      .eq("user_id", userId)
      .eq("module_key", moduleKey)
      .maybeSingle();
    if (ov) return !!ov.enabled;

    const { data: u } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();
    if (u?.org_id) {
      const { data: rp } = await supabase
        .from("module_permissions")
        .select("enabled")
        .eq("org_id", u.org_id)
        .eq("role", role)
        .eq("module_key", moduleKey)
        .maybeSingle();
      if (rp) return !!rp.enabled;
    }
    return false;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const pathname = request.nextUrl.pathname;
  const isProtected = matchPath(pathname, PROTECTED);
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const sessionToken = request.cookies.get("session_token")?.value;

  if (isProtected && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (!sessionToken || (!isProtected && !isAuthPage)) {
    return response;
  }

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

  let role: string | null = null;
  let userId: string | null = null;
  let valid = false;

  try {
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
        userId = session.user_id;
      }
    }
  } catch {
    if (isProtected && process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (isAuthPage) {
    if (valid) {
      return NextResponse.redirect(new URL(HOME[role!], request.url));
    }
    response.cookies.delete("session_token");
    return response;
  }

  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete("session_token");
    return res;
  }

  if (!canAccess(role, pathname)) {
    const modKey = moduleKeyFor(pathname);
    if (modKey && userId && (await hasModuleGrant(supabase, userId, role!, modKey))) {
      return response;
    }
    return NextResponse.redirect(new URL(HOME[role!], request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
