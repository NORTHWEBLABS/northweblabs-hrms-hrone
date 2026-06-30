import SiteHome from "@/components/site/SiteHome";
import Footer from "@/components/Footer";
import { DEFAULT_THEME, DEFAULT_HEADER, DEFAULT_SECTIONS } from "@/lib/site-defaults";
import { createClient } from "@supabase/supabase-js";

// Always read the latest published doc so a Publish shows up immediately.
export const dynamic = "force-dynamic";

const SEED = { theme: DEFAULT_THEME, header: DEFAULT_HEADER, sections: DEFAULT_SECTIONS };

async function loadPublished() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data } = await sb.from("site_pages").select("published").eq("slug", "home").maybeSingle();
    const pub = data?.published as any;
    if (pub && Array.isArray(pub.sections) && pub.theme && pub.header) return pub;
  } catch {}
  return SEED;
}

export default async function Home() {
  const doc = await loadPublished();
  return (
    <>
      <SiteHome theme={doc.theme} header={doc.header} sections={doc.sections} />
      <Footer />
    </>
  );
}
