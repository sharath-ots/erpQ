import rateLimit from "@fastify/rate-limit";
import { env } from "../../config.js";

/**
 * Placeholder payment partner — own rate limit and route namespace for Stripe/Razorpay/etc.
 */
export async function paymentPartnerPlugin(app) {
  await app.register(rateLimit, {
    max: env.paymentPartnerRateMax,
    timeWindow: "1 minute",
    name: "payment-partner",
  });

  app.get("/health", async () => ({
    partner: "payment",
    status: "stub",
    message: "Register real payment routes here (each behind this scoped limiter).",
  }));
}
