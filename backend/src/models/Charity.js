import mongoose from "mongoose";

const charitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    upcomingEvents: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Charity = mongoose.model("Charity", charitySchema);
