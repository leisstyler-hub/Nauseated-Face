"use client";
import { Face } from "@/components/Face";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { inspectionPath } from "../../backend/inspection-detail.mjs";
import type { InspectionEvent } from "@/lib/kingcounty";
import { titleCase } from "@/lib/format";
export function InspectionTicker({ events }: { events: InspectionEvent[] }) {
  const [paused, setPaused] = useState(false);
  const [repeats, setRepeats] = useState(8);
  const windowRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = windowRef.current;
    const sequence = sequenceRef.current;
    if (!viewport || !sequence) return;
    const fill = () => {
      const width = sequence.getBoundingClientRect().width;
      if (width > 0) setRepeats(Math.max(1, Math.ceil(viewport.clientWidth / width) + 1));
    };
    const observer = new ResizeObserver(fill);
    observer.observe(viewport);
    observer.observe(sequence);
    fill();
    return () => observer.disconnect();
  }, [events]);
  if (!events.length) return null;
  return (
    <section
      className="ticker"
      aria-label="Recent King County inspection records"
    >
      <span className="ticker-label">LATEST RECORDS</span>
      <div className="ticker-window" ref={windowRef}>
        <div
          className="ticker-track"
          style={{ animationPlayState: paused ? "paused" : undefined }}
        >
          {[0, 1].map((copy) => (
            <div className="ticker-copy" key={copy} aria-hidden={copy === 1}>
              {Array.from({ length: repeats }, (_, repeat) => (
                <div className="ticker-sequence" key={repeat} ref={copy === 0 && repeat === 0 ? sequenceRef : undefined} aria-hidden={copy !== 0 || repeat !== 0}>
              {events.slice(0, 12).map((event) => (
                <Link
                  key={`${event.businessId}:${event.serialNum}:${event.inspectionDate}`}
                  href={inspectionPath(event)}
                  prefetch={false}
                  tabIndex={copy === 0 && repeat === 0 ? 0 : -1}
                  className={
                    event.totalViolationPoints >= 50
                      ? "ticker-item ticker-heavy"
                      : "ticker-item"
                  }
                >
                  {event.totalViolationPoints >= 50 && (
                    <span aria-hidden><Face /> </span>
                  )}
                  {titleCase(event.name)}{" "}
                  <strong>{event.totalViolationPoints} pts</strong>
                </Link>
              ))}
                </div>
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
