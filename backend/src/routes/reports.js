import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { DrawRun } from "../models/DrawRun.js";
import { WinnerRecord } from "../models/WinnerRecord.js";
import { NotificationLog } from "../models/NotificationLog.js";
import { LedgerEntry } from "../models/LedgerEntry.js";

const router = express.Router();

router.get("/summary", requireAuth, requireRole("admin"), async (_req, res) => {
  const [totalUsers, activeSubscribers, totalPrizePoolAgg, winnersAgg] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ "subscription.status": "active" }),
    DrawRun.aggregate([{ $group: { _id: null, total: { $sum: "$prizePool.total" } } }]),
    WinnerRecord.aggregate([
      {
        $group: {
          _id: "$verificationStatus",
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const totalPrizePool = totalPrizePoolAgg[0]?.total || 0;
  const winnerVerification = winnersAgg.reduce(
    (acc, item) => ({ ...acc, [item._id]: item.count }),
    { pending: 0, approved: 0, rejected: 0 }
  );

  return res.json({
    totalUsers,
    activeSubscribers,
    totalPrizePool,
    winnerVerification
  });
});

router.get("/charities", requireAuth, requireRole("admin"), async (_req, res) => {
  const charityContribution = await User.aggregate([
    {
      $group: {
        _id: "$charitySelection.charityId",
        subscribers: { $sum: 1 },
        avgContributionPct: { $avg: "$charitySelection.contributionPercentage" }
      }
    }
  ]);

  return res.json({ charityContribution });
});

router.get("/draws", requireAuth, requireRole("admin"), async (_req, res) => {
  const draws = await DrawRun.find({ publishedAt: { $ne: null } })
    .sort({ publishedAt: -1 })
    .limit(12)
    .select("monthKey mode winnerCounts prizePool publishedAt");

  return res.json({ draws });
});

router.get("/notifications", requireAuth, requireRole("admin"), async (_req, res) => {
  const recent = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(50);
  const summaryAgg = await NotificationLog.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const summary = summaryAgg.reduce(
    (acc, row) => ({ ...acc, [row._id]: row.count }),
    { sent: 0, failed: 0, skipped: 0 }
  );

  return res.json({ summary, recent });
});

router.get("/ledger", requireAuth, requireRole("admin"), async (_req, res) => {
  const entries = await LedgerEntry.find({}).sort({ createdAt: -1 }).limit(100);
  return res.json({ entries });
});

router.get("/reconciliation", requireAuth, requireRole("admin"), async (_req, res) => {
  const grouped = await LedgerEntry.aggregate([
    {
      $group: {
        _id: "$entryType",
        total: { $sum: "$amount" }
      }
    }
  ]);

  const map = grouped.reduce((acc, item) => ({ ...acc, [item._id]: item.total }), {});

  const income = map.subscription_income || 0;
  const charityAllocation = map.charity_allocation || 0;
  const platformRevenue = map.platform_revenue || 0;
  const prizeAllocations = map.prize_pool_allocation || 0;
  const drawCommitment = map.draw_prize_commitment || 0;
  const payoutOutflow = map.payout_outflow || 0;

  const allocationGap = Number((income - charityAllocation - platformRevenue - prizeAllocations).toFixed(2));
  const prizeLiability = Number((drawCommitment - payoutOutflow).toFixed(2));

  return res.json({
    totals: {
      subscriptionIncome: income,
      charityAllocation,
      platformRevenue,
      prizePoolAllocation: prizeAllocations,
      drawCommitment,
      payoutOutflow
    },
    checks: {
      allocationGap,
      prizeLiability
    }
  });
});

export default router;
