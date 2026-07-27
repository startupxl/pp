// Subscription billing: PayPal-backed checkout for Pro/Team, status lookup,
// cancellation, and the webhook that keeps our local `subscriptions` table
// in sync with what actually happened on PayPal's side (renewals, failed
// payments, cancellations) rather than trusting only the client-side
// confirm call.
import express from "express";
import { requireAuth } from "./auth.js";
import * as store from "./store.js";
import { planLimitsFor } from "./plans.js";
import * as paypal from "./paypal.js";
import { PayPalConfigError } from "./paypal.js";

const router = express.Router();

const PLAN_ID_BY_KEY = {
  pro: () => process.env.PAYPAL_PLAN_ID_PRO,
  team: () => process.env.PAYPAL_PLAN_ID_TEAM,
};

function appUrl() {
  return (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
}

// Public (no auth) — tells the client which PayPal client-id/env to load the
// JS SDK with, and whether billing is even configured yet.
router.get("/config", (req, res) => {
  res.json({
    configured: paypal.isPayPalConfigured(),
    clientId: process.env.PAYPAL_CLIENT_ID || null,
    env: process.env.PAYPAL_ENV || "sandbox",
  });
});

router.get("/status", requireAuth(), async (req, res, next) => {
  try {
    const subscription = await store.getSubscription(req.user.uid);
    const limits = planLimitsFor(subscription);
    res.json({
      plan: limits.plan,
      status: subscription?.status || "active",
      seats: subscription?.seats || 1,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      monthlyActions: limits.monthlyActions,
      unlimited: limits.unlimited,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/subscribe", requireAuth(), async (req, res, next) => {
  try {
    const { plan } = req.body;
    const planIdGetter = PLAN_ID_BY_KEY[plan];
    if (!planIdGetter) return res.status(400).json({ error: "plan must be 'pro' or 'team'" });
    const planId = planIdGetter();
    if (!planId) {
      return res.status(503).json({
        error: `Billing is not fully configured — set PAYPAL_PLAN_ID_${plan.toUpperCase()} on the server.`,
      });
    }

    const { id, approveUrl } = await paypal.createSubscription({
      planId,
      userId: req.user.uid,
      returnUrl: `${appUrl()}/billing?return=1`,
      cancelUrl: `${appUrl()}/billing?cancelled=1`,
    });

    // Record a pending row now so the webhook (which may arrive before the
    // user's browser redirect completes) can find this user.
    await store.upsertSubscription(req.user.uid, {
      plan,
      status: "pending",
      paypalSubscriptionId: id,
      paypalPlanId: planId,
    });

    res.json({ subscriptionId: id, approveUrl });
  } catch (err) {
    if (err instanceof PayPalConfigError) return res.status(503).json({ error: err.message });
    next(err);
  }
});

router.post("/confirm", requireAuth(), async (req, res, next) => {
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId) return res.status(400).json({ error: "subscriptionId is required" });

    const details = await paypal.getSubscription(subscriptionId);
    if (details.custom_id && details.custom_id !== req.user.uid) {
      return res.status(403).json({ error: "This subscription belongs to a different account." });
    }

    const active = details.status === "ACTIVE";
    const sub = await store.upsertSubscription(req.user.uid, {
      status: active ? "active" : details.status?.toLowerCase() || "pending",
      paypalSubscriptionId: subscriptionId,
      currentPeriodEnd: details.billing_info?.next_billing_time || null,
    });
    res.json({ plan: sub.plan, status: sub.status });
  } catch (err) {
    next(err);
  }
});

router.post("/cancel", requireAuth(), async (req, res, next) => {
  try {
    const subscription = await store.getSubscription(req.user.uid);
    if (!subscription?.paypalSubscriptionId) {
      return res.status(400).json({ error: "No active paid subscription to cancel." });
    }
    await paypal.cancelSubscription(subscription.paypalSubscriptionId);
    await store.upsertSubscription(req.user.uid, { status: "cancelled" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PayPal calls this directly — no user auth, verified via webhook signature
// instead. Configure this URL (https://app.principlepitch.com/api/billing/webhook)
// in the PayPal dashboard's webhook settings.
router.post("/webhook", async (req, res, next) => {
  try {
    const verified = await paypal.verifyWebhookSignature(req.headers, req.body);
    if (!verified) {
      console.warn("PayPal webhook: signature verification failed or PAYPAL_WEBHOOK_ID unset");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    const resource = event.resource || {};
    const paypalSubscriptionId = resource.id;
    if (!paypalSubscriptionId) return res.status(200).json({ ok: true });

    const sub = await store.getSubscriptionByPaypalId(paypalSubscriptionId);
    const userId = sub?.userId || resource.custom_id;
    if (!userId) return res.status(200).json({ ok: true });

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await store.upsertSubscription(userId, {
          status: "active",
          paypalSubscriptionId,
          currentPeriodEnd: resource.billing_info?.next_billing_time || null,
        });
        break;
      case "BILLING.SUBSCRIPTION.UPDATED":
        await store.upsertSubscription(userId, {
          currentPeriodEnd: resource.billing_info?.next_billing_time || null,
        });
        break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        await store.upsertSubscription(userId, { status: "cancelled" });
        break;
      default:
        break;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
