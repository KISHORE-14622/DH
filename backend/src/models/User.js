import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 1, max: 45, required: true },
    playedAt: { type: Date, required: true }
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["subscriber", "admin"],
      default: "subscriber"
    },
    subscription: {
      plan: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
      status: {
        type: String,
        enum: ["inactive", "active", "canceled", "lapsed"],
        default: "inactive"
      },
      renewalDate: { type: Date, default: null },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null }
    },
    charitySelection: {
      charityId: { type: mongoose.Schema.Types.ObjectId, ref: "Charity", default: null },
      contributionPercentage: { type: Number, min: 10, max: 100, default: 10 }
    },
    scores: { type: [scoreSchema], default: [] },
    winningsTotal: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
