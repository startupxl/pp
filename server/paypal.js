// Minimal PayPal Subscriptions (v1) client using native fetch — no SDK
// dependency, consistent with openai.js and auth.js in this backend.
// Docs: https://developer.paypal.com/docs/api/subscriptions/v1/
const API_BASE =
  (process.env.PAYPAL_ENV || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export class PayPalConfigError extends Error {}

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function requireConfigured() {
  if (!isPayPalConfigured()) {
    throw new PayPalConfigError(
      "Billing is not configured yet — set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the server."
    );
  }
}

let cachedToken = null; // { value, expiresAt }

async function getAccessToken() {
  requireConfigured();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PayPal auth failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function ppFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(json?.message || `PayPal request failed (${res.status})`);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

/**
 * Creates a subscription in PayPal for the given plan and returns the
 * subscription id plus the approval link the user must open to confirm
 * payment. custom_id carries our own userId so the webhook handler can
 * link the PayPal subscription back to a Principle Pitch account even
 * before /billing/confirm runs.
 */
export async function createSubscription({ planId, userId, returnUrl, cancelUrl }) {
  const json = await ppFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId,
      application_context: {
        brand_name: "Principle Pitch",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const approveLink = json.links?.find((l) => l.rel === "approve")?.href || null;
  return { id: json.id, status: json.status, approveUrl: approveLink };
}

export async function getSubscription(subscriptionId) {
  return ppFetch(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function cancelSubscription(subscriptionId, reason = "Cancelled by customer") {
  await ppFetch(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Verifies an incoming webhook's signature against PayPal's API. Requires
 * PAYPAL_WEBHOOK_ID (from the webhook's config page in the PayPal dashboard).
 */
export async function verifyWebhookSignature(headers, rawEvent) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  try {
    const json = await ppFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        transmission_id: headers["paypal-transmission-id"],
        transmission_time: headers["paypal-transmission-time"],
        cert_url: headers["paypal-cert-url"],
        auth_algo: headers["paypal-auth-algo"],
        transmission_sig: headers["paypal-transmission-sig"],
        webhook_id: webhookId,
        webhook_event: rawEvent,
      }),
    });
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
