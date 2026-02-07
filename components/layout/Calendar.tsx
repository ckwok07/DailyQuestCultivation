"use client";

import { useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function Calendar() {
  const [current, setCurrent] = useState(() => new Date());
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const monthLabel = current.toLocaleString("default", { month: "short", year: "numeric" });
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  const nextMonthDays = 42 - days.length;
  for (let d = 1; d <= nextMonthDays; d++) days.push(d);

  const isToday = (d: number | null) =>
    d !== null && today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
  const isCurrentMonth = (i: number) => i >= firstDay && i < firstDay + daysInMonth;
  const isEventDay = (d: number | null, i: number) => d === 18 && isCurrentMonth(i);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <button type="button" onClick={prevMonth} className="btn" style={{ padding: "0.25rem 0.5rem" }} aria-label="Previous month">←</button>
        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="btn" style={{ padding: "0.25rem 0.5rem" }} aria-label="Next month">→</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", fontSize: "0.75rem" }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", color: "var(--text-secondary)", fontWeight: 500 }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const todayCell = d !== null && isToday(d);
          const eventCell = d !== null && isEventDay(d, i);
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: "0.35rem 0",
                borderRadius: "var(--radius-sm)",
                background: todayCell ? "var(--calendar-highlight)" : eventCell ? "var(--calendar-event)" : "transparent",
                color: todayCell || eventCell ? "white" : !isCurrentMonth(i) ? "var(--text-secondary)" : "var(--text-primary)",
                opacity: !isCurrentMonth(i) ? 0.6 : 1,
                fontWeight: todayCell ? 600 : 400,
              }}
            >
              {d ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
