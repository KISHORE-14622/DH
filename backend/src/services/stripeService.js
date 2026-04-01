import Stripe from "stripe";

let stripeClient = null;

export const getStripeClient = () => {
  if (stripeClient) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia"
  });

  return stripeClient;
};

export const planToPrice = (plan) => {
  if (plan === "yearly") {
    return {
      unitAmount: 10000,
      interval: "year",
      name: "Drive For Good Yearly"
    };
  }

  return {
    unitAmount: 1000,
    interval: "month",
    name: "Drive For Good Monthly"
  };
};
