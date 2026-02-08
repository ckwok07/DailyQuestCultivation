"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout";
import { MainContent } from "@/components/MainContent";
import { IsometricRoom } from "@/components/cat-space";
import { usePlayer } from "@/context/PlayerContext";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export default function Home() {
  const [catSpaceEditMode, setCatSpaceEditMode] = useState(false);
  const [resetTasksKey, setResetTasksKey] = useState(0);
  const [promptDateOverride, setPromptDateOverride] = useState<Date | null>(null);
  const { roomLayout } = usePlayer();

  const handleNewDayTest = async () => {
    const dateKey = toDateKey(new Date());
    try {
      const res = await fetch(`/api/user/completions?date=${dateKey}`, { method: "DELETE" });
      if (res.ok) {
        setResetTasksKey((k) => k + 1);
        setPromptDateOverride((prev) => addDays(prev ?? new Date(), 1));
      }
    } catch {
      setResetTasksKey((k) => k + 1);
      setPromptDateOverride((prev) => addDays(prev ?? new Date(), 1));
    }
  };

  return (
    <main style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar onEditCatSpace={() => setCatSpaceEditMode((on) => !on)} />
      <section
        style={{
          flex: 1,
          padding: "1.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <MainContent resetTasksKey={resetTasksKey} promptDateOverride={promptDateOverride} />
        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <button
            type="button"
            onClick={handleNewDayTest}
            className="btn"
            style={{ fontSize: "0.85rem", opacity: 0.9 }}
          >
            New day (test)
          </button>
        </div>
      </section>
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          minWidth: 280,
          minHeight: 0,
        }}
      >
        <IsometricRoom editMode={catSpaceEditMode} roomLayout={roomLayout} />
      </section>
    </main>
  );
}
