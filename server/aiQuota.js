// Express middleware that resolves the caller's plan + this month's AI-assist
// usage, blocks the request with 402 if they're out of allowance, and
// attaches req.aiQuota so the route handler can record usage after a
// successful (billable) AI call. Must run after requireAuth().
import * as store from "./store.js";
import { planLimitsFor, currentPeriod } from "./plans.js";

export function requireAIQuota(cost = 1) {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const subscription = await store.getSubscription(userId);
      const limits = planLimitsFor(subscription);
      const period = currentPeriod();
      const usage = await store.getUsage(userId, period);

      const remaining = limits.unlimited
        ? Infinity
        : limits.monthlyActions + usage.addonBalance - usage.used;

      if (!limits.unlimited && remaining < cost) {
        return res.status(402).json({
          error: "AI-assist allowance used up for this billing period.",
          code: "AI_QUOTA_EXCEEDED",
          plan: limits.plan,
          monthlyActions: limits.monthlyActions,
          used: usage.used,
          addonBalance: usage.addonBalance,
        });
      }

      req.aiQuota = { userId, period, plan: limits.plan, limits, usage, cost };
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Call once an AI response has actually been generated (don't charge for
// failed upstream calls).
export async function recordAIUsage(req, { feature, tool, tokensIn, tokensOut } = {}) {
  const { userId, period, cost } = req.aiQuota;
  await store.incrementUsage(userId, period, cost);
  await store.logAIUsage({ userId, feature, tool, tokensIn, tokensOut }).catch(() => {});
}
