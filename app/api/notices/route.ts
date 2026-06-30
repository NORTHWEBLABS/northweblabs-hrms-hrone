import { NextResponse } from "next/server";
import { adminClient } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  let maintenance = { enabled: false, message: "" };
  let announcements: any[] = [];
  try {
    const sb = adminClient();
    try {
      const { data } = await sb.from("app_settings").select("value").eq("key", "maintenance").maybeSingle();
      if (data?.value) maintenance = data.value as any;
    } catch {}
    try {
      const { data } = await sb.from("announcements").select("id, title, body, level, audience").eq("active", true).order("created_at", { ascending: false });
      announcements = data || [];
    } catch {}
  } catch {}
  return NextResponse.json({ maintenance, announcements });
}
