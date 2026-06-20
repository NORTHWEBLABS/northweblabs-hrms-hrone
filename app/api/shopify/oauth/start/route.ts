// Route: app/api/shopify/oauth/start/route.ts
// Kicks off Shopify OAuth. Visit:
//   https://northweblabs.com/api/shopify/oauth/start?orgId=YOUR_ORG_ID
// Redirects to Shopify consent; callback stores the token (encrypted) in the DB.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHOP = process.env.SHOPIFY_KC_DOMAIN!;
const CLIENT_ID = process.env.SHOPIFY_KC_CLIENT_ID!;
const APP_URL = "https://northweblabs.com";
const SCOPES = "read_orders,read_draft_orders";

export async function GET(req: Request) {
  if (!SHOP || !CLIENT_ID) {
    return NextResponse.json({ ok: false, error: "Missing SHOPIFY_KC_DOMAIN or SHOPIFY_KC_CLIENT_ID" }, { status: 500 });
  }
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") || "";
  if (!orgId) {
    return NextResponse.json({ ok: false, error: "Pass ?orgId=... (the org to attach this Shopify store to)" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  // state carries both CSRF nonce and the orgId, separated by '.'
  const state = `${nonce}.${orgId}`;
  const redirectUri = `${APP_URL}/api/shopify/oauth/callback`;

  const authUrl =
    `https://${SHOP}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("shopify_oauth_nonce", nonce, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return res;
}
