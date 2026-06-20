// Route: app/api/shopify/daily-pull/route.ts
// Server-only. Token now comes from the ENCRYPTED DB store (shopify_credentials),
// loaded + decrypted via lib/shopify-token. On a Shopify auth failure (401 /
// "invalid api key"), the pull surfaces a clear, actionable error telling you to
// re-run the OAuth connect — instead of silently writing zeros.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadToken, markVerified } from "@/lib/shopify-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_KC_DOMAIN!;
const API_VERSION = "2026-04";
const IST = "+05:30";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const norm = (t: string) => t.toLowerCase().replace(/[\s_-]/g, "");

const CHANNEL_TAG: Record<string, "walkin" | "whatsapp"> = {
  storewalkin: "walkin",
  whatsapp: "whatsapp",
};

const PAY_TAG: Record<string, string> = {
  cashpayment: "Cash",
  cashdeposit: "Cash deposit",
  cardpayment: "Card",
  upi: "UPI",
  banktransfer: "Bank transfer",
  paymentlink: "Payment link",
  payementlink: "Payment link",
};

const PENDING_STATUSES = new Set(["PENDING", "PARTIALLY_PAID", "AUTHORIZED"]);
const gidToNum = (gid: string) => Number(gid.split("/").pop());
const round2 = (n: number) => Math.round(n * 100) / 100;

// Auth-class error raised when Shopify rejects the token, so the route can
// return a clean "reconnect" message instead of a generic 500.
class ShopifyAuthError extends Error {}

function makeGraphQL(token: string) {
  return async function shopifyGraphQL(query: string, variables: any) {
    const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401 || res.status === 403) {
      throw new ShopifyAuthError("Shopify rejected the access token (auth). Reconnect required.");
    }
    const json = await res.json();
    if (json.errors) {
      const s = JSON.stringify(json.errors);
      // GraphQL-level auth message also routes to reconnect path
      if (/invalid api key|access token|unrecognized login/i.test(s)) {
        throw new ShopifyAuthError("Shopify GraphQL auth error: " + s);
      }
      throw new Error("Shopify GraphQL: " + s);
    }
    return json.data;
  };
}

const ORDERS_QUERY = `
query Orders($q: String!, $cursor: String) {
  orders(first: 100, query: $q, after: $cursor, sortKey: CREATED_AT) {
    edges { node { id name createdAt displayFinancialStatus totalPriceSet { shopMoney { amount } } app { name } paymentGatewayNames tags } }
    pageInfo { hasNextPage endCursor }
  }
}`;

const NODES_QUERY = `
query Nodes($ids: [ID!]!) { nodes(ids: $ids) { ... on Order { id displayFinancialStatus } } }`;

