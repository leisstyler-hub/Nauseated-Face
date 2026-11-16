export function formatInspectionDate(iso: string): string {
  // Socrata floating timestamps represent a calendar date, not a UTC instant.
  const floating = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+)?$/.test(iso);
  const d = new Date(floating ? `${iso.slice(0, 10)}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: floating ? "UTC" : "America/Los_Angeles",
  }).format(d);
}

export function formatRefreshedAt(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/Los_Angeles",
  }).format(d);
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
