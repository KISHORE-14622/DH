import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    toEmail: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    template: { type: String, default: "generic" },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    details: { type: String, default: "" }
  },
  { timestamps: true }
);

export const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);
