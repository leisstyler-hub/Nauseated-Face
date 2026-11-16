import type { InspectionEvent } from "./kingcounty";
type Ranked = Pick<
  InspectionEvent,
  | "totalViolationPoints"
  | "redViolationCount"
  | "closedBusiness"
  | "result"
  | "inspectionDate"
>;
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
