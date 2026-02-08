import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("user_state")
    .select("points, streak_count, has_completed_onboarding, equipped_cosmetics")
    .eq("user_id", user.id)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({
        points: 0,
        streakCount: 0,
        hasCompletedOnboarding: false,
        equippedCosmeticIds: [],
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const equippedCosmeticIds = Array.isArray(data.equipped_cosmetics) ? data.equipped_cosmetics : [];

  // Keep today's snapshot up to date when user loads app
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("day_snapshots").upsert(
    {
      user_id: user.id,
      date: today,
      points_snapshot: data.points ?? 0,
      streak_snapshot: data.streak_count ?? 0,
    },
    { onConflict: "user_id,date" }
  );

  return NextResponse.json({
    points: data.points ?? 0,
    streakCount: data.streak_count ?? 0,
    hasCompletedOnboarding: data.has_completed_onboarding ?? false,
    equippedCosmeticIds,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { points?: number; streakCount?: number; hasCompletedOnboarding?: boolean; equippedCosmeticIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const updates: {
    points?: number;
    streak_count?: number;
    has_completed_onboarding?: boolean;
    equipped_cosmetics?: string[];
    updated_at?: string;
  } = { updated_at: new Date().toISOString() };
  if (typeof body.points === "number") updates.points = body.points;
  if (typeof body.streakCount === "number") updates.streak_count = body.streakCount;
  if (typeof body.hasCompletedOnboarding === "boolean")
    updates.has_completed_onboarding = body.hasCompletedOnboarding;
  if (Array.isArray(body.equippedCosmeticIds))
    updates.equipped_cosmetics = body.equippedCosmeticIds.filter((id) => typeof id === "string");

  const { data: updated, error: updateError } = await supabase
    .from("user_state")
    .update(updates)
    .eq("user_id", user.id)
    .select("points, streak_count");
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  // If no row existed, create one so points deduction persists (e.g. first purchase)
  if (Array.isArray(updated) && updated.length === 0 && (updates.points !== undefined || Object.keys(updates).length > 1)) {
    const { error: insertError } = await supabase.from("user_state").upsert(
      {
        user_id: user.id,
        points: typeof updates.points === "number" ? updates.points : 0,
        streak_count: updates.streak_count ?? 0,
        has_completed_onboarding: updates.has_completed_onboarding ?? false,
        equipped_cosmetics: updates.equipped_cosmetics ?? [],
        updated_at: updates.updated_at ?? new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Save day snapshot for history (today's points and streak)
  const today = new Date().toISOString().slice(0, 10);
  const { data: stateRow } = await supabase.from("user_state").select("points, streak_count").eq("user_id", user.id).single();
  if (stateRow) {
    await supabase.from("day_snapshots").upsert(
      { user_id: user.id, date: today, points_snapshot: stateRow.points ?? 0, streak_snapshot: stateRow.streak_count ?? 0 },
      { onConflict: "user_id,date" }
    );
  }

  return NextResponse.json({ ok: true });
}
