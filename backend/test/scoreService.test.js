import test from "node:test";
import assert from "node:assert/strict";
import { applyRollingScores } from "../src/services/scoreService.js";

test("applyRollingScores keeps only latest five in descending date order", () => {
  const base = [
    { score: 30, playedAt: "2026-03-01T00:00:00.000Z" },
    { score: 28, playedAt: "2026-03-02T00:00:00.000Z" },
    { score: 26, playedAt: "2026-03-03T00:00:00.000Z" },
    { score: 24, playedAt: "2026-03-04T00:00:00.000Z" },
    { score: 22, playedAt: "2026-03-05T00:00:00.000Z" }
  ];

  const result = applyRollingScores(base, {
    score: 35,
    playedAt: "2026-03-06T00:00:00.000Z"
  });

  assert.equal(result.length, 5);
  assert.equal(result[0].score, 35);
  assert.equal(result[4].score, 28);
});

test("applyRollingScores inserts older score without breaking sort", () => {
  const base = [
    { score: 20, playedAt: "2026-03-10T00:00:00.000Z" },
    { score: 21, playedAt: "2026-03-09T00:00:00.000Z" }
  ];

  const result = applyRollingScores(base, {
    score: 19,
    playedAt: "2026-03-01T00:00:00.000Z"
  });

  assert.equal(result.length, 3);
  assert.equal(result[0].score, 20);
  assert.equal(result[2].score, 19);
});
