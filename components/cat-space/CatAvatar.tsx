"use client";

type CatAvatarProps = {
  /** Screen offset from center (px) — floor position projected to 2D */
  screenX?: number;
  screenY?: number;
  /** Scale for perspective (larger near front, smaller at back) */
  scale?: number;
  /** Whether the cat is walking or idle */
  isWalking?: boolean;
};

/** Cat rendered as flat 2D overlay (no skew) — positioned over floor. */
export function CatAvatar({
  screenX = 0,
  screenY = 0,
  scale = 1,
  isWalking = true,
}: CatAvatarProps) {
  // Choose sprite based on walking state
  const spriteUrl = isWalking 
    ? "/resources/cat-static.png"  // walking sprite
    : "/resources/idle.png";        // idle animation (can be .png, .gif, or .apng)
  
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 48,
        height: 48,
        transform: `translate(calc(-50% + ${screenX}px), calc(-50% + ${screenY}px)) scale(${scale})`,
        transformOrigin: "center bottom",
        transition: "transform 0.4s ease-out",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <img
        src={spriteUrl}
        alt="Cat"
        style={{ 
          width: "100%", 
          height: "100%", 
          objectFit: "contain",
          imageRendering: "pixelated", // For crisp pixel art
        }}
      />
    </div>
  );
}