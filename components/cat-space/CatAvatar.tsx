"use client";

/** Cat rendered as flat 2D overlay (no isometric transform) — centered in the room. */
export function CatAvatar() {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 64,
        height: 64,
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <img
        src="/resources/cat-static.png"
        alt="Cat"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
