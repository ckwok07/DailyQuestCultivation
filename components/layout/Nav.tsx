"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavProps = {
  onNavigate?: () => void;
  onEditCatSpace?: () => void;
  onOpenHistory?: () => void;
};

const navItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  width: "100%",
  padding: "0.65rem 0.75rem",
  border: "none",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: "0.9375rem",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.15s ease",
};

export function Nav({ onNavigate, onEditCatSpace, onOpenHistory }: NavProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p
        style={{
          margin: "0 0 0.5rem 0",
          paddingLeft: "0.5rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Menu
      </p>
      <button
        type="button"
        style={navItemStyle}
        onClick={() => { onEditCatSpace?.(); onNavigate?.(); }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--button-bg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        Edit cat space
      </button>
      <button
        type="button"
        style={navItemStyle}
        onClick={() => { onOpenHistory?.(); onNavigate?.(); }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--button-bg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        History
      </button>
      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <button
          type="button"
          style={{ ...navItemStyle, color: "var(--text-secondary)" }}
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--button-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </div>
    </nav>
  );
}
