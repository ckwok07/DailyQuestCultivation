"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout";
import { MainContent } from "@/components/MainContent";
import { IsometricRoom } from "@/components/cat-space";
import { usePlayer } from "@/context/PlayerContext";

export default function Home() {
  const [catSpaceEditMode, setCatSpaceEditMode] = useState(false);
  const { roomLayout } = usePlayer();

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
        <MainContent />
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
