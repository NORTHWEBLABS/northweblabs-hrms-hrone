// Route: app/api/shopify/oauth/callback/route.ts
// Verifies HMAC + state, exchanges code → offline access token, ENCRYPTS it and
// stores it in shopify_credentials (server-only). No token is shown to the user.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { storeToken } from "@/lib/shopify-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.SHOPIFY_KC_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHOPIFY_KC_CLIENT_SECRET!;
const EXPECTED_SHOP = process.env.SHOPIFY_KC_DOMAIN!;

function verifyHmac(url: URL): boolean {
  const params = new URLSearchParams(url.search);
  const hmac = params.get("hmac") || "";
  params.delete("hmac");
  params.delete("signature");
  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const digest = crypto.createHmac("sha256", CLIENT_SECRET).update(message).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shop = url.searchParams.get("shop") || "";
    const state = url.searchParams.get("state") || "";

    if (!code || !shop) return NextResponse.json({ ok: false, error: "Missing code or shop" }, { status: 400 });
    if (shop !== EXPECTED_SHOP || !/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
      return NextResponse.json({ ok: false, error: `Unexpected shop: ${shop}` }, { status: 400 });
    }

    // state = "<nonce>.<orgId>"; verify nonce against cookie, extract orgId
    const [nonce, orgId] = state.split(".");
    const cookieNonce = req.headers.get("cookie")?.match(/shopify_oauth_nonce=([^;]+)/)?.[1];
    if (!nonce || !orgId || !cookieNonce || cookieNonce !== nonce) {
      return NextResponse.json({ ok: false, error: "State/nonce mismatch (CSRF)" }, { status: 400 });
    }
    if (!verifyHmac(url)) return NextResponse.json({ ok: false, error: "HMAC verification failed" }, { status: 400 });

    // Exchange code → permanent offline access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.access_token) {
      return NextResponse.json({ ok: false, error: "Token exchange failed", detail: data }, { status: 500 });
    }

    // Encrypt + store in DB (never returned to the browser)
    await storeToken(orgId, shop, data.access_token, data.scope || "");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Shopify connected</title>
<style>body{font-family:ui-sans-serif,system-ui;max-width:560px;margin:80px auto;padding:0 20px;color:#0f172a;text-align:center}
.ok{color:#15803d;font-weight:700;font-size:18px}.muted{color:#64748b;font-size:13px;margin-top:8px}</style></head>
<body>
<p class="ok">✓ Shopify connected for ${shop}</p>
<p>Token stored securely (encrypted). Scopes: <b>${(data.scope || "").replace(/,/g, ", ")}</b></p>
<p class="muted">You can close this tab and run the Cash Register pull. The token will auto-refresh if it ever rotates.</p>
</body></html>`;

    const res = new NextResponse(html, { headers: { "Content-Type": "text/html" } });
    res.cookies.set("shopify_oauth_nonce", "", { maxAge: 0, path: "/" });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "callback failed" }, { status: 500 });
  }
}
