import SiteHome from "@/components/site/SiteHome";
import { DEFAULT_THEME, DEFAULT_HEADER, DEFAULT_SECTIONS } from "@/lib/site-defaults";
import Footer from "@/components/Footer";

// render on request — do not statically prerender this preview route
export const dynamic = "force-dynamic";

export default function SitePreview() {
  return (
    <>
      <SiteHome theme={DEFAULT_THEME} header={DEFAULT_HEADER} sections={DEFAULT_SECTIONS} />
      <Footer />
    </>
  );
}