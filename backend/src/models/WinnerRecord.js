import mongoose from "mongoose";

const winnerRecordSchema = new mongoose.Schema(
  {
    drawRunId: { type: mongoose.Schema.Types.ObjectId, ref: "DrawRun", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    matchCount: { type: Number, enum: [3, 4, 5], required: true },
    prizeAmount: { type: Number, required: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    payoutStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    proofUrl: { type: String, default: "" },
    reviewNote: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

winnerRecordSchema.index({ drawRunId: 1, userId: 1 }, { unique: true });

export const WinnerRecord = mongoose.model("WinnerRecord", winnerRecordSchema);
