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
    .from("owned_items")
    .select("item_id")
    .eq("user_id", user.id)
    .order("purchased_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const itemIds = (data ?? []).map((row) => row.item_id);
  return NextResponse.json(itemIds);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { itemId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const itemId = body.itemId;
  if (typeof itemId !== "string" || !itemId.trim()) {
    return NextResponse.json(
      { error: "itemId is required" },
      { status: 400 }
    );
  }
  const { error: insertError } = await supabase.from("owned_items").insert({
    user_id: user.id,
    item_id: itemId.trim(),
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  const { data: list, error: selectError } = await supabase
    .from("owned_items")
    .select("item_id")
    .eq("user_id", user.id)
    .order("purchased_at", { ascending: true });
  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }
  return NextResponse.json(
    (list ?? []).map((row) => row.item_id),
    { status: 201 }
  );
}
