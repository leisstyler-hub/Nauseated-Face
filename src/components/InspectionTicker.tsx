"use client";
import { useState } from "react";
import type { InspectionEvent } from "@/lib/kingcounty";
import { titleCase } from "@/lib/format";
export function InspectionTicker({ events }: { events: InspectionEvent[] }) {
  const [paused, setPaused] = useState(false);
  if (!events.length) return null;
  return (
    <section
      className="ticker"
      aria-label="Recent King County inspection records"
    >
      <span className="ticker-label">LATEST RECORDS</span>
      <div className="ticker-window">
        <div
          className="ticker-track"
          style={{ animationPlayState: paused ? "paused" : undefined }}
        >
          {[0, 1].map((copy) => (
            <div className="ticker-copy" key={copy} aria-hidden={copy === 1}>
              {events.slice(0, 12).map((event) => (
                <a
                  key={event.serialNum}
                  href={event.sourceUrl}
                  tabIndex={copy === 1 ? -1 : 0}
                  className={
                    event.totalViolationPoints >= 50
                      ? "ticker-item ticker-heavy"
                      : "ticker-item"
                  }
                >
                  {event.totalViolationPoints >= 50 && (
                    <span aria-hidden>🤢 </span>
                  )}
                  {titleCase(event.name)}{" "}
                  <strong>{event.totalViolationPoints} pts</strong>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="ticker-toggle"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? "Play" : "Pause"}
      </button>
    </section>
  );
}
