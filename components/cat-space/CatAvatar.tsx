"use client";

const WALKING_URL = "/resources/walking.gif";
const IDLE_URL = "/resources/cat_idle.gif";

type CatAvatarProps = {
  /** Screen offset from center (px) — floor position projected to 2D */
  screenX?: number;
  screenY?: number;
  /** Scale for perspective (larger near front, smaller at back) */
  scale?: number;
  /** Whether the cat is walking or idle (not moving) */
  isWalking?: boolean;
  /** When false, flip horizontally so cat faces left (direction of movement) */
  faceRight?: boolean;
};

/** Cat rendered as flat 2D overlay — walking.gif when moving, cat_idle.gif when idle. Faces movement direction. */
export function CatAvatar({
  screenX = 0,
  screenY = 0,
  scale = 1,
  isWalking = true,
  faceRight = true,
}: CatAvatarProps) {
  const src = isWalking ? WALKING_URL : IDLE_URL;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 48,
        height: 48,
        transform: `translate(calc(-50% + ${screenX}px), calc(-50% + ${screenY}px))`,
        transformOrigin: "center bottom",
        transition: "transform 0.4s ease-out",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${faceRight ? scale : -scale}, ${scale})`,
          transformOrigin: "center bottom",
        }}
      >
        <img
          src={src}
          alt="Cat"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}