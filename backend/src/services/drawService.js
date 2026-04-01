import { User } from "../models/User.js";
import { toDrawNumbers } from "./scoreService.js";

const randomFromRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const uniqueRandomNumbers = (count, min = 1, max = 45) => {
  const set = new Set();

  while (set.size < count) {
    set.add(randomFromRange(min, max));
  }

  return Array.from(set).sort((a, b) => a - b);
};

export const buildWinningNumbers = async (mode) => {
  if (mode === "random") {
    return uniqueRandomNumbers(5);
  }

  const subscribers = await User.find({ "subscription.status": "active" }).select("scores");
  const frequency = new Map();

  subscribers.forEach((user) => {
    toDrawNumbers(user.scores).forEach((score) => {
      frequency.set(score, (frequency.get(score) || 0) + 1);
    });
  });

  const ranked = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([score]) => score)
    .slice(0, 5);

  if (ranked.length < 5) {
    const fill = uniqueRandomNumbers(5 - ranked.length).filter((n) => !ranked.includes(n));
    return [...ranked, ...fill].slice(0, 5).sort((a, b) => a - b);
  }

  return ranked.sort((a, b) => a - b);
};

export const countMatches = (userNumbers, winningNumbers) => {
  const winningSet = new Set(winningNumbers);
  return userNumbers.filter((value) => winningSet.has(value)).length;
};

export const splitPrizePool = ({ totalPool, winnerCounts, rolloverIn = 0 }) => {
  const tier5 = totalPool * 0.4 + rolloverIn;
  const tier4 = totalPool * 0.35;
  const tier3 = totalPool * 0.25;

  return {
    total: totalPool,
    tier5,
    tier4,
    tier3,
    rollover: winnerCounts.match5 === 0 ? tier5 : 0,
    perWinner: {
      match5: winnerCounts.match5 ? tier5 / winnerCounts.match5 : 0,
      match4: winnerCounts.match4 ? tier4 / winnerCounts.match4 : 0,
      match3: winnerCounts.match3 ? tier3 / winnerCounts.match3 : 0
    }
  };
};
