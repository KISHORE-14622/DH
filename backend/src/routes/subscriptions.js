import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { getStripeClient, planToPrice } from "../services/stripeService.js";
import { sendSubscriptionStatusEmail } from "../services/notificationService.js";
import { recordSubscriptionLedger } from "../services/financeService.js";

const router = express.Router();

const resolveRenewalDate = (currentPeriodEnd) => {
  if (!currentPeriodEnd) {
    return null;
  }

  return new Date(currentPeriodEnd * 1000);
};

const processStripeEvent = async (event) => {
  if (!event?.id || !event?.type) {
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      return;
    }

    const plan = session.metadata?.plan === "yearly" ? "yearly" : "monthly";

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          "subscription.plan": plan,
          "subscription.status": "active",
          "subscription.stripeCustomerId": session.customer || null,
          "subscription.stripeSubscriptionId": session.subscription || null
        }
      }
    );

    const user = await User.findById(userId).select("email subscription");
    const fullUser = await User.findById(userId).select("email subscription charitySelection");

    if (fullUser?._id) {
      await recordSubscriptionLedger({
        user: fullUser,
        plan,
        source: "stripe_checkout"
      });
    }

    if (user?.email) {
      await sendSubscriptionStatusEmail(user.email, "active", plan);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const status = subscription.status;
    const mappedStatus = status === "active" || status === "trialing" ? "active" : "lapsed";
    const plan = subscription.items?.data?.[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";

    await User.updateOne(
      { "subscription.stripeSubscriptionId": subscription.id },
      {
        $set: {
          "subscription.status": mappedStatus,
          "subscription.plan": plan,
          "subscription.renewalDate": resolveRenewalDate(subscription.current_period_end)
        }
      }
    );

    const user = await User.findOne({ "subscription.stripeSubscriptionId": subscription.id }).select("email");
    if (user?.email) {
      await sendSubscriptionStatusEmail(user.email, mappedStatus, plan);
    }
  }
};

router.post("/checkout-session", requireAuth, async (req, res) => {
  const plan = req.body.plan === "yearly" ? "yearly" : "monthly";
  const stripeClient = getStripeClient();

  if (!stripeClient) {
    return res.status(503).json({ message: "Stripe is not configured" });
  }

  const price = planToPrice(plan);
  const baseUrl = process.env.APP_URL || "http://localhost:5173";

  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?billing=success`,
      cancel_url: `${baseUrl}/dashboard?billing=cancel`,
      client_reference_id: String(req.user._id),
      customer_email: req.user.email,
      metadata: {
        userId: String(req.user._id),
        plan
      },
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: price.name
            },
            recurring: {
              interval: price.interval
            },
            unit_amount: price.unitAmount * 100
          },
          quantity: 1
        }
      ]
    });

    return res.json({ url: session.url });
  } catch (error) {
    return res.status(400).json({ message: "Failed to create checkout session", details: error.message });
  }
});

router.post("/cancel", requireAuth, async (req, res) => {
  const stripeClient = getStripeClient();

  if (!stripeClient) {
    return res.status(503).json({ message: "Stripe is not configured" });
  }

  if (!req.user.subscription.stripeSubscriptionId) {
    return res.status(400).json({ message: "No active Stripe subscription found" });
  }

  try {
    await stripeClient.subscriptions.update(req.user.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    req.user.subscription.status = "canceled";
    await req.user.save();

    await sendSubscriptionStatusEmail(req.user.email, "canceled", req.user.subscription.plan);

    return res.json({ subscription: req.user.subscription });
  } catch (error) {
    return res.status(400).json({ message: "Failed to cancel subscription", details: error.message });
  }
});

router.post("/mock-activate", requireAuth, async (req, res) => {
  const plan = req.body.plan === "yearly" ? "yearly" : "monthly";
  const renewalDate = new Date();

  if (plan === "yearly") {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }

  req.user.subscription = {
    ...req.user.subscription,
    plan,
    status: "active",
    renewalDate
  };

  await req.user.save();

  await recordSubscriptionLedger({
    user: req.user,
    plan,
    source: "mock_activate"
  });

  await sendSubscriptionStatusEmail(req.user.email, "active", plan);

  return res.json({
    message: "Subscription activated in dev mode",
    subscription: req.user.subscription
  });
});

router.post("/mock-lapse", requireAuth, async (req, res) => {
  req.user.subscription = {
    ...req.user.subscription,
    status: "lapsed"
  };

  await req.user.save();

  await sendSubscriptionStatusEmail(req.user.email, "lapsed", req.user.subscription.plan);

  return res.json({
    message: "Subscription moved to lapsed",
    subscription: req.user.subscription
  });
});

export { processStripeEvent };

export default router;
