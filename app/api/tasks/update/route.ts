// app/api/tasks/update/route.ts
// Service-role task update so manager/creator status changes aren't silently
// dropped by RLS. POST { id, patch }
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// only allow known task columns to be written
const ALLOWED = new Set([
  "status", "started_at", "submitted_at", "submitted_by", "verified_at", "verified_by",
  "reopen_count", "tat_hours", "assigned_at", "due_at", "last_reopened_at", "updated_at",
  "assignee_id", "title", "description", "checklist", "priority", "position",
]);

export async function POST(request: Request) {
  try {
    const { id, patch } = await request.json();
    if (!id || !patch || typeof patch !== "object") {
      return NextResponse.json({ error: "id and patch are required" }, { status: 400 });
    }
    const clean: Record<string, unknown> = {};
    for (const k of Object.keys(patch)) if (ALLOWED.has(k)) clean[k] = patch[k];
    if (Object.keys(clean).length === 0) {
      return NextResponse.json({ error: "no writable fields" }, { status: 400 });
    }
    const { error } = await supabase.from("tasks").update(clean).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[task-update]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
