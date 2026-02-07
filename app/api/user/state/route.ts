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
    .select("points, streak_count, has_completed_onboarding")
    .eq("user_id", user.id)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({
        points: 0,
        streakCount: 0,
        hasCompletedOnboarding: false,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    points: data.points ?? 0,
    streakCount: data.streak_count ?? 0,
    hasCompletedOnboarding: data.has_completed_onboarding ?? false,
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
  let body: { points?: number; streakCount?: number; hasCompletedOnboarding?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const updates: {
    points?: number;
    streak_count?: number;
    has_completed_onboarding?: boolean;
    updated_at?: string;
  } = { updated_at: new Date().toISOString() };
  if (typeof body.points === "number") updates.points = body.points;
  if (typeof body.streakCount === "number") updates.streak_count = body.streakCount;
  if (typeof body.hasCompletedOnboarding === "boolean")
    updates.has_completed_onboarding = body.hasCompletedOnboarding;

  const { error } = await supabase
    .from("user_state")
    .update(updates)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
