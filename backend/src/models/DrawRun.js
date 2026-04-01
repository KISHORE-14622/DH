import mongoose from "mongoose";

const drawRunSchema = new mongoose.Schema(
  {
    monthKey: { type: String, required: true, unique: true },
    mode: { type: String, enum: ["random", "algorithmic"], required: true },
    winningNumbers: { type: [Number], required: true },
    simulated: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    winnerCounts: {
      match5: { type: Number, default: 0 },
      match4: { type: Number, default: 0 },
      match3: { type: Number, default: 0 }
    },
    prizePool: {
      total: { type: Number, default: 0 },
      tier5: { type: Number, default: 0 },
      tier4: { type: Number, default: 0 },
      tier3: { type: Number, default: 0 },
      rollover: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const DrawRun = mongoose.model("DrawRun", drawRunSchema);
