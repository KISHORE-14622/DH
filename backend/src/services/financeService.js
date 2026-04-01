import { LedgerEntry } from "../models/LedgerEntry.js";

const PLAN_AMOUNTS = {
  monthly: 1000,
  yearly: 10000
};

const toCurrencyNumber = (value) => Number(Number(value).toFixed(2));

export const getSubscriptionAmount = (plan) => {
  return PLAN_AMOUNTS[plan] || PLAN_AMOUNTS.monthly;
};

export const computeSubscriptionAllocations = ({ plan, contributionPercentage }) => {
  const amount = getSubscriptionAmount(plan);
  const prizePoolPct = Number(process.env.PRIZE_POOL_PERCENTAGE || 40);
  const charityPct = Math.max(10, Number(contributionPercentage || 10));

  const prizePoolAmount = toCurrencyNumber((amount * prizePoolPct) / 100);
  const charityAmount = toCurrencyNumber((amount * charityPct) / 100);
  const platformAmount = toCurrencyNumber(Math.max(0, amount - prizePoolAmount - charityAmount));

  return {
    amount,
    prizePoolAmount,
    charityAmount,
    platformAmount,
    charityPct,
    prizePoolPct
  };
};

export const getMonthlyPrizeContribution = (plan) => {
  const allocations = computeSubscriptionAllocations({
    plan,
    contributionPercentage: 10
  });

  if (plan === "yearly") {
    return toCurrencyNumber(allocations.prizePoolAmount / 12);
  }

  return allocations.prizePoolAmount;
};

export const recordSubscriptionLedger = async ({ user, plan, source }) => {
  const allocations = computeSubscriptionAllocations({
    plan,
    contributionPercentage: user.charitySelection?.contributionPercentage || 10
  });

  const entries = [
    {
      userId: user._id,
      charityId: user.charitySelection?.charityId || null,
      entryType: "subscription_income",
      amount: allocations.amount,
      source,
      reference: `subscription:${plan}`,
      metadata: { plan }
    },
    {
      userId: user._id,
      charityId: user.charitySelection?.charityId || null,
      entryType: "prize_pool_allocation",
      amount: allocations.prizePoolAmount,
      source,
      reference: `subscription:${plan}`,
      metadata: { plan, percentage: allocations.prizePoolPct }
    },
    {
      userId: user._id,
      charityId: user.charitySelection?.charityId || null,
      entryType: "charity_allocation",
      amount: allocations.charityAmount,
      source,
      reference: `subscription:${plan}`,
      metadata: { plan, percentage: allocations.charityPct }
    },
    {
      userId: user._id,
      entryType: "platform_revenue",
      amount: allocations.platformAmount,
      source,
      reference: `subscription:${plan}`,
      metadata: { plan }
    }
  ];

  await LedgerEntry.insertMany(entries);

  return allocations;
};

export const recordDrawCommitmentLedger = async ({ drawRunId, monthKey, amount }) => {
  await LedgerEntry.create({
    drawRunId,
    entryType: "draw_prize_commitment",
    amount: toCurrencyNumber(amount),
    source: "draw_publish",
    reference: monthKey,
    metadata: { monthKey }
  });
};

export const recordPayoutLedger = async ({ winnerRecordId, drawRunId, userId, amount }) => {
  await LedgerEntry.create({
    winnerRecordId,
    drawRunId,
    userId,
    entryType: "payout_outflow",
    amount: toCurrencyNumber(amount),
    source: "winner_payout",
    reference: String(winnerRecordId),
    metadata: {}
  });
};

export const recordIndependentDonationLedger = async ({ userId = null, charityId, amount, reference = "" }) => {
  await LedgerEntry.create({
    userId,
    charityId,
    entryType: "independent_donation",
    amount: toCurrencyNumber(amount),
    source: "independent_donation",
    reference,
    metadata: {}
  });
};
