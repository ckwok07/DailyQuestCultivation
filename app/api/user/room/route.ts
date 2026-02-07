import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { RoomLayoutItem } from "@/types/user";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("room_layout")
    .select("item_id, position_x, position_y, wall_anchor_id, rotation, layer")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const roomLayout: RoomLayoutItem[] = (data ?? []).map((row) => ({
    itemId: row.item_id,
    position:
      row.wall_anchor_id != null
        ? { wallAnchorId: row.wall_anchor_id }
        : { x: row.position_x ?? 0, y: row.position_y ?? 0 },
    rotation: (row.rotation as 0 | 90 | 180 | 270) ?? 0,
    layer: row.layer as "floor" | "wall",
  }));
  return NextResponse.json(roomLayout);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: RoomLayoutItem[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("room_layout")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (body.length === 0) {
    return NextResponse.json([]);
  }

  const rows = body.map((item, i) => {
    const pos = item.position;
    const hasWall = "wallAnchorId" in pos;
    return {
      user_id: user.id,
      item_id: item.itemId,
      position_x: hasWall ? null : pos.x,
      position_y: hasWall ? null : pos.y,
      wall_anchor_id: hasWall ? pos.wallAnchorId : null,
      rotation: item.rotation,
      layer: item.layer,
      sort_order: i,
    };
  });

  const { error: insertError } = await supabase.from("room_layout").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json(body);
}
