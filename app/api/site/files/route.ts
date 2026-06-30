import { NextRequest, NextResponse } from "next/server";
import { adminClient, getSuper } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUCKET = "sections";
const isMissingBucket = (msg: string) => /bucket not found|not found|does not exist/i.test(msg || "");

export async function GET(req: NextRequest) {
  if (!(await getSuper(req))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const sb = adminClient();
  const name = req.nextUrl.searchParams.get("name");
  try {
    if (name) {
      const { data, error } = await sb.storage.from(BUCKET).download(name);
      if (error) throw error;
      const content = await data.text();
      return NextResponse.json({ name, content });
    }
    const { data, error } = await sb.storage.from(BUCKET).list("", { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    const files = (data || []).filter((f: any) => f.name && !f.name.startsWith(".")).map((f: any) => f.name);
    return NextResponse.json({ files });
  } catch (e: any) {
    const msg = e?.message || "Failed";
    return NextResponse.json({ error: msg, needsBucket: isMissingBucket(msg) }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await getSuper(req))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const sb = adminClient();
  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Missing file name" }, { status: 400 });
  const content = String(body?.content ?? "");
  try {
    const { error } = await sb.storage.from(BUCKET).upload(name, new Blob([content], { type: "text/plain" }), { upsert: true, contentType: "text/plain; charset=utf-8" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Save failed";
    return NextResponse.json({ error: msg, needsBucket: isMissingBucket(msg) }, { status: 200 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await getSuper(req))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const sb = adminClient();
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing file name" }, { status: 400 });
  try {
    const { error } = await sb.storage.from(BUCKET).remove([name]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
