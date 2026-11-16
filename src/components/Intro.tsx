"use client";
import { Face } from "@/components/Face";

import { useEffect, useState } from "react";
let startedAt: number | undefined;
export function Intro() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const entry = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    // A reload starts a fresh introduction; client navigation and back/forward do not.
    if (
      entry?.type === "back_forward" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    startedAt ??= performance.now();
    const remaining = 1500 - (performance.now() - startedAt);
    if (remaining <= 0) return;
    const frame = requestAnimationFrame(() => setShow(true));
    const timer = setTimeout(() => setShow(false), remaining);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  return show ? (
    <div className="intro" aria-hidden="true">
      <span><Face /></span>
    </div>
  ) : null;
}
