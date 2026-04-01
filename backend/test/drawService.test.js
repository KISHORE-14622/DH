import test from "node:test";
import assert from "node:assert/strict";
import { countMatches, splitPrizePool } from "../src/services/drawService.js";

test("countMatches returns overlapping values count", () => {
  const matches = countMatches([10, 20, 30, 40, 45], [5, 10, 20, 33, 45]);
  assert.equal(matches, 3);
});

test("splitPrizePool distributes percentages and splits winners", () => {
  const result = splitPrizePool({
    totalPool: 100000,
    winnerCounts: {
      match5: 2,
      match4: 4,
      match3: 10
    },
    rolloverIn: 5000
  });

  assert.equal(result.tier5, 45000);
  assert.equal(result.tier4, 35000);
  assert.equal(result.tier3, 25000);
  assert.equal(result.perWinner.match5, 22500);
  assert.equal(result.perWinner.match4, 8750);
  assert.equal(result.perWinner.match3, 2500);
  assert.equal(result.rollover, 0);
});

test("splitPrizePool rolls over unclaimed 5-match jackpot", () => {
  const result = splitPrizePool({
    totalPool: 20000,
    winnerCounts: {
      match5: 0,
      match4: 2,
      match3: 4
    },
    rolloverIn: 3000
  });

  assert.equal(result.tier5, 11000);
  assert.equal(result.rollover, 11000);
  assert.equal(result.perWinner.match5, 0);
});
