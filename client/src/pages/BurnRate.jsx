import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function fmtMoney(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function analyzeBurn(data) {
  const fixed = data.fixedCosts || [];
  const variable = data.variableCosts || [];
  const totalFixed = fixed.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalVariable = variable.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalExpenses = totalFixed + totalVariable;
  const revenue = Number(data.monthlyRevenue || 0);
  const netBurn = totalExpenses - revenue;
  const cash = Number(data.cashBalance || 0);
  const runwayMonths = netBurn > 0 ? cash / netBurn : Infinity;

  const allItems = [...fixed.map((c) => ({ ...c, type: "Fixed" })), ...variable.map((c) => ({ ...c, type: "Variable" }))];
  const largest = allItems.length ? [...allItems].sort((a, b) => b.amount - a.amount)[0] : null;

  let optimization = null;
  if (largest && netBurn > 0) {
    const reduction = Number(largest.amount) * 0.1;
    const newBurn = netBurn - reduction;
    const newRunway = newBurn > 0 ? cash / newBurn : Infinity;
    const addedMonths = newRunway === Infinity ? null : newRunway - runwayMonths;
    optimization = { item: largest, reduction, addedMonths };
  }

  // Projected cash balance over next 12 months.
  const projection = [];
  let bal = cash;
  for (let m = 0; m <= 12; m++) {
    projection.push(Math.max(0, bal));
    bal -= netBurn;
  }

  return { totalFixed, totalVariable, totalExpenses, netBurn, runwayMonths, optimization, projection, revenue };
}

export default function BurnRate() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newCost, setNewCost] = useState({ fixed: { label: "", amount: "" }, variable: { label: "", amount: "" } });
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
        <div className="p-10 text-on-surface-variant">Loading burn rate model…</div>
      </Layout>
    );
  }

  const data = doc.data || {};
  const fixed = data.fixedCosts || [];
  const variable = data.variableCosts || [];
  const analysis = analyzeBurn(data);

  function addCost(kind) {
    const draft = newCost[kind];
    if (!draft.label.trim() || !draft.amount) return;
    const key = kind === "fixed" ? "fixedCosts" : "variableCosts";
    const list = kind === "fixed" ? fixed : variable;
    updateData({
      [key]: [...list, { id: `c${Date.now()}`, label: draft.label.trim(), amount: Number(draft.amount) }],
    });
    setNewCost((v) => ({ ...v, [kind]: { label: "", amount: "" } }));
  }

  function removeCost(kind, cid) {
    const key = kind === "fixed" ? "fixedCosts" : "variableCosts";
    const list = kind === "fixed" ? fixed : variable;
    updateData({ [key]: list.filter((c) => c.id !== cid) });
  }

  // Build an SVG polyline from the projection (12 months), scaled into a 800x300 viewBox.
  const maxBal = Math.max(1, ...analysis.projection);
  const points = analysis.projection
    .map((bal, i) => {
      const x = (i / 12) * 800;
      const y = 280 - (bal / maxBal) * 260;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Burn Rate &amp; Runway
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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-on-surface-variant block mb-1">Cash Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                <input
                  type="number"
                  value={data.cashBalance ?? ""}
                  onChange={(e) => updateData({ cashBalance: Number(e.target.value) })}
                  className="w-40 pl-6 pr-2 py-2 border border-outline-variant rounded-lg text-lg font-bold outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-on-surface-variant block mb-1">Monthly Revenue</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                <input
                  type="number"
                  value={data.monthlyRevenue ?? ""}
                  onChange={(e) => updateData({ monthlyRevenue: Number(e.target.value) })}
                  className="w-40 pl-6 pr-2 py-2 border border-outline-variant rounded-lg text-lg font-bold outline-none focus:border-secondary"
                />
              </div>
            </div>
          </div>
          <div className="bg-white border border-secondary/20 rounded-2xl px-8 py-5 flex flex-col items-center">
            <span className="text-xs uppercase font-bold text-secondary tracking-widest">Projected Runway</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-primary">
                {analysis.runwayMonths === Infinity ? "∞" : Math.round(analysis.runwayMonths)}
              </span>
              <span className="text-xl font-bold text-on-surface-variant">Months</span>
            </div>
            <div className="mt-3 w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div
                className="bg-secondary h-full rounded-full"
                style={{ width: `${analysis.runwayMonths === Infinity ? 100 : Math.min(100, (analysis.runwayMonths / 24) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-on-surface-variant italic">
              {analysis.netBurn <= 0 ? "Cash-flow positive" : `Net burn: ${fmtMoney(analysis.netBurn)}/mo`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="text-lg font-bold text-primary mb-4">Projected Cash Balance</h3>
            <svg viewBox="0 0 800 300" className="w-full h-64">
              <line x1="0" y1="50" x2="800" y2="50" stroke="#E2E8F0" strokeDasharray="4" />
              <line x1="0" y1="150" x2="800" y2="150" stroke="#E2E8F0" strokeDasharray="4" />
              <line x1="0" y1="250" x2="800" y2="250" stroke="#E2E8F0" strokeDasharray="4" />
              <polyline points={points} fill="none" stroke="#006970" strokeWidth="4" strokeLinecap="round" />
              {analysis.projection.map((bal, i) => (
                <circle key={i} cx={(i / 12) * 800} cy={280 - (bal / maxBal) * 260} r="4" fill="#006970" />
              ))}
            </svg>
            <div className="flex justify-between text-xs text-on-surface-variant px-2">
              <span>Month 0</span>
              <span>Month 6</span>
              <span>Month 12</span>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-6 border-l-4 border-l-error border border-outline-variant shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="trending_down" className="text-error" />
                <h3 className="text-xs uppercase text-on-surface-variant font-bold tracking-widest">Net Burn</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary">{fmtMoney(Math.max(0, analysis.netBurn))}</span>
                <span className="text-sm text-on-surface-variant">/mo</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-outline-variant space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Gross Monthly Revenue</span>
                <span className="text-secondary font-semibold">+{fmtMoney(analysis.revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total Operating Expenses</span>
                <span className="text-error font-semibold">-{fmtMoney(analysis.totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs uppercase text-on-surface-variant">Fixed Costs</p>
                <h4 className="text-2xl font-bold text-primary">{fmtMoney(analysis.totalFixed)}</h4>
              </div>
              <Icon name="lock" className="p-2 bg-surface-container rounded-lg text-primary" />
            </div>
            <ul className="space-y-2 mb-3">
              {fixed.map((c) => (
                <li key={c.id} className="flex justify-between items-center group text-sm">
                  <span className="text-on-surface-variant">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmtMoney(c.amount)}</span>
                    <button onClick={() => removeCost("fixed", c.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                </li>
              ))}
              {fixed.length === 0 && <p className="text-sm text-on-surface-variant">No fixed costs yet.</p>}
            </ul>
            <div className="flex gap-2">
              <input value={newCost.fixed.label} onChange={(e) => setNewCost((v) => ({ ...v, fixed: { ...v.fixed, label: e.target.value } }))} placeholder="Label" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <input type="number" value={newCost.fixed.amount} onChange={(e) => setNewCost((v) => ({ ...v, fixed: { ...v.fixed, amount: e.target.value } }))} placeholder="$" className="w-20 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <button onClick={() => addCost("fixed")} className="px-2 bg-primary text-white rounded-md"><Icon name="add" className="text-[14px]" /></button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs uppercase text-on-surface-variant">Variable Costs</p>
                <h4 className="text-2xl font-bold text-primary">{fmtMoney(analysis.totalVariable)}</h4>
              </div>
              <Icon name="data_usage" className="p-2 bg-secondary-container rounded-lg text-on-secondary-container" />
            </div>
            <ul className="space-y-2 mb-3">
              {variable.map((c) => (
                <li key={c.id} className="flex justify-between items-center group text-sm">
                  <span className="text-on-surface-variant">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmtMoney(c.amount)}</span>
                    <button onClick={() => removeCost("variable", c.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                </li>
              ))}
              {variable.length === 0 && <p className="text-sm text-on-surface-variant">No variable costs yet.</p>}
            </ul>
            <div className="flex gap-2">
              <input value={newCost.variable.label} onChange={(e) => setNewCost((v) => ({ ...v, variable: { ...v.variable, label: e.target.value } }))} placeholder="Label" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <input type="number" value={newCost.variable.amount} onChange={(e) => setNewCost((v) => ({ ...v, variable: { ...v.variable, amount: e.target.value } }))} placeholder="$" className="w-20 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <button onClick={() => addCost("variable")} className="px-2 bg-primary text-white rounded-md"><Icon name="add" className="text-[14px]" /></button>
            </div>
          </div>

          <div className="bg-primary text-white rounded-2xl p-6 relative overflow-hidden">
            <h4 className="text-lg font-bold mb-2">Optimization Opportunity</h4>
            <p className="text-white/70 text-sm mb-4">
              {analysis.optimization
                ? `"${analysis.optimization.item.label}" is your largest expense at ${fmtMoney(analysis.optimization.item.amount)}/mo.`
                : "Add cost line items to surface an optimization opportunity."}
            </p>
            {analysis.optimization && (
              <div className="bg-primary-container p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name="lightbulb" className="text-secondary" />
                  <p className="text-sm font-semibold">10% Reduction Impact</p>
                </div>
                <p className="text-sm text-white/80">
                  Cutting {fmtMoney(analysis.optimization.reduction)}/mo would add{" "}
                  <span className="text-secondary font-bold">
                    {analysis.optimization.addedMonths === null
                      ? "infinite"
                      : `${analysis.optimization.addedMonths.toFixed(1)} months`}
                  </span>{" "}
                  of runway.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
