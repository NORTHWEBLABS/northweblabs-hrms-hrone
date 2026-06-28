"use client";

import { useEffect, useState } from "react";
import SiteHome from "@/components/site/SiteHome";
import { DEFAULT_THEME, DEFAULT_HEADER, DEFAULT_SECTIONS } from "@/lib/site-defaults";
import Footer from "@/components/Footer";

type Doc = { theme: any; header: any; sections: any[] };

const SEED: Doc = { theme: DEFAULT_THEME, header: DEFAULT_HEADER, sections: DEFAULT_SECTIONS };

export default function PreviewPage() {
  const [doc, setDoc] = useState<Doc>(SEED);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.source === "nwl-editor" && d.type === "doc" && d.doc) {
        setDoc(d.doc as Doc);
      }
    };
    window.addEventListener("message", onMsg);

    const inIframe = typeof window !== "undefined" && window.parent && window.parent !== window;
    if (inIframe) {
      // tell the editor we're mounted so it (re)sends the current draft
      try { window.parent.postMessage({ source: "nwl-preview", type: "ready" }, "*"); } catch {}
    } else {
      // opened standalone — show the saved doc
      fetch("/api/site")
        .then((r) => r.json())
        .then((j) => { if (j?.doc?.sections) setDoc(j.doc); })
        .catch(() => {});
    }
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <>
      <SiteHome theme={doc.theme} header={doc.header} sections={doc.sections} />
      <Footer />
    </>
  );
}