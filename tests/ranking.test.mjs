import test from "node:test";
import assert from "node:assert/strict";
import {
  concernPercent,
  badFirst,
  eligibleForWorst,
} from "../src/lib/ranking.ts";
const event = (points, red = 0, closed = false) => ({
  totalViolationPoints: points,
  redViolationCount: red,
  closedBusiness: closed,
  result: "Satisfactory",
  inspectionDate: "2026-11-11",
});
test("percentage is explicitly bounded, with zero preserved", () => {
  assert.equal(concernPercent(event(0)), 0);
  assert.equal(concernPercent(event(37)), 37);
  assert.equal(concernPercent(event(150)), 100);
});
test("one minor violation cannot qualify for worst", () => {
  assert.equal(eligibleForWorst(event(5)), false);
  assert.equal(eligibleForWorst(event(25, 1)), true);
});
test("bad-first ordering keeps severe results before good ones", () => {
  assert.deepEqual(
    [event(0), event(93, 4), event(5)]
      .sort(badFirst)
      .map((x) => x.totalViolationPoints),
    [93, 5, 0],
  );
});
