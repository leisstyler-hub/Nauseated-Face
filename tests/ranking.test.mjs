import test from "node:test";
import assert from "node:assert/strict";
import {
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
test("official point totals above 100 retain their value and ordering", () => {
  const high=event(130),higher=event(150);
  assert.deepEqual([event(0),high,event(100),higher].sort(badFirst).map(x=>x.totalViolationPoints),[150,130,100,0]);
  assert.equal(eligibleForWorst(high),true);
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
