// lib/shopify-token.ts
// Server-only. Loads/stores the encrypted Shopify access token via the
// service-role Supabase client (the only client allowed past RLS on
// shopify_credentials). Never import this into client components.

import { createClient } from "@supabase/supabase-js";
import { encryptToken, decryptToken } from "./shopify-crypto";

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS — required here
    { auth: { persistSession: false } }
  );

export interface ShopifyCred {
  orgId: string;
  shopDomain: string;
  token: string;        // decrypted
  scopes: string | null;
}

// Read + decrypt the stored token for an org/shop. Returns null if none.
export async function loadToken(orgId: string, shopDomain: string): Promise<ShopifyCred | null> {
  const sb = admin();
  const { data } = await sb
    .from("shopify_credentials")
    .select("access_token_enc, scopes")
    .eq("org_id", orgId)
    .eq("shop_domain", shopDomain)
    .maybeSingle();
  if (!data?.access_token_enc) return null;
  try {
    return { orgId, shopDomain, token: decryptToken(data.access_token_enc), scopes: data.scopes ?? null };
  } catch {
    return null; // bad key / corrupt — treat as missing so we re-mint
  }
}

// Encrypt + upsert a fresh token (e.g. after OAuth or a refresh).
export async function storeToken(orgId: string, shopDomain: string, token: string, scopes?: string) {
  const sb = admin();
  const now = new Date().toISOString();
  await sb.from("shopify_credentials").upsert(
    {
      org_id: orgId,
      shop_domain: shopDomain,
      access_token_enc: encryptToken(token),
      scopes: scopes ?? null,
      rotated_at: now,
      last_verified_at: now,
      updated_at: now,
    },
    { onConflict: "org_id,shop_domain" }
  );
}

export async function markVerified(orgId: string, shopDomain: string) {
  const sb = admin();
  await sb
    .from("shopify_credentials")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("shop_domain", shopDomain);
}
