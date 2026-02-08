"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavProps = {
  onNavigate?: () => void;
  onEditCatSpace?: () => void;
};

export function Nav({ onNavigate, onEditCatSpace }: NavProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        type="button"
        className="btn"
        style={{ alignSelf: "flex-start", textAlign: "left" }}
        onClick={() => { onEditCatSpace?.(); onNavigate?.(); }}
      >
        Edit cat space
      </button>
      <button type="button" onClick={handleLogout} className="btn" style={{ alignSelf: "flex-start" }}>
        Log out
      </button>
    </nav>
  );
}
