// Route: app/api/shopify/daily-pull/route.ts
// Server-only. Reads SHOPIFY_KC_TOKEN / SHOPIFY_KC_DOMAIN from env (never exposed to client).
// Pulls one day's orders, splits online (Online Store) vs offline (Draft Orders),
// online payment from the gateway / offline from the normalized tag, writes the
// breakdown JSON onto cash_register, and upserts/clears the pending-payment watchlist.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_KC_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_KC_TOKEN!;
const API_VERSION = "2026-04";
const IST = "+05:30"; // Krazy Caterpillar — register day is the IST calendar day

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ── Tag normalisation: lowercase + strip _ - and spaces, so Bank_Transfer,
//    "bank transfer", Payement_link (typo) all match regardless of how staff type them.
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
  payementlink: "Payment link", // typo seen in real data
};

const PENDING_STATUSES = new Set(["PENDING", "PARTIALLY_PAID", "AUTHORIZED"]);

const gidToNum = (gid: string) => Number(gid.split("/").pop());
const round2 = (n: number) => Math.round(n * 100) / 100;

async function shopifyGraphQL(query: string, variables: any) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": SHOPIFY_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("Shopify GraphQL: " + JSON.stringify(json.errors));
  return json.data;
}

const ORDERS_QUERY = `
query Orders($q: String!, $cursor: String) {
  orders(first: 100, query: $q, after: $cursor, sortKey: CREATED_AT) {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        totalPriceSet { shopMoney { amount } }
        app { name }
        paymentGatewayNames
        tags
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const NODES_QUERY = `
query Nodes($ids: [ID!]!) {
  nodes(ids: $ids) { ... on Order { id displayFinancialStatus } }
}`;

export async function POST(req: Request) {
  try {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
      return NextResponse.json({ ok: false, error: "Shopify env vars not set" }, { status: 500 });
    }

    const { orgId, date } = await req.json();
    if (!orgId || !date) {
      return NextResponse.json({ ok: false, error: "orgId and date required" }, { status: 400 });
    }

    // ── Go-live guard. First run sets go_live_date = first pulled date; never pull before it.
    let { data: state } = await sb.from("shopify_sync_state").select("*").eq("org_id", orgId).maybeSingle();
    if (!state) {
      const { data: created } = await sb
        .from("shopify_sync_state")
        .insert({ org_id: orgId, go_live_date: date })
        .select()
        .maybeSingle();
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
        offline.orders++;
        offline.sales += amount;
        const ch = (tagsNorm.map((t) => CHANNEL_TAG[t]).find(Boolean) as "walkin" | "whatsapp") || "untagged_channel";
        offline_sub[ch].orders++;
        offline_sub[ch].sales += amount;
        const payTag = tagsNorm.map((t) => PAY_TAG[t]).find(Boolean);
        const label = payTag || "Untagged";
        if (!payTag) untagged_payment_orders.push(o.name);
        (payments_offline[label] ||= { orders: 0, amount: 0 });
        payments_offline[label].orders++;
        payments_offline[label].amount += amount;
      } else {
        online.orders++;
        online.sales += amount;
        const gw = (o.paymentGatewayNames && o.paymentGatewayNames[0]) || "Online gateway";
        (payments_online[gw] ||= { orders: 0, amount: 0 });
        payments_online[gw].orders++;
        payments_online[gw].amount += amount;
      }

      if (PENDING_STATUSES.has(status)) {
        pendingRows.push({
          shopify_order_id: numId,
          org_id: orgId,
          order_name: o.name,
          customer_name: null,
          channel: isOffline ? "offline" : "online",
          total: amount,
          order_created_at: o.createdAt,
          financial_status: status,
          resolved: false,
          last_checked_at: nowIso,
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

    // ── 3) Write breakdown onto the day's register row (upsert by org+date) ──
    const { data: reg } = await sb.from("cash_register").select("id").eq("org_id", orgId).eq("date", date).maybeSingle();
    if (reg) {
      await sb.from("cash_register").update({ shopify_breakdown: breakdown, shopify_pulled_at: nowIso }).eq("id", reg.id);
    } else {
      await sb.from("cash_register").insert({ org_id: orgId, date, shopify_breakdown: breakdown, shopify_pulled_at: nowIso });
    }

    // ── 4) Pending watchlist: upsert today's pendings, resolve today's paid ──
    let pendingUpserted = 0;
    if (pendingRows.length) {
      const { error } = await sb.from("shopify_pending_orders").upsert(pendingRows, { onConflict: "shopify_order_id" });
      if (!error) pendingUpserted = pendingRows.length;
    }
    if (todayPaidIds.length) {
      await sb
        .from("shopify_pending_orders")
        .update({ resolved: true, resolved_at: nowIso, last_checked_at: nowIso })
        .eq("org_id", orgId)
        .eq("resolved", false)
        .in("shopify_order_id", todayPaidIds);
    }

    // ── 5) Re-check older still-open pendings → resolve any now paid in Shopify ──
    let pendingResolved = 0;
    const { data: open } = await sb
      .from("shopify_pending_orders")
      .select("shopify_order_id")
      .eq("org_id", orgId)
      .eq("resolved", false)
      .limit(100);
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
        await sb
          .from("shopify_pending_orders")
          .update({ resolved: true, resolved_at: nowIso, last_checked_at: nowIso })
          .eq("org_id", orgId)
          .in("shopify_order_id", nowPaid);
        pendingResolved = nowPaid.length;
      }
    }

    // ── 6) Mark sync state ──
    await sb
      .from("shopify_sync_state")
      .update({ last_pull_date: date, last_pull_at: nowIso, updated_at: nowIso })
      .eq("org_id", orgId);

    return NextResponse.json({
      ok: true,
      date,
      breakdown,
      counts: { orders: orders.length, pending_upserted: pendingUpserted, pending_resolved: pendingResolved },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "pull failed" }, { status: 500 });
  }
}