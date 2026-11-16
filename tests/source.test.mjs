import test from "node:test";
import assert from "node:assert/strict";
import { fetchRecentInspectionEvents } from "../src/lib/kingcounty.ts";
test("key-first fetch includes all violation rows and source closure", async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    urls.push(url);
    const row = {
      business_id: "B1",
      inspection_serial_num: "I1",
      inspection_date: "2026-11-12T00:00:00",
      name: "Test fixture",
      address: "A",
      city: "Seattle",
      inspection_type: "Routine",
      inspection_closed_business: "true",
      inspection_score: "37",
      inspection_result: "Unsatisfactory",
    };
    return Response.json(
      url.searchParams.has("$group")
        ? [row]
        : [
            {
              ...row,
              violation_type: "RED",
              violation_description: "A",
              violation_points: "25",
            },
            {
              ...row,
              violation_type: "BLUE",
              violation_description: "B",
              violation_points: "12",
            },
          ],
    );
  };
  try {
    const [event] = await fetchRecentInspectionEvents();
    assert.equal(event.totalViolationPoints, 37);
    assert.equal(event.redViolationCount, 1);
    assert.equal(event.violationCount, 2);
    assert.equal(event.closedBusiness, true);
    assert.ok(
      urls[1].searchParams
        .get("$where")
        .includes("inspection_date='2026-11-12T00:00:00'"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("API errors remain errors instead of fabricated records", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 429 });
  try {
    await assert.rejects(fetchRecentInspectionEvents(), /429/);
  } finally {
    globalThis.fetch = original;
  }
});
