import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    actions: 20,
    blurb: "For individuals exploring their first frameworks.",
  },
  {
    key: "pro",
    name: "Pro",
    price: "$19/mo",
    actions: 150,
    blurb: "For leaders and consultants who work in frameworks weekly.",
    featured: true,
  },
  {
    key: "team",
    name: "Team",
    price: "$39/user/mo",
    actions: 400,
    blurb: "For sales, consulting, and leadership teams working together.",
  },
];

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [usage, setUsage] = useState(null);
  const [billingConfigured, setBillingConfigured] = useState(true);
  const [busyPlan, setBusyPlan] = useState(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [s, u, c] = await Promise.all([
      api.getBillingStatus(),
      api.getAIUsage(),
      api.getBillingConfig(),
    ]);
    setStatus(s);
    setUsage(u);
    setBillingConfigured(c.configured);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  // Handle the redirect back from PayPal's hosted approval page.
  useEffect(() => {
    const subscriptionId = searchParams.get("subscription_id");
    if (subscriptionId) {
      api
        .confirmSubscription(subscriptionId)
        .then(() => {
          setMessage("Your subscription is confirmed. Thanks for upgrading!");
          setSearchParams({}, { replace: true });
          refresh().catch(() => {});
        })
        .catch((err) => setMessage(err.message || "Could not confirm the subscription."));
    } else if (searchParams.get("cancelled")) {
      setMessage("Checkout was cancelled — no changes were made.");
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe(planKey) {
    setBusyPlan(planKey);
    setMessage("");
    try {
      const res = await api.subscribeToPlan(planKey);
      window.location.href = res.approveUrl;
    } catch (err) {
      setMessage(err.message || "Could not start checkout.");
      setBusyPlan(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your paid plan? You'll drop to the Free tier's AI-assist allowance.")) return;
    setBusyPlan("cancel");
    setMessage("");
    try {
      await api.cancelSubscription();
      setMessage("Your subscription has been cancelled.");
      await refresh();
    } catch (err) {
      setMessage(err.message || "Could not cancel.");
    } finally {
      setBusyPlan(null);
    }
  }

  const currentPlan = status?.plan || "free";

  return (
    <Layout>
      <div className="max-w-[1000px] mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold text-primary mb-1">Plan & billing</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Every plan includes the full deterministic scoring engine. AI-assist allowances scale with the
          tier and reset each billing month.
        </p>

        {!billingConfigured && (
          <div className="mb-6 p-4 rounded-lg bg-primary-container/20 border border-primary/20 text-sm text-primary">
            Billing isn't fully configured yet — checkout is temporarily unavailable. Contact support if
            you'd like to upgrade in the meantime.
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 rounded-lg bg-secondary-container/30 border border-secondary/20 text-sm text-on-surface">
            {message}
          </div>
        )}

        {usage && (
          <div className="mb-8 bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-primary">This month's AI-assist usage</h3>
              <span className="text-xs font-semibold uppercase text-secondary">{currentPlan}</span>
            </div>
            {usage.unlimited ? (
              <p className="text-sm text-on-surface-variant">Unlimited (Enterprise)</p>
            ) : (
              <>
                <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden mb-1">
                  <div
                    className="h-full bg-secondary"
                    style={{
                      width: `${Math.min(100, (usage.used / (usage.monthlyActions + usage.addonBalance || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-on-surface-variant">
                  {usage.used} of {usage.monthlyActions + usage.addonBalance} actions used
                  {usage.addonBalance ? ` (includes ${usage.addonBalance} add-on)` : ""}
                </p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.key && status?.status === "active";
            return (
              <div
                key={p.key}
                className={`rounded-2xl border p-6 flex flex-col ${
                  p.featured ? "border-secondary shadow-[0_12px_30px_rgba(0,105,112,0.15)]" : "border-outline-variant"
                }`}
              >
                <h3 className="font-bold text-primary mb-1">{p.name}</h3>
                <p className="text-2xl font-extrabold text-primary mb-2">{p.price}</p>
                <p className="text-xs text-on-surface-variant mb-4">{p.blurb}</p>
                <p className="text-sm flex items-center gap-1.5 mb-6">
                  <Icon name="smart_toy" className="text-secondary text-[18px]" />
                  {p.actions} AI-assist actions / month
                </p>
                <div className="mt-auto">
                  {isCurrent ? (
                    <span className="block text-center text-xs font-semibold uppercase text-secondary py-2.5">
                      Current plan
                    </span>
                  ) : p.key === "free" ? (
                    <span className="block text-center text-xs text-on-surface-variant py-2.5">
                      Default tier
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(p.key)}
                      disabled={!billingConfigured || busyPlan === p.key}
                      className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {busyPlan === p.key ? "Redirecting…" : `Get ${p.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {currentPlan !== "free" && status?.status === "active" && (
          <button
            onClick={handleCancel}
            disabled={busyPlan === "cancel"}
            className="text-sm font-semibold text-error hover:underline"
          >
            {busyPlan === "cancel" ? "Cancelling…" : "Cancel my subscription"}
          </button>
        )}

        <p className="text-xs text-on-surface-variant mt-8">
          Need more AI-assist actions without upgrading tiers? Add-on packs (+100 for $5, +500 for $20)
          are available on Pro and Team — contact support to add one to your account.
        </p>
      </div>
    </Layout>
  );
}
