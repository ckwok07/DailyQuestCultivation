"use client";

const WALKING_URL = "/resources/walking.gif";
const IDLE_URL = "/resources/cat_idle.gif";

type CatAvatarProps = {
  screenX?: number;
  screenY?: number;
  scale?: number;
  isWalking?: boolean;
  faceRight?: boolean;
  /** Cosmetic ids to show on the cat (e.g. wizard_hat, red_bow) */
  equippedCosmeticIds?: string[];
};

/** Cat with optional cosmetics overlay (wizard hat, red bow). */
export function CatAvatar({
  screenX = 0,
  screenY = 0,
  scale = 1,
  isWalking = true,
  faceRight = true,
  equippedCosmeticIds = [],
}: CatAvatarProps) {
  const src = isWalking ? WALKING_URL : IDLE_URL;
  const hasWizardHat = equippedCosmeticIds.includes("wizard_hat");
  const hasRedBow = equippedCosmeticIds.includes("red_bow");

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
          position: "relative",
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
        {hasWizardHat && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 2,
              transform: "translateX(-50%)",
              width: 28,
              height: 18,
              pointerEvents: "none",
            }}
          >
            <svg viewBox="0 0 28 18" fill="none" style={{ width: "100%", height: "100%" }}>
              <path d="M14 2 L2 14 L26 14 Z" fill="#3d2c5c" stroke="#2d1f45" strokeWidth="0.8" strokeLinejoin="round" />
              <ellipse cx="14" cy="12" rx="10" ry="2.5" fill="#4a3568" stroke="#2d1f45" strokeWidth="0.5" />
              <path d="M14 2 L14 0" stroke="#c9a227" strokeWidth="1" strokeLinecap="round" />
              <circle cx="14" cy="0" r="1.5" fill="#c9a227" />
            </svg>
          </div>
        )}
        {hasRedBow && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 22,
              transform: "translateX(-50%)",
              width: 20,
              height: 12,
              pointerEvents: "none",
            }}
          >
            <svg viewBox="0 0 20 12" fill="none" style={{ width: "100%", height: "100%" }}>
              <ellipse cx="7" cy="6" rx="5" ry="3.5" fill="#c41e3a" stroke="#8b0000" strokeWidth="0.8" />
              <ellipse cx="13" cy="6" rx="5" ry="3.5" fill="#c41e3a" stroke="#8b0000" strokeWidth="0.8" />
              <circle cx="10" cy="6" r="2" fill="#8b0000" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}