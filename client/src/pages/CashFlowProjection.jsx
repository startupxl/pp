import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function fmtMoney(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

function defaultData() {
  return {
    startingBalance: 24500,
    months: [
      { id: "m1", label: "Aug", inflow: 14500, outflow: 11200, forecast: false },
      { id: "m2", label: "Sep", inflow: 12000, outflow: 13400, forecast: false },
      { id: "m3", label: "Oct", inflow: 9000, outflow: 22000, forecast: false },
      { id: "m4", label: "Nov", inflow: 15000, outflow: 10500, forecast: true },
    ],
    lowCashThreshold: 5000,
    paymentDelayDays: 0,
    costIncreasePct: 0,
  };
}

const LOW_CASH_DEFAULT = 5000;

// Deterministic heuristic — no external LLM call.
function analyzeCashFlow(data) {
  const months = data.months || [];
  const threshold = Number(data.lowCashThreshold ?? LOW_CASH_DEFAULT);
  const delayDays = Number(data.paymentDelayDays || 0);
  const costIncreasePct = Number(data.costIncreasePct || 0);

  let balance = Number(data.startingBalance || 0);
  const rows = months.map((m) => {
    const inflow = Number(m.inflow || 0);
    const outflow = Number(m.outflow || 0) * (1 + costIncreasePct / 100);
    const net = inflow - outflow;
    balance += net;
    const status = balance < 0 ? "Alert" : balance < threshold ? "Alert" : net < 0 ? "Stable" : "Healthy";
    return { ...m, inflow, outflow, net, balance, status };
  });

  const lowCashRow = rows.find((r) => r.balance < threshold);
  const last = rows[rows.length - 1];
  const netFlow30d = last ? last.net : 0;

  // Sensitivity: payment delay pushes back ~1/30th of monthly inflow per delay day out of the runway calc.
  const avgInflow = rows.length ? rows.reduce((s, r) => s + r.inflow, 0) / rows.length : 0;
  const delayImpact = (avgInflow / 30) * delayDays;
  const avgNetBurn = rows.length
    ? -(rows.reduce((s, r) => s + r.net, 0) / rows.length)
    : 0;
  const adjustedBurn = avgNetBurn + (avgInflow * (costIncreasePct / 100)) / Math.max(1, rows.length ? 1 : 1);
  const baseRunway = avgNetBurn > 0 ? balance / avgNetBurn : Infinity;
  const adjustedRunway =
    adjustedBurn > 0 ? (balance - delayImpact) / adjustedBurn : Infinity;
  const runwayImpactMonths =
    baseRunway === Infinity || adjustedRunway === Infinity ? 0 : adjustedRunway - baseRunway;

  return {
    rows,
    endingBalance: balance,
    lowCashRow,
    netFlow30d,
    avgInflow,
    avgOutflow: rows.length ? rows.reduce((s, r) => s + r.outflow, 0) / rows.length : 0,
    baseRunway,
    adjustedRunway,
    runwayImpactMonths,
    minReserve: Math.max(0, threshold - delayImpact),
  };
}

export default function CashFlowProjection() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newMonth, setNewMonth] = useState({ label: "", inflow: "", outflow: "" });
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc({ ...d, data: { ...defaultData(), ...(d.data || {}) } });
      setTitle(d.title);
    });
  }, [id]);

  function scheduleSave(patch) {
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.updateDocument(id, patch);
      setSaveState("Saved");
    }, 500);
  }

  function updateData(patch) {
    setDoc((d) => {
      const data = { ...d.data, ...patch };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function onTitleBlur() {
    if (doc && title !== doc.title) scheduleSave({ title });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading cash flow projection…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeCashFlow(data);

  function addMonth() {
    if (!newMonth.label.trim()) return;
    updateData({
      months: [
        ...data.months,
        { id: `m${Date.now()}`, label: newMonth.label.trim(), inflow: Number(newMonth.inflow) || 0, outflow: Number(newMonth.outflow) || 0, forecast: true },
      ],
    });
    setNewMonth({ label: "", inflow: "", outflow: "" });
  }

  function removeMonth(mid) {
    updateData({ months: data.months.filter((m) => m.id !== mid) });
  }

  function updateMonth(mid, patch) {
    updateData({ months: data.months.map((m) => (m.id === mid ? { ...m, ...patch } : m)) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Cash Flow Projection</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        {analysis.lowCashRow && (
          <div className="bg-error-container/40 text-on-error-container p-4 rounded-xl flex items-center gap-4 border border-error/20 mb-6">
            <Icon name="warning" className="text-error" filled />
            <div className="flex-1">
              <p className="text-sm font-bold">Low Cash Warning</p>
              <p className="text-xs">
                Projected balance falls below {fmtMoney(Number(data.lowCashThreshold))} in {analysis.lowCashRow.label} ({fmtMoney(analysis.lowCashRow.balance)}).
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm flex flex-col gap-4">
            <label className="block">
              <span className="text-xs uppercase text-on-surface-variant">Starting Balance</span>
              <input
                type="number"
                value={data.startingBalance}
                onChange={(e) => updateData({ startingBalance: Number(e.target.value) })}
                className="w-full mt-1 border border-outline-variant rounded-lg p-2.5 text-lg font-bold outline-none focus:border-secondary"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase text-on-surface-variant">Low Cash Threshold</span>
              <input
                type="number"
                value={data.lowCashThreshold}
                onChange={(e) => updateData({ lowCashThreshold: Number(e.target.value) })}
                className="w-full mt-1 border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary"
              />
            </label>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-outline-variant">
              <div className="text-center">
                <p className="text-xs text-on-surface-variant">Avg Inflow</p>
                <p className="font-bold text-secondary">{fmtMoney(analysis.avgInflow)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-on-surface-variant">Avg Outflow</p>
                <p className="font-bold text-error">{fmtMoney(analysis.avgOutflow)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-on-surface-variant">Ending Balance</p>
                <p className="font-bold text-primary">{fmtMoney(analysis.endingBalance)}</p>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-primary text-white rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Icon name="science" className="text-secondary-fixed" />
              <h3 className="font-bold">Sensitivity Analysis</h3>
            </div>
            <label className="block">
              <div className="flex justify-between text-sm mb-1">
                <span>Payment Delay (Days)</span>
                <span className="text-secondary-fixed">{data.paymentDelayDays} days</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={data.paymentDelayDays}
                onChange={(e) => updateData({ paymentDelayDays: Number(e.target.value) })}
                className="w-full accent-secondary"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-sm mb-1">
                <span>Cost Increase (%)</span>
                <span className="text-secondary-fixed">{data.costIncreasePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={data.costIncreasePct}
                onChange={(e) => updateData({ costIncreasePct: Number(e.target.value) })}
                className="w-full accent-secondary"
              />
            </label>
            <div className="pt-3 border-t border-white/20 flex flex-wrap justify-between gap-3 text-sm">
              <div>
                <span className="opacity-70">Runway Impact: </span>
                <span className="font-bold text-error-container">
                  {analysis.runwayImpactMonths === 0 ? "None" : `${analysis.runwayImpactMonths.toFixed(1)} months`}
                </span>
              </div>
              <div>
                <span className="opacity-70">Min. Cash Reserve: </span>
                <span className="font-bold">{fmtMoney(analysis.minReserve)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-primary">Monthly Projections</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Inflows</th>
                  <th className="px-4 py-3">Outflows</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {analysis.rows.map((r) => (
                  <tr key={r.id} className={r.status === "Alert" ? "bg-error/5" : ""}>
                    <td className="px-4 py-3 font-bold">
                      <input
                        value={r.label}
                        onChange={(e) => updateMonth(r.id, { label: e.target.value })}
                        className="bg-transparent outline-none w-16"
                      />
                      {r.forecast && <span className="text-xs text-on-surface-variant italic"> (F)</span>}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      <input
                        type="number"
                        value={r.inflow}
                        onChange={(e) => updateMonth(r.id, { inflow: Number(e.target.value) })}
                        className="bg-transparent outline-none w-24"
                      />
                    </td>
                    <td className="px-4 py-3 text-error">
                      <input
                        type="number"
                        value={r.outflow}
                        onChange={(e) => updateMonth(r.id, { outflow: Number(e.target.value) })}
                        className="bg-transparent outline-none w-24"
                      />
                    </td>
                    <td className={`px-4 py-3 font-medium ${r.net < 0 ? "text-error" : "text-secondary"}`}>{fmtMoney(r.net)}</td>
                    <td className={`px-4 py-3 font-bold ${r.balance < Number(data.lowCashThreshold) ? "text-error" : ""}`}>{fmtMoney(r.balance)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          r.status === "Alert" ? "bg-error-container text-on-error-container" : r.status === "Healthy" ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeMonth(r.id)} className="text-on-surface-variant hover:text-error">
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface-container-low flex gap-2 items-center">
            <input value={newMonth.label} onChange={(e) => setNewMonth((v) => ({ ...v, label: e.target.value }))} placeholder="Month" className="w-24 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <input type="number" value={newMonth.inflow} onChange={(e) => setNewMonth((v) => ({ ...v, inflow: e.target.value }))} placeholder="Inflow $" className="w-28 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <input type="number" value={newMonth.outflow} onChange={(e) => setNewMonth((v) => ({ ...v, outflow: e.target.value }))} placeholder="Outflow $" className="w-28 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <button onClick={addMonth} className="px-3 py-1.5 bg-primary text-white rounded-md flex items-center gap-1 text-sm">
              <Icon name="add" className="text-[16px]" /> Add Month
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
