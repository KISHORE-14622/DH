import express from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/users", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const subscriptionStatus = String(req.query.subscriptionStatus || "").trim();

  const filter = {};

  if (query) {
    filter.$or = [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }];
  }

  if (subscriptionStatus && ["inactive", "active", "canceled", "lapsed"].includes(subscriptionStatus)) {
    filter["subscription.status"] = subscriptionStatus;
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .select("name email role subscription charitySelection scores winningsTotal createdAt");

  return res.json({ users });
});

router.patch("/users/:id", async (req, res) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(2).optional(),
        role: z.enum(["subscriber", "admin"]).optional(),
        subscription: z
          .object({
            status: z.enum(["inactive", "active", "canceled", "lapsed"]).optional(),
            plan: z.enum(["monthly", "yearly"]).optional(),
            renewalDate: z.union([z.string().datetime(), z.null()]).optional()
          })
          .optional()
      })
      .parse(req.body);

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (parsed.name) {
      user.name = parsed.name;
    }

    if (parsed.role) {
      user.role = parsed.role;
    }

    if (parsed.subscription) {
      if (parsed.subscription.status) {
        user.subscription.status = parsed.subscription.status;
      }
      if (parsed.subscription.plan) {
        user.subscription.plan = parsed.subscription.plan;
      }
      if (Object.prototype.hasOwnProperty.call(parsed.subscription, "renewalDate")) {
        user.subscription.renewalDate = parsed.subscription.renewalDate ? new Date(parsed.subscription.renewalDate) : null;
      }
    }

    await user.save();

    return res.json({ user });
  } catch (error) {
    return res.status(400).json({ message: "Invalid payload", details: error.message });
  }
});

router.put("/users/:id/scores/:scoreId", async (req, res) => {
  try {
    const parsed = z
      .object({
        score: z.number().int().min(1).max(45),
        playedAt: z.string().datetime()
      })
      .parse(req.body);

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const score = user.scores.id(req.params.scoreId);

    if (!score) {
      return res.status(404).json({ message: "Score not found" });
    }

    score.score = parsed.score;
    score.playedAt = new Date(parsed.playedAt);
    user.scores = [...user.scores]
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, 5);

    await user.save();

    return res.json({ scores: user.scores });
  } catch (error) {
    return res.status(400).json({ message: "Invalid score payload", details: error.message });
  }
});

export default router;
