// Route: app/api/auth/signout/route.ts  ← place in signout folder
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

async function deleteSession(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;
  if (!sessionToken) return;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );
    await supabase.from("user_sessions").delete().eq("token", sessionToken);
  } catch {}
}

function clearAllCookies(res: NextResponse, request: NextRequest) {
  // Clear session_token with every possible option combo
  for (const httpOnly of [true, false]) {
    res.cookies.set("session_token", "", {
      path: "/", maxAge: 0, expires: new Date(0), httpOnly,
    });
  }
  // Clear supabase cookies
  request.cookies.getAll().forEach(c => {
    if (c.name.startsWith("sb-")) {
      res.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) });
    }
  });
}

// GET — returns HTML that clears cookies client-side then redirects
// This is more reliable than 302 + Set-Cookie which some browsers handle poorly
export async function GET(request: NextRequest) {
  await deleteSession(request);

  // Return HTML page that clears cookies client-side and redirects
  const html = `<!DOCTYPE html><html><head><title>Signing out...</title></head><body>
<script>
document.cookie="session_token=;path=/;max-age=0;expires=Thu,01 Jan 1970 00:00:00 GMT";
document.cookie.split(";").forEach(function(c){
  document.cookie=c.split("=")[0].trim()+"=;path=/;max-age=0;expires=Thu,01 Jan 1970 00:00:00 GMT";
});
try{localStorage.clear()}catch(e){}
window.location.href="/login";
</script>
<p>Signing out...</p>
</body></html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
  clearAllCookies(res, request);
  return res;
}

// POST — for fetch() calls
export async function POST(request: NextRequest) {
  await deleteSession(request);
  const res = NextResponse.json({ success: true });
  clearAllCookies(res, request);
  return res;
}