// Plan definitions and AI-assist allowances. Kept in one place so pricing
// changes only need to happen here (and in the marketing-site/index.html
// pricing section, which is a separate static file — keep both in sync by
// hand). Numbers match what's published on the marketing page.
export const PLAN_LIMITS = {
  free: { label: "Free", monthlyActions: 20, perSeat: false, unlimited: false },
  pro: { label: "Pro", monthlyActions: 150, perSeat: false, unlimited: false },
  team: { label: "Team", monthlyActions: 400, perSeat: true, unlimited: false },
  // Enterprise is sold as "pooled or unlimited" per the marketing page — treat
  // it as unlimited in-app until a real per-org pooled-quota system exists.
  enterprise: { label: "Enterprise", monthlyActions: null, perSeat: false, unlimited: true },
};

export const ADDON_PACKS = [
  { actions: 100, priceUsd: 5 },
  { actions: 500, priceUsd: 20 },
];

// A subscription row with no plan (or no row at all) defaults to free.
export function planLimitsFor(subscription) {
  const plan = subscription?.status === "active" ? subscription.plan : "free";
  const config = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const seats = subscription?.seats || 1;
  const monthlyActions = config.unlimited
    ? null
    : config.perSeat
    ? config.monthlyActions * seats
    : config.monthlyActions;
  return { plan, ...config, monthlyActions };
}

export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