export async function POST(req: Request) {
  try {
    if (!SHOPIFY_DOMAIN) {
      return NextResponse.json({ ok: false, error: "SHOPIFY_KC_DOMAIN not set" }, { status: 500 });
    }

    const { orgId, date } = await req.json();
    if (!orgId || !date) {
      return NextResponse.json({ ok: false, error: "orgId and date required" }, { status: 400 });
    }

    // ── Load + decrypt the token for this org/store ──
    const cred = await loadToken(orgId, SHOPIFY_DOMAIN);
    if (!cred) {
      return NextResponse.json({
        ok: false,
        error: "no_token",
        message: "Shopify isn't connected for this store yet. Connect it once, then pull.",
        connectUrl: `/api/shopify/oauth/start?orgId=${orgId}`,
      }, { status: 409 });
    }
    const shopifyGraphQL = makeGraphQL(cred.token);

    // ── Go-live guard ──
    let { data: state } = await sb.from("shopify_sync_state").select("*").eq("org_id", orgId).maybeSingle();
    if (!state) {
      const { data: created } = await sb.from("shopify_sync_state").insert({ org_id: orgId, go_live_date: date }).select().maybeSingle();
      state = created;
    }
    if (state?.go_live_date && date < state.go_live_date) {
      return NextResponse.json({ ok: true, skipped: true, reason: `Before go-live date (${state.go_live_date})` });
    }

    // ── 1) Pull the day's orders (IST calendar day) ──
    const q = `created_at:>='${date}T00:00:00${IST}' created_at:<='${date}T23:59:59${IST}'`;
    let cursor: string | null = null;
    const orders: any[] = [];
    for (let i = 0; i < 25; i++) {
      const data: any = await shopifyGraphQL(ORDERS_QUERY, { q, cursor });
      const conn = data.orders;
      for (const e of conn.edges) orders.push(e.node);
      if (!conn.pageInfo.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }

    // token worked — stamp last_verified
    await markVerified(orgId, SHOPIFY_DOMAIN);

    // ── 2) Aggregate ──
    const online = { orders: 0, sales: 0 };
    const offline = { orders: 0, sales: 0 };
    const offline_sub: Record<string, { orders: number; sales: number }> = {
      walkin: { orders: 0, sales: 0 },
      whatsapp: { orders: 0, sales: 0 },
      untagged_channel: { orders: 0, sales: 0 },
    };
    const payments_online: Record<string, { orders: number; amount: number }> = {};
    const payments_offline: Record<string, { orders: number; amount: number }> = {};
    const untagged_payment_orders: string[] = [];

    const todayPaidIds: number[] = [];
    const pendingRows: any[] = [];
    const nowIso = new Date().toISOString();

    for (const o of orders) {
      const amount = Number(o.totalPriceSet?.shopMoney?.amount || 0);
      const tagsNorm: string[] = (o.tags || []).map(norm);
      const appName = (o.app?.name || "").toLowerCase();
      const isOffline = appName.includes("draft") || tagsNorm.some((t) => t in CHANNEL_TAG);
      const numId = gidToNum(o.id);
      const status = o.displayFinancialStatus || "";

      if (isOffline) {
        offline.orders++; offline.sales += amount;
        const ch = (tagsNorm.map((t) => CHANNEL_TAG[t]).find(Boolean) as "walkin" | "whatsapp") || "untagged_channel";
        offline_sub[ch].orders++; offline_sub[ch].sales += amount;
        const payTag = tagsNorm.map((t) => PAY_TAG[t]).find(Boolean);
        const label = payTag || "Untagged";
        if (!payTag) untagged_payment_orders.push(o.name);
        (payments_offline[label] ||= { orders: 0, amount: 0 });
        payments_offline[label].orders++; payments_offline[label].amount += amount;
      } else {
        online.orders++; online.sales += amount;
        const gw = (o.paymentGatewayNames && o.paymentGatewayNames[0]) || "Online gateway";
        (payments_online[gw] ||= { orders: 0, amount: 0 });
        payments_online[gw].orders++; payments_online[gw].amount += amount;
      }

      if (PENDING_STATUSES.has(status)) {
        pendingRows.push({
          shopify_order_id: numId, org_id: orgId, order_name: o.name, customer_name: null,
          channel: isOffline ? "offline" : "online", total: amount, order_created_at: o.createdAt,
          financial_status: status, resolved: false, last_checked_at: nowIso,
        });
      } else {
        todayPaidIds.push(numId);
      }
    }

    online.sales = round2(online.sales);
    offline.sales = round2(offline.sales);
    for (const k in offline_sub) offline_sub[k].sales = round2(offline_sub[k].sales);
    for (const k in payments_online) payments_online[k].amount = round2(payments_online[k].amount);
    for (const k in payments_offline) payments_offline[k].amount = round2(payments_offline[k].amount);

    const breakdown = { online, offline, offline_sub, payments_online, payments_offline, untagged_payment_orders };

    const onlineMatch = (re: RegExp) =>
      Object.entries(payments_online).filter(([k]) => re.test(k.toLowerCase())).reduce((s, [, v]) => s + (v.amount || 0), 0);
    const payCashCol = round2((payments_offline["Cash"]?.amount || 0) + (payments_offline["Cash deposit"]?.amount || 0) + onlineMatch(/cash|cod/));
    const payUpiCol = round2((payments_offline["UPI"]?.amount || 0) + onlineMatch(/upi/));
    const payCardCol = round2((payments_offline["Card"]?.amount || 0) + onlineMatch(/card/));
    const allPay = [...Object.values(payments_online), ...Object.values(payments_offline)].reduce((s, v) => s + (v.amount || 0), 0);
    const payGatewayCol = Math.max(0, round2(allPay - payCashCol - payUpiCol - payCardCol));
    const walkinAmt = round2(offline_sub.walkin.sales + offline_sub.untagged_channel.sales);
    const walkinOrd = offline_sub.walkin.orders + offline_sub.untagged_channel.orders;

    const registerCols = {
      shopify_breakdown: breakdown, shopify_pulled_at: nowIso,
      total_sales: round2(online.sales + offline.sales), total_orders: online.orders + offline.orders,
      walkin_amount: walkinAmt, walkin_orders: walkinOrd,
      online_amount: round2(online.sales), online_orders: online.orders,
      whatsapp_amount: round2(offline_sub.whatsapp.sales), whatsapp_orders: offline_sub.whatsapp.orders,
      pay_cash: payCashCol, pay_upi: payUpiCol, pay_card: payCardCol, pay_gateway: payGatewayCol,
      updated_at: nowIso,
    };

    const { data: reg } = await sb.from("cash_register").select("id").eq("org_id", orgId).eq("date", date).maybeSingle();
    if (reg) await sb.from("cash_register").update(registerCols).eq("id", reg.id);
    else await sb.from("cash_register").insert({ org_id: orgId, date, ...registerCols });

    let pendingUpserted = 0;
    if (pendingRows.length) {
      const { error } = await sb.from("shopify_pending_orders").upsert(pendingRows, { onConflict: "shopify_order_id" });
      if (!error) pendingUpserted = pendingRows.length;
    }
    if (todayPaidIds.length) {
      await sb.from("shopify_pending_orders")
        .update({ resolved: true, resolved_at: nowIso, last_checked_at: nowIso })
        .eq("org_id", orgId).eq("resolved", false).in("shopify_order_id", todayPaidIds);
    }

    let pendingResolved = 0;
    const { data: open } = await sb.from("shopify_pending_orders")
      .select("shopify_order_id").eq("org_id", orgId).eq("resolved", false).limit(100);
    const todaySet = new Set(pendingRows.map((p) => p.shopify_order_id));
    const recheckIds = (open || []).map((r) => Number(r.shopify_order_id)).filter((id) => !todaySet.has(id));
    if (recheckIds.length) {
      const gids = recheckIds.map((id) => `gid://shopify/Order/${id}`);
      const data: any = await shopifyGraphQL(NODES_QUERY, { ids: gids });
      const nowPaid: number[] = [];
      for (const n of data.nodes || []) {
        if (n && !PENDING_STATUSES.has(n.displayFinancialStatus)) nowPaid.push(gidToNum(n.id));
      }
      if (nowPaid.length) {
        await sb.from("shopify_pending_orders")
          .update({ resolved: true, resolved_at: nowIso, last_checked_at: nowIso })
          .eq("org_id", orgId).in("shopify_order_id", nowPaid);
        pendingResolved = nowPaid.length;
      }
    }

    await sb.from("shopify_sync_state")
      .update({ last_pull_date: date, last_pull_at: nowIso, updated_at: nowIso }).eq("org_id", orgId);

    return NextResponse.json({
      ok: true, date, breakdown,
      counts: { orders: orders.length, pending_upserted: pendingUpserted, pending_resolved: pendingResolved },
    });
  } catch (err: any) {
    // Auth failures get a distinct, actionable response so the UI can prompt a reconnect.
    if (err instanceof ShopifyAuthError) {
      const body = await req.clone().json().catch(() => ({}));
      const orgId = (body as any)?.orgId || "";
      return NextResponse.json({
        ok: false,
        error: "auth",
        message: "Shopify token is no longer valid. Reconnect the store (one click) and pull again.",
        connectUrl: orgId ? `/api/shopify/oauth/start?orgId=${orgId}` : "/api/shopify/oauth/start",
      }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message || "pull failed" }, { status: 500 });
  }
}
