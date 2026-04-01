import express from "express";
import multer from "multer";
import { WinnerRecord } from "../models/WinnerRecord.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { sendPayoutEmail, sendWinnerReviewEmail } from "../services/notificationService.js";
import { storeWinnerProof } from "../services/fileStorageService.js";
import { recordPayoutLedger } from "../services/financeService.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }

    cb(null, true);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const winners = await WinnerRecord.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.json({ winners });
});

router.post("/:id/proof", requireAuth, upload.single("proof"), async (req, res) => {
  const winner = await WinnerRecord.findOne({ _id: req.params.id, userId: req.user._id });

  if (!winner) {
    return res.status(404).json({ message: "Winner record not found" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Proof file is required" });
  }

  const stored = await storeWinnerProof(req.file);

  winner.proofUrl = stored.proofUrl;
  winner.verificationStatus = "pending";
  await winner.save();

  return res.json({ winner });
});

router.get("/admin", requireAuth, requireRole("admin"), async (_req, res) => {
  const winners = await WinnerRecord.find({}).populate("userId", "name email").sort({ createdAt: -1 });
  return res.json({ winners });
});

router.post("/:id/review", requireAuth, requireRole("admin"), async (req, res) => {
  const decision = req.body.decision === "approve" ? "approved" : "rejected";
  const winner = await WinnerRecord.findById(req.params.id);

  if (!winner) {
    return res.status(404).json({ message: "Winner record not found" });
  }

  winner.verificationStatus = decision;
  winner.reviewNote = req.body.reviewNote || "";
  winner.approvedAt = decision === "approved" ? new Date() : null;

  await winner.save();

  const user = await User.findById(winner.userId).select("email");
  if (user?.email) {
    await sendWinnerReviewEmail(user.email, decision, winner.reviewNote);
  }

  return res.json({ winner });
});

router.post("/:id/mark-paid", requireAuth, requireRole("admin"), async (req, res) => {
  const winner = await WinnerRecord.findById(req.params.id);

  if (!winner) {
    return res.status(404).json({ message: "Winner record not found" });
  }

  if (winner.verificationStatus !== "approved") {
    return res.status(400).json({ message: "Winner must be approved before payout" });
  }

  if (winner.payoutStatus !== "paid") {
    winner.payoutStatus = "paid";
    winner.paidAt = new Date();
    await winner.save();

    await User.updateOne({ _id: winner.userId }, { $inc: { winningsTotal: winner.prizeAmount } });

    await recordPayoutLedger({
      winnerRecordId: winner._id,
      drawRunId: winner.drawRunId,
      userId: winner.userId,
      amount: winner.prizeAmount
    });

    const user = await User.findById(winner.userId).select("email");
    if (user?.email) {
      await sendPayoutEmail(user.email, winner.prizeAmount);
    }
  }

  return res.json({ winner });
});

router.use((error, _req, res, next) => {
  if (!error) {
    return next();
  }

  if (error.message.includes("Only image files") || error.message.includes("File too large")) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "File upload failed" });
});

export default router;
