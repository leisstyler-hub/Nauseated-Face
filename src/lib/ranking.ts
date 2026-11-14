import type { InspectionEvent } from "./kingcounty";
type Ranked = Pick<
  InspectionEvent,
  | "totalViolationPoints"
  | "redViolationCount"
  | "closedBusiness"
  | "result"
  | "inspectionDate"
>;
// Point-based v1. This is an editorial index, never a probability of illness.
export function concernPercent(event: Ranked): number {
  return Math.round(Math.min(100, Math.max(0, event.totalViolationPoints)));
}
export function eligibleForWorst(event: Ranked): boolean {
  return (
    event.totalViolationPoints >= 20 ||
    event.closedBusiness ||
    event.result?.toLowerCase() === "unsatisfactory"
  );
}
export function badFirst(a: Ranked, b: Ranked): number {
  return (
    b.totalViolationPoints - a.totalViolationPoints ||
    b.redViolationCount - a.redViolationCount ||
    b.inspectionDate.localeCompare(a.inspectionDate)
  );
}
