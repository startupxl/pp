import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const PAYBACK_MONTHS = [1, 3, 6, 9, 12, 18, 24];

// Same core formulas as the original mockup's calculateEconomics(): simplified
// LTV = AOV / monthly churn rate, CAC = spend / new customers, ratio = LTV/CAC.
function computeEconomics(data) {
  const aov = Number(data.aov) || 0;
  const churnPct = Number(data.churnPct) || 0;
  const churn = churnPct / 100;
  const spend = Number(data.monthlySpend) || 0;
  const customers = Number(data.newCustomers) || 1;

  const ltv = churn > 0 ? aov / churn : aov * 100;
  const cac = spend / customers;
  const ratio = cac > 0 ? ltv / cac : 0;

  let status = "At Risk";
  let barWidth = 20;
  if (ratio >= 5) {
    status = "Unicorn";
    barWidth = 95;
  } else if (ratio >= 3) {
    status = "Healthy";
    barWidth = 75;
  } else if (ratio >= 2) {
    status = "Moderate";
    barWidth = 45;
  }

  let retentionDelta = null;
  if (churnPct > 1) {
    const newChurn = (churnPct - 1) / 100;
    const newLtv = aov / newChurn;
    retentionDelta = newLtv - ltv;
  }

  const paybackMonths = aov > 0 ? cac / aov : Infinity;
  const payback = PAYBACK_MONTHS.map((m) => {
    const fraction = paybackMonths === Infinity ? 0 : Math.min(1, m / paybackMonths);
    return { month: m, fraction, recouped: fraction >= 1 };
  });

  return { ltv, cac, ratio, status, barWidth, retentionDelta, paybackMonths, payback, churnPct };
}

