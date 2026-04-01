import express from "express";
import { DrawRun } from "../models/DrawRun.js";
import { User } from "../models/User.js";
import { WinnerRecord } from "../models/WinnerRecord.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { buildWinningNumbers, countMatches, splitPrizePool } from "../services/drawService.js";
import { toDrawNumbers } from "../services/scoreService.js";
import { sendDrawPublishedEmail, sendWinnerAlertEmail } from "../services/notificationService.js";
import { getMonthlyPrizeContribution, recordDrawCommitmentLedger } from "../services/financeService.js";

const router = express.Router();

const getMonthKey = (date = new Date()) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const buildResult = async (mode) => {
  const winningNumbers = await buildWinningNumbers(mode);
  const [activeSubscribers, latestDraw] = await Promise.all([
    User.find({ "subscription.status": "active" }).select("scores subscription.plan"),
    DrawRun.findOne({ publishedAt: { $ne: null } }).sort({ publishedAt: -1 }).select("prizePool.rollover")
  ]);

  const winnerCounts = {
    match5: 0,
    match4: 0,
    match3: 0
  };

  activeSubscribers.forEach((user) => {
    const matches = countMatches(toDrawNumbers(user.scores), winningNumbers);
    if (matches >= 3 && matches <= 5) {
      winnerCounts[`match${matches}`] += 1;
    }
  });

  const totalPool = activeSubscribers.reduce(
    (acc, user) => acc + getMonthlyPrizeContribution(user.subscription?.plan || "monthly"),
    0
  );
  const rolloverIn = Number(latestDraw?.prizePool?.rollover || 0);
  const prizePool = splitPrizePool({ totalPool, winnerCounts, rolloverIn });

  return { winningNumbers, winnerCounts, prizePool };
};

router.post("/simulate", requireAuth, requireRole("admin"), async (req, res) => {
  const mode = req.body.mode === "algorithmic" ? "algorithmic" : "random";
  const result = await buildResult(mode);

  return res.json({ mode, simulated: true, ...result });
});

router.post("/publish", requireAuth, requireRole("admin"), async (req, res) => {
  const monthKey = getMonthKey();
  const existing = await DrawRun.findOne({ monthKey, publishedAt: { $ne: null } });

  if (existing) {
    return res.status(409).json({ message: "Draw already published for this month" });
  }

  const mode = req.body.mode === "algorithmic" ? "algorithmic" : "random";
  const result = await buildResult(mode);

  const saved = await DrawRun.create({
    monthKey,
    mode,
    winningNumbers: result.winningNumbers,
    winnerCounts: result.winnerCounts,
    prizePool: {
      total: result.prizePool.total,
      tier5: result.prizePool.tier5,
      tier4: result.prizePool.tier4,
      tier3: result.prizePool.tier3,
      rollover: result.prizePool.rollover
    },
    simulated: false,
    publishedAt: new Date()
  });

  await recordDrawCommitmentLedger({
    drawRunId: saved._id,
    monthKey,
    amount: result.prizePool.total
  });

  const perWinner = result.prizePool.perWinner;
  const winnerPayloads = [];

  activeSubscribersLoop: for (const user of await User.find({ "subscription.status": "active" })) {
    const matches = countMatches(toDrawNumbers(user.scores), result.winningNumbers);

    if (matches < 3 || matches > 5) {
      continue activeSubscribersLoop;
    }

    winnerPayloads.push({
      drawRunId: saved._id,
      userId: user._id,
      matchCount: matches,
      prizeAmount: matches === 5 ? perWinner.match5 : matches === 4 ? perWinner.match4 : perWinner.match3
    });
  }

  if (winnerPayloads.length) {
    await WinnerRecord.insertMany(winnerPayloads, { ordered: false });
  }

  const winnerUsers = await User.find({ _id: { $in: winnerPayloads.map((item) => item.userId) } }).select("_id email");
  const winnerEmailById = new Map(winnerUsers.map((item) => [String(item._id), item.email]));

  await Promise.allSettled(
    winnerPayloads.map((winner) => {
      const email = winnerEmailById.get(String(winner.userId));
      if (!email) {
        return Promise.resolve();
      }

      return sendWinnerAlertEmail(email, winner.matchCount, winner.prizeAmount);
    })
  );

  const activeSubscribers = await User.find({ "subscription.status": "active" }).select("email");

  await Promise.allSettled(
    activeSubscribers.map((subscriber) => {
      if (!subscriber.email) {
        return Promise.resolve();
      }

      return sendDrawPublishedEmail(subscriber.email, monthKey, result.winningNumbers);
    })
  );

  return res.status(201).json({ draw: saved, payout: result.prizePool.perWinner });
});

router.get("/latest", requireAuth, async (_req, res) => {
  const latest = await DrawRun.findOne({ publishedAt: { $ne: null } }).sort({ publishedAt: -1 });
  return res.json({ draw: latest });
});

export default router;
