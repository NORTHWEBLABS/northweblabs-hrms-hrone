import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_THEME, DEFAULT_HEADER, DEFAULT_SECTIONS } from "@/lib/site-defaults";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPER_ADMIN_EMAIL = "hello@northweblabs.com";
const SLUG = "home";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Resolve the signed-in user from the session_token cookie; return user row or null.
async function currentUser(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return null;
  const sb = admin();
  const { data: session } = await sb
    .from("user_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!session) return null;
  if (session.expires_at && new Date(session.expires_at) < new Date()) return null;
  const { data: user } = await sb
    .from("users")
    .select("id, email, role")
    .eq("id", session.user_id)
    .maybeSingle();
  return user || null;
}

function isSuper(user: any) {
  if (!user) return false;
  return (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL || user.role === "super_admin";
}

const defaultsDoc = () => ({
  theme: DEFAULT_THEME,
  header: DEFAULT_HEADER,
  sections: DEFAULT_SECTIONS,
});

// GET — load the editable doc (draft if present, else seed defaults) + whether the caller may edit.
export async function GET(req: NextRequest) {
  try {
    const sb = admin();
    const { data: row } = await sb
      .from("site_pages")
      .select("draft, published")
      .eq("slug", SLUG)
      .maybeSingle();

    const doc = row?.draft && (row.draft as any).sections ? row.draft : defaultsDoc();
    const user = await currentUser(req);
    return NextResponse.json({
      doc,
      published: row?.published || null,
      canEdit: isSuper(user),
    });
  } catch (e: any) {
    // Table missing or DB error — fall back to seed so the editor still loads.
    const user = await currentUser(req).catch(() => null);
    return NextResponse.json({ doc: defaultsDoc(), published: null, canEdit: isSuper(user), warn: e?.message || "load-fallback" });
  }
}

// POST — save draft, or publish (draft -> published + revalidate "/"). Super-admin only.
export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!isSuper(user)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const action = body?.action === "publish" ? "publish" : "save";
  const doc = body?.doc;
  if (!doc || !Array.isArray(doc.sections) || !doc.theme || !doc.header) {
    return NextResponse.json({ error: "Invalid document" }, { status: 400 });
  }

  const sb = admin();
  try {
    const { data: existing } = await sb.from("site_pages").select("slug").eq("slug", SLUG).maybeSingle();
    if (existing) {
      const patch: any = { draft: doc };
      if (action === "publish") patch.published = doc;
      const { error } = await sb.from("site_pages").update(patch).eq("slug", SLUG);
      if (error) throw error;
    } else {
      const { error } = await sb.from("site_pages").insert({
        slug: SLUG,
        draft: doc,
        published: action === "publish" ? doc : null,
      });
      if (error) throw error;
    }

    if (action === "publish") {
      try { revalidatePath("/"); } catch {}
    }
    return NextResponse.json({ ok: true, action });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Save failed" }, { status: 500 });
  }
}