export default function UnitEconomics() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
    });
  }, [id]);

  function scheduleSave(patch) {
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = await api.updateDocument(id, patch);
      setDoc(updated);
      setSaveState("Saved");
    }, 500);
  }

  function updateData(patch) {
    const nextData = { ...doc.data, ...patch };
    setDoc((d) => ({ ...d, data: nextData }));
    scheduleSave({ data: nextData });
  }

  function onTitleBlur() {
    if (title !== doc.title) scheduleSave({ title });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading unit economics model…</div>
      </Layout>
    );
  }

  const data = doc.data || {};
  const econ = computeEconomics(data);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Unit Economics Workshop
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <p className="text-on-surface-variant max-w-2xl mb-8">
          Master your growth engine by analyzing the relationship between customer lifetime value
          and acquisition costs.
        </p>

        <div className="grid grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-xl p-8 border border-outline-variant shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Icon name="calculate" className="p-2 bg-primary-container text-primary-fixed rounded-lg" />
              <h3 className="text-lg font-bold text-primary">Metric Inputs</h3>
            </div>
            <div>
              <label className="block text-xs uppercase text-outline mb-2">Average Order Value (AOV)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">$</span>
                <input
                  type="number"
                  value={data.aov ?? ""}
                  onChange={(e) => updateData({ aov: Number(e.target.value) })}
                  className="w-full bg-white border border-outline-variant rounded-xl py-3 pl-8 pr-4 text-xl font-bold text-primary outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-outline mb-2">Monthly Churn Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={data.churnPct ?? ""}
                  onChange={(e) => updateData({ churnPct: Number(e.target.value) })}
                  className="w-full bg-white border border-outline-variant rounded-xl py-3 px-4 text-xl font-bold text-primary outline-none focus:border-secondary"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-outline mb-2">Monthly Marketing Spend</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">$</span>
                <input
                  type="number"
                  value={data.monthlySpend ?? ""}
                  onChange={(e) => updateData({ monthlySpend: Number(e.target.value) })}
                  className="w-full bg-white border border-outline-variant rounded-xl py-3 pl-8 pr-4 text-xl font-bold text-primary outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-outline mb-2">New Customers Acquired</label>
              <input
                type="number"
                value={data.newCustomers ?? ""}
                onChange={(e) => updateData({ newCustomers: Number(e.target.value) })}
                className="w-full bg-white border border-outline-variant rounded-xl py-3 px-4 text-xl font-bold text-primary outline-none focus:border-secondary"
              />
            </div>
          </div>

          {/* Visualization */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs uppercase text-outline">Customer LTV</span>
                  <Icon name="trending_up" className="text-secondary" />
                </div>
                <div className="text-3xl font-bold text-primary">${Math.round(econ.ltv).toLocaleString()}</div>
                <div className="text-xs text-on-surface-variant mt-2">Lifetime revenue per user</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs uppercase text-outline">Blended CAC</span>
                  <Icon name="payments" className="text-error" />
                </div>
                <div className="text-3xl font-bold text-primary">${Math.round(econ.cac).toLocaleString()}</div>
                <div className="text-xs text-on-surface-variant mt-2">Cost to acquire one user</div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="text-xs uppercase text-outline tracking-widest">Efficiency Ratio</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-extrabold text-primary">{econ.ratio.toFixed(1)}x</span>
                  <span className={`text-xl font-bold ${econ.ratio >= 3 ? "text-secondary" : "text-error"}`}>
                    {econ.status}
                  </span>
                </div>
                <div className="w-full max-w-md h-3 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${econ.ratio >= 3 ? "bg-secondary" : "bg-error"}`}
                    style={{ width: `${econ.barWidth}%` }}
                  />
                </div>
                <div className="flex justify-between w-full max-w-md text-xs text-outline">
                  <span>Risk (&lt;1x)</span>
                  <span>Healthy (3x+)</span>
                  <span>Elite (5x+)</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="lightbulb" className="text-secondary" />
                Strategic Recommendations
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-container-low">
                  <Icon name={econ.ratio >= 3 ? "check_circle" : "warning"} className={econ.ratio >= 3 ? "text-secondary mt-0.5" : "text-error mt-0.5"} />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {econ.ratio >= 3 ? "Scale Ad Spend" : "Improve Unit Economics First"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {econ.ratio >= 3
                        ? "Your LTV/CAC ratio is above 3x. Increasing marketing spend will likely yield healthy ROI."
                        : "Your LTV/CAC ratio is below the 3x baseline — reduce CAC or improve retention before scaling spend."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-container-low">
                  <Icon name="check_circle" className="text-secondary mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Focus on Retention</p>
                    <p className="text-xs text-on-surface-variant">
                      {econ.retentionDelta !== null
                        ? `Reducing churn by 1 point would increase LTV by an estimated $${Math.round(econ.retentionDelta).toLocaleString()} per customer.`
                        : "Churn rate is already at or below 1% — retention is a minor lever here."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2 bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary">Cohort Payback Projection</h3>
              <div className="flex gap-3 text-xs text-outline">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error" /> Pre-payback</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> Recouped</span>
              </div>
            </div>
            <div className="flex items-end justify-between h-56 gap-2 px-2">
              {econ.payback.map((p) => (
                <div key={p.month} className="w-full flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${p.recouped ? "bg-secondary" : "bg-error/50"}`}
                    style={{ height: `${Math.max(4, p.fraction * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-outline">
              {econ.payback.map((p) => (
                <span key={p.month}>Month {p.month}</span>
              ))}
            </div>
            <p className="text-sm text-on-surface-variant mt-4">
              {econ.paybackMonths === Infinity
                ? "Set an AOV to compute payback period."
                : `Estimated payback period: ${econ.paybackMonths.toFixed(1)} months.`}
            </p>
          </div>
          <div className="bg-primary-container text-white rounded-xl p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-3">The Golden Rule</h3>
              <p className="text-sm text-white/70 mb-5">
                In high-growth SaaS, a ratio of 3.0x is considered the baseline for a sustainable
                business model.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-sm">LTV/CAC &gt; 3.0x</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-sm">Payback &lt; 12 Months</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-sm">Churn &lt; 2% Monthly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
