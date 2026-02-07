"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { getPromptForDate } from "@/lib/prompts";
import {
  DAILY_PROMPT_TASK_ID,
  DAILY_PROMPT_POINTS,
  NEW_SONG_TASK_ID,
  NEW_SONG_POINTS,
  DOCUMENT_TASK_ID,
  DOCUMENT_POINTS,
} from "@/lib/tasks";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CompletionEntry = {
  taskId: string;
  date: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export function MainContent() {
  const { isLoading, loadUserData, points, setPoints } = usePlayer();
  const today = new Date();
  const dateKey = toDateKey(today);
  const dailyPromptText = getPromptForDate(today);

  const [completions, setCompletions] = useState<CompletionEntry[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  const [songTitle, setSongTitle] = useState("When I'm Small");
  const [songArtist, setSongArtist] = useState("Phantogram");
  const [documentTitle, setDocumentTitle] = useState("You and a friend");
  const [editingSong, setEditingSong] = useState(false);
  const [editingDoc, setEditingDoc] = useState(false);

  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [dailyLogText, setDailyLogText] = useState("");
  const documentInputRef = useRef<HTMLInputElement>(null);

  const fetchCompletions = useCallback(async () => {
    const res = await fetch(`/api/user/completions?date=${dateKey}`);
    if (!res.ok) return;
    const data = await res.json();
    setCompletions(data.completions ?? []);
  }, [dateKey]);

  useEffect(() => {
    if (!isLoading) fetchCompletions();
  }, [isLoading, fetchCompletions]);

  const completionByTaskId = (taskId: string) =>
    completions.find((c) => c.taskId === taskId);

  const dailyCompleted = completionByTaskId(DAILY_PROMPT_TASK_ID);
  const songCompleted = completionByTaskId(NEW_SONG_TASK_ID);
  const documentCompleted = completionByTaskId(DOCUMENT_TASK_ID);

  const handleLogDaily = async () => {
    if (dailyCompleted || completing) return;
    if (!dailyLogOpen) {
      setDailyLogOpen(true);
      return;
    }
    setCompleting(DAILY_PROMPT_TASK_ID);
    try {
      const res = await fetch("/api/user/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: DAILY_PROMPT_TASK_ID,
          date: dateKey,
          pointValue: DAILY_PROMPT_POINTS,
          notes: dailyLogText.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDailyLogOpen(false);
        setDailyLogText("");
        setCompletions((prev) => [...prev, { taskId: DAILY_PROMPT_TASK_ID, date: dateKey, notes: dailyLogText.trim() || undefined }]);
        if (typeof data.points === "number") setPoints(data.points);
        else setPoints(points + DAILY_PROMPT_POINTS);
        await fetchCompletions();
        await loadUserData();
      }
    } finally {
      setCompleting(null);
    }
  };

  const handleSongReaction = async (reaction: "like" | "dislike") => {
    if (songCompleted || completing) return;
    setCompleting(NEW_SONG_TASK_ID);
    try {
      const res = await fetch("/api/user/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: NEW_SONG_TASK_ID,
          date: dateKey,
          pointValue: NEW_SONG_POINTS,
          metadata: { songTitle, songArtist, reaction },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompletions((prev) => [...prev, { taskId: NEW_SONG_TASK_ID, date: dateKey, metadata: { songTitle, songArtist, reaction } }]);
        if (typeof data.points === "number") setPoints(data.points);
        else setPoints(points + NEW_SONG_POINTS);
        await fetchCompletions();
        await loadUserData();
      }
    } finally {
      setCompleting(null);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || documentCompleted || completing) return;
    e.target.value = "";
    setCompleting(DOCUMENT_TASK_ID);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("date", dateKey);
      const uploadRes = await fetch("/api/user/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        alert(err.error || "Upload failed");
        return;
      }
      const { path } = await uploadRes.json();
      const completionRes = await fetch("/api/user/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: DOCUMENT_TASK_ID,
          date: dateKey,
          pointValue: DOCUMENT_POINTS,
          metadata: { photoPath: path },
        }),
      });
      if (completionRes.ok) {
        const data = await completionRes.json();
        setCompletions((prev) => [...prev, { taskId: DOCUMENT_TASK_ID, date: dateKey, metadata: { photoPath: path } }]);
        if (typeof data.points === "number") setPoints(data.points);
        else setPoints(points + DOCUMENT_POINTS);
        await fetchCompletions();
        await loadUserData();
      }
    } finally {
      setCompleting(null);
    }
  };

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

      {/* 1. Task (daily prompt) — Log with a few words */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="task-label">Task (+{DAILY_PROMPT_POINTS} pts)</p>
            <p className="task-title" style={{ margin: 0 }}>
              {dailyPromptText}
            </p>
          </div>
          {!dailyCompleted && (
            <button
              type="button"
              className="btn"
              onClick={handleLogDaily}
              disabled={completing === DAILY_PROMPT_TASK_ID}
            >
              {completing === DAILY_PROMPT_TASK_ID ? "…" : dailyLogOpen ? "Submit" : "Log"}
            </button>
          )}
        </div>
        {dailyLogOpen && !dailyCompleted && (
          <textarea
            value={dailyLogText}
            onChange={(e) => setDailyLogText(e.target.value)}
            placeholder="A few words about doing it…"
            rows={2}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--text-secondary)",
              resize: "vertical",
            }}
          />
        )}
        {dailyCompleted && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {dailyCompleted.notes ? `“${dailyCompleted.notes}”` : "Complete"}
          </p>
        )}
      </div>

      {/* 2. New song — Like / Dislike */}
      <div className="card-grey" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="task-label">New song (+{NEW_SONG_POINTS} pts)</p>
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
              <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setEditingSong(false)}>
                Done
              </button>
            </div>
          ) : (
            <p className="task-title" style={{ marginBottom: 0, cursor: songCompleted ? "default" : "pointer" }} onClick={() => !songCompleted && setEditingSong(true)}>
              {songTitle} — {songArtist}
            </p>
          )}
        </div>
        {!songCompleted && !editingSong && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleSongReaction("like")}
              disabled={completing === NEW_SONG_TASK_ID}
            >
              Like
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => handleSongReaction("dislike")}
              disabled={completing === NEW_SONG_TASK_ID}
            >
              Dislike
            </button>
          </div>
        )}
        {songCompleted && (
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {songCompleted.metadata?.reaction === "like" ? "Liked" : "Disliked"}
          </span>
        )}
      </div>

      {/* 3. Document — Log with photo upload */}
      <div className="card">
        <p className="task-label">Document (+{DOCUMENT_POINTS} pts)</p>
        {editingDoc ? (
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            onBlur={() => setEditingDoc(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingDoc(false)}
            className="task-title"
            style={{ width: "100%", margin: 0, marginBottom: "0.5rem", padding: "0.25rem 0", border: "1px solid var(--text-secondary)", borderRadius: "var(--radius-sm)" }}
            autoFocus
          />
        ) : (
          <p className="task-title" style={{ marginBottom: "0.5rem", cursor: "pointer" }} onClick={() => setEditingDoc(true)}>
            {documentTitle}
          </p>
        )}
        {documentCompleted ? (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Photo uploaded</p>
        ) : (
          <>
            <input
              ref={documentInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleDocumentUpload}
            />
            <button
              type="button"
              className="btn"
              onClick={() => documentInputRef.current?.click()}
              disabled={completing === DOCUMENT_TASK_ID}
            >
              {completing === DOCUMENT_TASK_ID ? "Uploading…" : "Log (upload photo)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
