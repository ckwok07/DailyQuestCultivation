import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getPromptForDate } from "@/lib/prompts";
import {
  DAILY_PROMPT_TASK_ID,
  NEW_SONG_TASK_ID,
  DOCUMENT_TASK_ID,
} from "@/lib/tasks";

const SIGNED_URL_EXPIRY_SEC = 3600;
const BUCKET = "document-photos";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYY-MM-DD or empty for list of dates

  if (!date) {
    // Return list of dates that have completions or snapshots (for calendar highlights)
    const [compRes, snapRes] = await Promise.all([
      supabase.from("task_completions").select("date").eq("user_id", user.id),
      supabase.from("day_snapshots").select("date").eq("user_id", user.id),
    ]);
    const dates = new Set<string>();
    (compRes.data ?? []).forEach((r) => dates.add(r.date));
    (snapRes.data ?? []).forEach((r) => dates.add(r.date));
    return NextResponse.json({
      dates: Array.from(dates).sort(),
    });
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const [completionsRes, snapshotRes] = await Promise.all([
    supabase
      .from("task_completions")
      .select("task_id, date, notes, metadata")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("completed_at", { ascending: true }),
    supabase
      .from("day_snapshots")
      .select("points_snapshot, streak_snapshot")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle(),
  ]);

  if (completionsRes.error) {
    return NextResponse.json({ error: completionsRes.error.message }, { status: 500 });
  }
  if (snapshotRes.error) {
    return NextResponse.json({ error: snapshotRes.error.message }, { status: 500 });
  }

  const completions = (completionsRes.data ?? []).map((row) => ({
    taskId: row.task_id,
    date: row.date,
    notes: row.notes ?? undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
  }));

  const snapshot = snapshotRes.data;
  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dailyPromptText = getPromptForDate(dateObj);

  const completedIds = new Set(completions.map((c) => c.taskId));
  const allTaskIds = [DAILY_PROMPT_TASK_ID, NEW_SONG_TASK_ID, DOCUMENT_TASK_ID];
  const completed = allTaskIds.filter((id) => completedIds.has(id));
  const remaining = allTaskIds.filter((id) => !completedIds.has(id));

  let documentPhotoUrl: string | null = null;
  const docCompletion = completions.find((c) => c.taskId === DOCUMENT_TASK_ID);
  const photoPath = docCompletion?.metadata?.photoPath as string | undefined;
  if (photoPath && typeof photoPath === "string" && photoPath.startsWith(user.id + "/")) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(photoPath, SIGNED_URL_EXPIRY_SEC);
    if (signed?.signedUrl) documentPhotoUrl = signed.signedUrl;
  }

  return NextResponse.json({
    date,
    dailyPromptText,
    completed,
    remaining,
    completions,
    pointsSnapshot: snapshot?.points_snapshot ?? null,
    streakSnapshot: snapshot?.streak_snapshot ?? null,
    documentPhotoUrl,
  });
}
