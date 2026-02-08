"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";

type ShopPanelProps = {
  onClose?: () => void;
};

type ShopTab = "furniture" | "cosmetics";

type ShopItemDef = {
  id: string;
  name: string;
  price: number;
  category: ShopTab;
};

const FURNITURE_ITEMS: ShopItemDef[] = [
  { id: "cat-portrait", name: "Cat portrait", price: 50, category: "furniture" },
  { id: "couch", name: "Couch", price: 80, category: "furniture" },
  { id: "poster", name: "Poster", price: 40, category: "furniture" },
];
const COSMETIC_ITEMS: ShopItemDef[] = [
  { id: "angel-wings", name: "Angel wings", price: 75, category: "cosmetics" },
];

/** Furniture icon: framed cat portrait */
function CatPortraitIcon() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 8,
        padding: 5,
        background: "linear-gradient(180deg, #e2ddd4 0%, #d4cfc6 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 1px 0 2px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 4,
          overflow: "hidden",
          background: "#ebe7e0",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        <img
          src="/resources/cat-static.png"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
}

/** Furniture icon: poster */
function PosterIcon() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 8,
        padding: 5,
        background: "linear-gradient(180deg, #e2ddd4 0%, #d4cfc6 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 1px 0 2px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src="/resources/poster.png"
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }}
      />
    </div>
  );
}

/** Furniture icon: couch/sofa */
function CouchIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="8" y="22" width="40" height="18" rx="2" fill="#6b5344" stroke="#4a3728" strokeWidth="1.5" />
      <rect x="8" y="16" width="8" height="8" fill="#6b5344" stroke="#4a3728" strokeWidth="1.5" />
      <rect x="40" y="16" width="8" height="8" fill="#6b5344" stroke="#4a3728" strokeWidth="1.5" />
    </svg>
  );
}

/** Cosmetics icon: video-game style angel wings */
function AngelWingIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      {/* Left wing: one shape sweeping up and out */}
      <path
        d="M28 40 L12 22 Q6 28 12 36 L24 40 Q16 36 28 30 L28 40 Z"
        fill="#f0ece4"
        stroke="#2d2d2d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 32 Q12 28 12 24" stroke="#2d2d2d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M18 36 Q10 32 12 30" stroke="#2d2d2d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Right wing */}
      <path
        d="M28 40 L44 22 Q50 28 44 36 L32 40 Q40 36 28 30 L28 40 Z"
        fill="#f0ece4"
        stroke="#2d2d2d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M36 32 Q44 28 44 24" stroke="#2d2d2d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38 36 Q46 32 44 30" stroke="#2d2d2d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function renderItemIcon(itemId: string) {
  switch (itemId) {
    case "cat-portrait":
      return <CatPortraitIcon />;
    case "couch":
      return <CouchIcon />;
    case "poster":
      return <PosterIcon />;
    case "angel-wings":
      return <AngelWingIcon />;
    default:
      return null;
  }
}

export function ShopPanel({ onClose }: ShopPanelProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>("furniture");
  const { points, ownedItems, setPoints, setOwnedItems } = usePlayer();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  async function handleBuy(item: ShopItemDef) {
    if (ownedItems.includes(item.id) || points < item.price) return;
    setBuyError(null);
    setBuyingId(item.id);
    try {
      const addRes = await fetch("/api/user/owned-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!addRes.ok) {
        const err = await addRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Could not add item");
      }
      const list = await addRes.json();
      const pointsRes = await fetch("/api/user/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: points - item.price }),
      });
      if (!pointsRes.ok) throw new Error("Could not update points");
      setOwnedItems(Array.isArray(list) ? list : [...ownedItems, item.id]);
      setPoints(points - item.price);
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuyingId(null);
    }
  }

  const items = activeTab === "furniture" ? FURNITURE_ITEMS : COSMETIC_ITEMS;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 19,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        pointerEvents: "none",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 340,
          maxHeight: "min(85vh, 420px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "var(--card-white)",
          borderRadius: "var(--radius)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexShrink: 0 }}>
          <h2 id="shop-title" className="main-title" style={{ margin: 0, fontSize: "1.25rem" }}>
            Shop
          </h2>
          {onClose && (
            <button
              type="button"
              aria-label="Close shop"
              onClick={onClose}
              className="btn"
              style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
            >
              Close
            </button>
          )}
        </div>

        {/* Tab bar: Furniture | Cosmetics */}
        <div
          role="tablist"
          aria-label="Shop category"
          style={{
            display: "flex",
            gap: 0,
            marginBottom: "1rem",
            flexShrink: 0,
            background: "var(--card-grey)",
            borderRadius: "var(--radius-sm)",
            padding: 3,
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "furniture"}
            onClick={() => setActiveTab("furniture")}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: activeTab === "furniture" ? "var(--text-primary)" : "var(--text-secondary)",
              background: activeTab === "furniture" ? "var(--card-white)" : "transparent",
              boxShadow: activeTab === "furniture" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Furniture
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "cosmetics"}
            onClick={() => setActiveTab("cosmetics")}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: activeTab === "cosmetics" ? "var(--text-primary)" : "var(--text-secondary)",
              background: activeTab === "cosmetics" ? "var(--card-white)" : "transparent",
              boxShadow: activeTab === "cosmetics" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Cosmetics
          </button>
        </div>

        {buyError && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.8125rem",
              color: "#b91c1c",
              background: "#fef2f2",
              borderRadius: "var(--radius-sm)",
              flexShrink: 0,
            }}
          >
            {buyError}
          </div>
        )}

        {/* Content: only the active category */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map((item) => {
              const owned = ownedItems.includes(item.id);
              const canAfford = points >= item.price;
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.875rem 1rem",
                  }}
                >
                  {renderItemIcon(item.id)}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {item.price} pts
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem" }}>
                      {owned ? (
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            padding: "0.35rem 0.75rem",
                          }}
                        >
                          Owned
                        </span>
                      ) : (
                        <>
                          {!canAfford && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              Need {item.price - points} more pts
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn"
                            disabled={!canAfford || buyingId !== null}
                            style={{
                              fontSize: "0.8125rem",
                              padding: "0.35rem 0.75rem",
                              opacity: canAfford && buyingId === null ? 1 : 0.7,
                              cursor: canAfford && buyingId === null ? "pointer" : "not-allowed",
                            }}
                            onClick={() => handleBuy(item)}
                          >
                            {buyingId === item.id ? "..." : "Buy"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
