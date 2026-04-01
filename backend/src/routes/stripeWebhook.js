import express from "express";
import { StripeEventLog } from "../models/StripeEventLog.js";
import { getStripeClient } from "../services/stripeService.js";
import { processStripeEvent } from "./subscriptions.js";

const router = express.Router();

router.post("/", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const stripeClient = getStripeClient();
    if (!stripeClient || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ message: "Stripe webhook is not configured" });
    }

    const signatureHeader = req.headers["stripe-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature) {
      return res.status(400).json({ message: "Webhook error", details: "Missing stripe-signature header" });
    }

    const payload = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));

    const event = stripeClient.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

    const exists = await StripeEventLog.findOne({ eventId: event.id });
    if (exists) {
      return res.json({ received: true, duplicate: true });
    }

    await processStripeEvent(event);

    await StripeEventLog.create({
      eventId: event.id,
      eventType: event.type,
      status: "processed"
    });

    return res.json({ received: true });
  } catch (error) {
    await StripeEventLog.create({
      eventId: `failed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: "webhook.validation",
      status: "failed",
      details: error.message
    });

    return res.status(400).json({ message: "Webhook error", details: error.message });
  }
});

export default router;
