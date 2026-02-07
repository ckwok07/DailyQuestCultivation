"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { usePlayer } from "@/context/PlayerContext";

type SidebarProps = { onEditCatSpace?: () => void };

export function Sidebar({ onEditCatSpace }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { points } = usePlayer();

  return (
    <div style={{ width: 220, flexShrink: 0, position: "relative" }}>
      <button
        type="button"
        className="hamburger"
        aria-label="Menu"
        onClick={() => setMenuOpen((o) => !o)}
        style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 20 }}
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" strokeWidth="2" strokeLinecap="round">
          <path d="M0 1h20M0 7h20M0 13h20" />
        </svg>
      </button>

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
              width: 220,
              minHeight: "100vh",
              paddingTop: "4rem",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              boxShadow: "2px 0 12px rgba(0,0,0,0.1)",
              background: "var(--bg-page)",
            }}
          >
            <Nav onNavigate={() => setMenuOpen(false)} onEditCatSpace={onEditCatSpace} />
          </aside>
        </>
      )}

      <div style={{ padding: "1rem", paddingTop: "4.5rem" }}>
        <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          {points} pts
        </div>
      </div>
    </div>
  );
}
