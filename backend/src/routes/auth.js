import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../services/notificationService.js";

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: parsed.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await User.create({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      role: "subscriber"
    });

    await sendWelcomeEmail(user.email, user.name);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.status(201).json({ token });
  } catch (error) {
    return res.status(400).json({ message: "Invalid payload", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      .parse(req.body);

    const user = await User.findOne({ email: parsed.email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(parsed.password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.json({ token });
  } catch (error) {
    return res.status(400).json({ message: "Invalid payload", details: error.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user.toObject();
  delete user.passwordHash;

  return res.json({ user });
});

export default router;
