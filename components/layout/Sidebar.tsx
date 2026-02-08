"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { ShopPanel } from "./ShopPanel";
import { HistoryPanel } from "./HistoryPanel";
import { usePlayer } from "@/context/PlayerContext";

type SidebarProps = { onEditCatSpace?: () => void };

export function Sidebar({ onEditCatSpace }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { points } = usePlayer();

  return (
    <div style={{ width: 220, flexShrink: 0, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          right: "1rem",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.5rem 0.75rem",
          background: "var(--card-white)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => { setShopOpen(false); setMenuOpen((o) => !o); }}
            style={{
              width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
              background: menuOpen ? "var(--button-bg)" : "transparent",
              color: "var(--text-primary)",
            }}
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M0 1h20M0 7h20M0 13h20" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Shop"
            onClick={() => { setMenuOpen(false); setShopOpen((o) => !o); }}
            style={{
              width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
              background: shopOpen ? "var(--button-bg)" : "transparent",
              color: "var(--text-primary)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", background: "var(--button-bg)", padding: "0.35rem 0.6rem", borderRadius: "var(--radius-sm)" }}>
          {points} pts
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 18 }}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 19,
              width: 260,
              minHeight: "100vh",
              paddingTop: "5rem",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingBottom: "1rem",
              boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
              background: "var(--card-white)",
              borderRight: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Nav
            onNavigate={() => setMenuOpen(false)}
            onEditCatSpace={onEditCatSpace}
            onOpenHistory={() => { setMenuOpen(false); setHistoryOpen(true); }}
          />
          </aside>
        </>
      )}

      {shopOpen && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Close shop"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 18 }}
            onClick={() => setShopOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setShopOpen(false)}
          />
          <ShopPanel onClose={() => setShopOpen(false)} />
        </>
      )}

      {historyOpen && (
        <HistoryPanel onClose={() => setHistoryOpen(false)} />
      )}

      <div style={{ padding: "1rem", paddingTop: "5.5rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Daily Quest
        </div>
      </div>
    </div>
  );
}
