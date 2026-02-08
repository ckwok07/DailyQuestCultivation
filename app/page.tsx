"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout";
import { MainContent } from "@/components/MainContent";
import { IsometricRoom } from "@/components/cat-space";
import { usePlayer } from "@/context/PlayerContext";

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export default function Home() {
  const [catSpaceEditMode, setCatSpaceEditMode] = useState(false);
  const [testDate, setTestDate] = useState<Date | null>(null);
  const { roomLayout } = usePlayer();

  const handleNewDayTest = () => {
    const base = testDate ?? new Date();
    setTestDate(addDays(base, 1));
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
        <MainContent testDate={testDate} />
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
