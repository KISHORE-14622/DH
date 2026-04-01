import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    charityId: { type: mongoose.Schema.Types.ObjectId, ref: "Charity", default: null, index: true },
    drawRunId: { type: mongoose.Schema.Types.ObjectId, ref: "DrawRun", default: null, index: true },
    winnerRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "WinnerRecord", default: null, index: true },
    entryType: {
      type: String,
      enum: [
        "subscription_income",
        "prize_pool_allocation",
        "charity_allocation",
        "platform_revenue",
        "draw_prize_commitment",
        "payout_outflow"
      ],
      required: true,
      index: true
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    source: { type: String, default: "system" },
    reference: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);
