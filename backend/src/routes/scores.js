import express from "express";
import { z } from "zod";
import { applyRollingScores } from "../services/scoreService.js";
import { requireActiveSubscription, requireAuth } from "../middleware/auth.js";

const router = express.Router();

const scoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  playedAt: z.string().datetime()
});

router.get("/", requireAuth, requireActiveSubscription, async (req, res) => {
  return res.json({ scores: req.user.scores });
});

router.post("/", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const parsed = scoreSchema.parse(req.body);

    req.user.scores = applyRollingScores(req.user.scores, {
      score: parsed.score,
      playedAt: new Date(parsed.playedAt)
    });

    await req.user.save();

    return res.status(201).json({ scores: req.user.scores });
  } catch (error) {
    return res.status(400).json({ message: "Invalid score payload", details: error.message });
  }
});

router.put("/:id", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const parsed = scoreSchema.parse(req.body);
    const score = req.user.scores.id(req.params.id);

    if (!score) {
      return res.status(404).json({ message: "Score not found" });
    }

    score.score = parsed.score;
    score.playedAt = new Date(parsed.playedAt);
    req.user.scores = [...req.user.scores]
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, 5);

    await req.user.save();

    return res.json({ scores: req.user.scores });
  } catch (error) {
    return res.status(400).json({ message: "Invalid score payload", details: error.message });
  }
});

export default router;
