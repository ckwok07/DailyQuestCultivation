"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout";
import { MainContent } from "@/components/MainContent";

export default function Home() {
  const [catSpaceEditMode, setCatSpaceEditMode] = useState(false);

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
          padding: "1.5rem",
          minWidth: 280,
        }}
      >
        <div className={`cat-space-area ${catSpaceEditMode ? "edit-mode" : ""}`}>
          {catSpaceEditMode ? "Edit cat space — place items here" : "Cat space"}
        </div>
      </section>
    </main>
  );
}
