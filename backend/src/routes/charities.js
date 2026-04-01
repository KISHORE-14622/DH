import express from "express";
import { z } from "zod";
import { Charity } from "../models/Charity.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const charities = await Charity.find({ active: true }).sort({ featured: -1, createdAt: -1 });
  return res.json({ charities });
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(2),
        description: z.string().trim().min(10),
        imageUrl: z
          .union([z.string().trim().url(), z.literal(""), z.null(), z.undefined()])
          .transform((value) => (typeof value === "string" && value.length > 0 ? value : undefined)),
        upcomingEvents: z.array(z.string()).optional(),
        featured: z.boolean().optional()
      })
      .parse(req.body);

    const created = await Charity.create(parsed);
    return res.status(201).json({ charity: created });
  } catch (error) {
    return res.status(400).json({ message: "Invalid charity payload", details: error.message });
  }
});

router.post("/select", requireAuth, async (req, res) => {
  try {
    const parsed = z
      .object({
        charityId: z.string().min(1),
        contributionPercentage: z.number().min(10).max(100)
      })
      .parse(req.body);

    const charity = await Charity.findById(parsed.charityId);
    if (!charity || !charity.active) {
      return res.status(404).json({ message: "Charity not found" });
    }

    req.user.charitySelection = {
      charityId: charity._id,
      contributionPercentage: parsed.contributionPercentage
    };

    await req.user.save();

    return res.json({ charitySelection: req.user.charitySelection });
  } catch (error) {
    return res.status(400).json({ message: "Invalid charity selection payload", details: error.message });
  }
});

export default router;
