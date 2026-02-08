"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DAILY_PROMPT_TASK_ID,
  NEW_SONG_TASK_ID,
  DOCUMENT_TASK_ID,
} from "@/lib/tasks";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const TASK_LABELS: Record<string, string> = {
  [DAILY_PROMPT_TASK_ID]: "Daily prompt",
  [NEW_SONG_TASK_ID]: "New song",
  [DOCUMENT_TASK_ID]: "Document",
};

type DayDetail = {
  date: string;
  dailyPromptText: string;
  completed: string[];
  remaining: string[];
  completions: { taskId: string; notes?: string; metadata?: Record<string, unknown> }[];
  pointsSnapshot: number | null;
  streakSnapshot: number | null;
  documentPhotoUrl: string | null;
};

type HistoryPanelProps = { onClose?: () => void };

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [highlightDates, setHighlightDates] = useState<Set<string>>(new Set());
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchDates = useCallback(async () => {
    const res = await fetch("/api/user/history");
    if (!res.ok) return;
    const data = await res.json();
    setHighlightDates(new Set(data.dates ?? []));
  }, []);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  useEffect(() => {
    if (!selectedDate) {
      setDayDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/user/history?date=${selectedDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setDayDetail(data);
        else if (!cancelled) setDayDetail(null);
      })
      .catch(() => {
        if (!cancelled) setDayDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthLabel = currentMonth.toLocaleString("default", { month: "short", year: "numeric" });
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  const pad = 42 - days.length;
  for (let i = 0; i < pad; i++) days.push(null);

  const getDateKey = (d: number | null, i: number): string | null => {
    if (d === null) return null;
    const inCurrentMonth = i >= firstDay && i < firstDay + daysInMonth;
    if (!inCurrentMonth) return null;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const formatDisplayDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Close history"
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 18 }}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose?.()}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 19,
          width: "min(420px, 95vw)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--card-white)",
          borderRadius: "var(--radius)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="heading-serif" style={{ margin: 0, fontSize: "1.25rem" }}>
            History
          </h2>
          <button type="button" className="btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="calendar-card" style={{ padding: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <button
              type="button"
              onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
              className="btn"
              style={{ padding: "0.25rem 0.5rem" }}
              aria-label="Previous month"
            >
              ←
            </button>
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{monthLabel}</span>
            <button
              type="button"
              onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
              className="btn"
              style={{ padding: "0.25rem 0.5rem" }}
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", fontSize: "0.75rem" }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", color: "var(--text-secondary)", fontWeight: 500 }}>
                {d}
              </div>
            ))}
            {days.map((d, i) => {
              const dateKey = getDateKey(d, i);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              return (
                <button
                  key={i}
                  type="button"
                  style={{
                    textAlign: "center",
                    padding: "0.35rem 0",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid transparent",
                    background: isSelected
                      ? "var(--calendar-event)"
                      : isToday
                        ? "rgba(45,45,45,0.15)"
                        : "transparent",
                    color: isSelected ? "white" : isToday ? "var(--text-primary)" : "var(--text-secondary)",
                    opacity: d === null ? 0 : 1,
                    fontWeight: isToday ? 600 : 400,
                    cursor: d !== null ? "pointer" : "default",
                    fontSize: "inherit",
                  }}
                  onClick={() => dateKey && setSelectedDate(dateKey)}
                  disabled={d === null}
                  aria-label={dateKey ? `View ${dateKey}` : undefined}
                >
                  {d ?? ""}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="card" style={{ marginBottom: 0, flex: 1, minHeight: 0, overflow: "auto" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600 }}>
              {formatDisplayDate(selectedDate)}
            </h3>
            {loadingDetail ? (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>Loading…</p>
            ) : dayDetail ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <strong>Daily quest:</strong> {dayDetail.dailyPromptText}
                </p>

                {(() => {
                  const dailyComp = dayDetail.completions.find((c) => c.taskId === DAILY_PROMPT_TASK_ID);
                  return dailyComp?.notes ? (
                    <div>
                      <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Your response
                      </p>
                      <p style={{ margin: 0, fontSize: "0.9rem" }}>&ldquo;{dailyComp.notes}&rdquo;</p>
                    </div>
                  ) : null;
                })()}

                {(() => {
                  const songComp = dayDetail.completions.find((c) => c.taskId === NEW_SONG_TASK_ID);
                  const title = songComp?.metadata?.songTitle as string | undefined;
                  const artist = songComp?.metadata?.songArtist as string | undefined;
                  if (!title && !artist) return null;
                  return (
                    <div>
                      <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Song recommended
                      </p>
                      <p style={{ margin: 0, fontSize: "0.9rem" }}>
                        {[title, artist].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                  );
                })()}

                {dayDetail.documentPhotoUrl && (
                  <div>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Photo taken
                    </p>
                    <img
                      src={dayDetail.documentPhotoUrl}
                      alt="Document for this day"
                      style={{
                        width: "100%",
                        maxHeight: 200,
                        objectFit: "cover",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--card-grey)",
                      }}
                    />
                  </div>
                )}

                <div>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Completed
                  </p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {dayDetail.completed.map((taskId) => (
                      <li key={taskId} style={{ fontSize: "0.9rem" }}>
                        {TASK_LABELS[taskId] ?? taskId}
                      </li>
                    ))}
                    {dayDetail.completed.length === 0 && (
                      <li style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>None</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Remaining
                  </p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {dayDetail.remaining.map((taskId) => (
                      <li key={taskId} style={{ fontSize: "0.9rem" }}>
                        {TASK_LABELS[taskId] ?? taskId}
                      </li>
                    ))}
                    {dayDetail.remaining.length === 0 && (
                      <li style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>All done</li>
                    )}
                  </ul>
                </div>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  {dayDetail.streakSnapshot !== null && (
                    <span style={{ fontSize: "0.9rem" }}>
                      <strong>Streak:</strong> {dayDetail.streakSnapshot} day{dayDetail.streakSnapshot !== 1 ? "s" : ""}
                    </span>
                  )}
                  {dayDetail.pointsSnapshot !== null && (
                    <span style={{ fontSize: "0.9rem" }}>
                      <strong>Points:</strong> {dayDetail.pointsSnapshot}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No data for this day.</p>
            )}
          </div>
        )}

        {!selectedDate && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
            Click a date to see that day's quests and stats.
          </p>
        )}
      </div>
    </>
  );
}
