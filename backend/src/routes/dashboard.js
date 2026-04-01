import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { DrawRun } from "../models/DrawRun.js";
import { WinnerRecord } from "../models/WinnerRecord.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const [latestDraw, drawCount, winnerRecords] = await Promise.all([
    DrawRun.findOne({ publishedAt: { $ne: null } }).sort({ publishedAt: -1 }),
    DrawRun.countDocuments({ publishedAt: { $ne: null } }),
    WinnerRecord.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10)
  ]);

  const winningsByStatus = winnerRecords.reduce(
    (acc, winner) => {
      if (winner.payoutStatus === "paid") {
        acc.paid += winner.prizeAmount;
      } else {
        acc.pending += winner.prizeAmount;
      }

      return acc;
    },
    { pending: 0, paid: 0 }
  );

  return res.json({
    subscription: req.user.subscription,
    charitySelection: req.user.charitySelection,
    scores: req.user.scores,
    winningsTotal: req.user.winningsTotal,
    latestDraw,
    participation: {
      drawsEntered: drawCount,
      upcomingDrawMonthKey: latestDraw?.monthKey || null
    },
    winnings: {
      recent: winnerRecords,
      pendingAmount: winningsByStatus.pending,
      paidAmount: winningsByStatus.paid
    }
  });
});

export default router;
