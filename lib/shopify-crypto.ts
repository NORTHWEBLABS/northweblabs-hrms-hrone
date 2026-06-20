// lib/shopify-crypto.ts
// AES-256-GCM encryption for Shopify tokens at rest.
// Key comes from SHOPIFY_ENC_KEY (env) — a 64-char hex string (32 bytes).
// Format stored in DB: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"

import crypto from "crypto";

function key(): Buffer {
  const raw = process.env.SHOPIFY_ENC_KEY || "";
  // accept 64-hex-char (32-byte) key; fail loudly otherwise so we never
  // silently encrypt with a weak/empty key.
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("SHOPIFY_ENC_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(raw, "hex");
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12); // GCM standard nonce size
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptToken(stored: string): string {
  const [ivHex, tagHex, ctHex] = (stored || "").split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("Malformed encrypted token");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]);
  return pt.toString("utf8");
}

// Generate a fresh key (run once locally): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
