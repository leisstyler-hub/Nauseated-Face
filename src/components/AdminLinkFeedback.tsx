"use client";
import { useLinkStatus } from "next/link";

export function AdminLinkFeedback() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status" className="pointer-events-none absolute bottom-0 right-2 text-[10px] text-nausea">Loading…</span> : null;
}
