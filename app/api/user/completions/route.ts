import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: "Missing date query" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("task_completions")
    .select("task_id, date")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("completed_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    completions: (data ?? []).map((row) => ({
      taskId: row.task_id,
      date: row.date,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { taskId: string; date: string; pointValue: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { taskId, date, pointValue } = body;
  if (typeof taskId !== "string" || !taskId || typeof date !== "string" || !date) {
    return NextResponse.json({ error: "taskId and date required" }, { status: 400 });
  }
  const pointsToAdd = typeof pointValue === "number" && pointValue >= 0 ? pointValue : 0;

  // Insert completion (unique on user_id, task_id, date prevents double-credit)
  const { error: insertError } = await supabase.from("task_completions").insert({
    user_id: user.id,
    task_id: taskId,
    date,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Already completed for this date" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (pointsToAdd > 0) {
    const { data: stateRow, error: fetchError } = await supabase
      .from("user_state")
      .select("points")
      .eq("user_id", user.id)
      .single();

    if (!fetchError && stateRow != null) {
      const newPoints = (stateRow.points ?? 0) + pointsToAdd;
      await supabase
        .from("user_state")
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
