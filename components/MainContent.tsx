"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";

export function MainContent() {
  const { isLoading } = usePlayer();
  const [dailyPrompt, setDailyPrompt] = useState("Go on a walk");
  const [songTitle, setSongTitle] = useState("When I'm Small");
  const [songArtist, setSongArtist] = useState("Phantogram");
  const [documentTitle, setDocumentTitle] = useState("You and a friend");
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editingSong, setEditingSong] = useState(false);
  const [editingDoc, setEditingDoc] = useState(false);

  if (isLoading) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="main-title">Things to do today:</h1>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="task-label">Daily Prompt</p>
          {editingPrompt ? (
            <input
              type="text"
              value={dailyPrompt}
              onChange={(e) => setDailyPrompt(e.target.value)}
              onBlur={() => setEditingPrompt(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingPrompt(false)}
              className="task-title"
              style={{ width: "100%", margin: 0, padding: "0.25rem 0", border: "1px solid var(--text-secondary)", borderRadius: "var(--radius-sm)" }}
              autoFocus
            />
          ) : (
            <p className="task-title" onClick={() => setEditingPrompt(true)} style={{ cursor: "pointer", margin: 0 }}>
              {dailyPrompt}
            </p>
          )}
        </div>
        <button type="button" className="btn">Log</button>
      </div>

      <div className="card-grey" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="task-label">Listen to a new song:</p>
          {editingSong ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Song title"
                style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--text-secondary)" }}
              />
              <input
                type="text"
                value={songArtist}
                onChange={(e) => setSongArtist(e.target.value)}
                placeholder="Artist"
                style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--text-secondary)" }}
              />
              <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setEditingSong(false)}>Done</button>
            </div>
          ) : (
            <p className="task-title" style={{ marginBottom: 0, cursor: "pointer" }} onClick={() => setEditingSong(true)}>
              {songTitle} — {songArtist}
            </p>
          )}
        </div>
        {!editingSong && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn">Yes</button>
            <button type="button" className="btn">No</button>
          </div>
        )}
      </div>

      <div className="card">
        <p className="task-label">Document:</p>
        {editingDoc ? (
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            onBlur={() => setEditingDoc(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingDoc(false)}
            className="task-title"
            style={{ width: "100%", margin: 0, padding: "0.25rem 0", border: "1px solid var(--text-secondary)", borderRadius: "var(--radius-sm)" }}
            autoFocus
          />
        ) : (
          <p className="task-title" style={{ marginBottom: 0, cursor: "pointer" }} onClick={() => setEditingDoc(true)}>
            {documentTitle}
          </p>
        )}
      </div>
    </div>
  );
}
