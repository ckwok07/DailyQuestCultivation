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
    .select("task_id, date, notes, metadata")
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
      notes: row.notes ?? undefined,
      metadata: row.metadata ?? undefined,
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

  let body: {
    taskId: string;
    date: string;
    pointValue: number;
    notes?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { taskId, date, pointValue, notes, metadata } = body;
  if (typeof taskId !== "string" || !taskId || typeof date !== "string" || !date) {
    return NextResponse.json({ error: "taskId and date required" }, { status: 400 });
  }
  const pointsToAdd = typeof pointValue === "number" && pointValue >= 0 ? pointValue : 0;

  const insertRow: {
    user_id: string;
    task_id: string;
    date: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  } = { user_id: user.id, task_id: taskId, date };
  if (typeof notes === "string") insertRow.notes = notes;
  if (metadata && typeof metadata === "object") insertRow.metadata = metadata;

  // Insert completion (unique on user_id, task_id, date prevents double-credit)
  const { error: insertError } = await supabase.from("task_completions").insert(insertRow);

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Already completed for this date" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  let newPoints: number | undefined;
  if (pointsToAdd > 0) {
    const { data: stateRow, error: fetchError } = await supabase
      .from("user_state")
      .select("points")
      .eq("user_id", user.id)
      .single();

    const currentPoints = !fetchError && stateRow != null ? (stateRow.points ?? 0) : 0;
    newPoints = currentPoints + pointsToAdd;

    if (fetchError && (fetchError as { code?: string }).code === "PGRST116") {
      // No row: create user_state so points persist (e.g. user created before trigger)
      await supabase.from("user_state").insert({
        user_id: user.id,
        points: newPoints,
        streak_count: 0,
        has_completed_onboarding: false,
      });
    } else if (!fetchError) {
      await supabase
        .from("user_state")
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true, points: newPoints });
}

/** DELETE: clear all task completions for the given date (for "new day" test). */
export async function DELETE(request: Request) {
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

  const { error } = await supabase
    .from("task_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
