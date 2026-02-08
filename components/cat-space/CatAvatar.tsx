"use client";

import { useEffect, useState } from "react";

const WALKING_URL = "/resources/walking.gif";
const STATIC_URL = "/resources/cat-static.png";

type CatAvatarProps = {
  /** Screen offset from center (px) — floor position projected to 2D */
  screenX?: number;
  screenY?: number;
  /** Scale for perspective (larger near front, smaller at back) */
  scale?: number;
  /** Whether the cat is walking or idle (not moving) */
  isWalking?: boolean;
};

/** Cat rendered as flat 2D overlay (no skew) — positioned over floor. */
export function CatAvatar({
  screenX = 0,
  screenY = 0,
  scale = 1,
  isWalking = true,
}: CatAvatarProps) {
  const intendedSrc = isWalking ? WALKING_URL : STATIC_URL;
  const [fallbackUsed, setFallbackUsed] = useState(false);

  useEffect(() => {
    if (isWalking) setFallbackUsed(false);
  }, [isWalking]);

  const handleError = () => {
    setFallbackUsed(true);
  };

  const src = fallbackUsed ? STATIC_URL : intendedSrc;

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
        key={src}
        src={src}
        alt="Cat"
        onError={handleError}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}