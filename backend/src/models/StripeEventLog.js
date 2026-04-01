import mongoose from "mongoose";

const stripeEventLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    processedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["processed", "ignored", "failed"], default: "processed" },
    details: { type: String, default: "" }
  },
  { timestamps: true }
);

export const StripeEventLog = mongoose.model("StripeEventLog", stripeEventLogSchema);
