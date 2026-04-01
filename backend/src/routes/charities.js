import express from "express";
import { z } from "zod";
import { Charity } from "../models/Charity.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { recordIndependentDonationLedger } from "../services/financeService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const featuredOnly = String(req.query.featured || "false") === "true";

  const filter = { active: true };
  if (featuredOnly) {
    filter.featured = true;
  }
  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { upcomingEvents: { $elemMatch: { $regex: query, $options: "i" } } }
    ];
  }

  const charities = await Charity.find(filter).sort({ featured: -1, createdAt: -1 });
  return res.json({ charities });
});

router.get("/:id", async (req, res) => {
  const charity = await Charity.findById(req.params.id);
  if (!charity || !charity.active) {
    return res.status(404).json({ message: "Charity not found" });
  }

  return res.json({ charity });
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

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(2).optional(),
        description: z.string().trim().min(10).optional(),
        imageUrl: z
          .union([z.string().trim().url(), z.literal(""), z.null(), z.undefined()])
          .transform((value) => (typeof value === "string" && value.length > 0 ? value : ""))
          .optional(),
        upcomingEvents: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
        active: z.boolean().optional()
      })
      .parse(req.body);

    const charity = await Charity.findById(req.params.id);
    if (!charity) {
      return res.status(404).json({ message: "Charity not found" });
    }

    Object.assign(charity, parsed);
    await charity.save();

    return res.json({ charity });
  } catch (error) {
    return res.status(400).json({ message: "Invalid charity payload", details: error.message });
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const charity = await Charity.findById(req.params.id);
  if (!charity) {
    return res.status(404).json({ message: "Charity not found" });
  }

  charity.active = false;
  await charity.save();

  return res.json({ message: "Charity archived" });
});

router.post("/:id/donate", async (req, res) => {
  try {
    const parsed = z
      .object({
        donorName: z.string().trim().min(2),
        donorEmail: z.string().email(),
        amount: z.number().positive()
      })
      .parse(req.body);

    const charity = await Charity.findById(req.params.id);
    if (!charity || !charity.active) {
      return res.status(404).json({ message: "Charity not found" });
    }

    await recordIndependentDonationLedger({
      charityId: charity._id,
      amount: parsed.amount,
      reference: `${parsed.donorName}:${parsed.donorEmail}`
    });

    return res.status(201).json({
      message: "Donation recorded",
      donation: {
        charityId: charity._id,
        amount: parsed.amount,
        donorName: parsed.donorName,
        donorEmail: parsed.donorEmail
      }
    });
  } catch (error) {
    return res.status(400).json({ message: "Invalid donation payload", details: error.message });
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
