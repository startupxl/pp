import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function fmtMoney(n) {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

function defaultData() {
  return {
    revenueLines: [{ id: "r1", label: "SaaS Subscriptions", amount: 42000 }],
    expenseLines: [{ id: "e1", label: "Staffing Costs", amount: 22000 }],
    scenario: "moderate",
    targetMargin: 22,
  };
}

const SCENARIOS = {
  conservative: { label: "Conservative", growth: 0.05, hint: "5% MoM growth, focused on profitability over scale." },
  moderate: { label: "Moderate", growth: 0.12, hint: "12% MoM growth, balanced reinvestment strategy." },
  aggressive: { label: "Aggressive", growth: 0.2, hint: "20% MoM growth, prioritizing scale over near-term margin." },
};

// Deterministic heuristic — no external LLM call.
function analyzePl(data) {
  const revenueBase = (data.revenueLines || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const expenseBase = (data.expenseLines || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const growth = SCENARIOS[data.scenario]?.growth ?? SCENARIOS.moderate.growth;

  const months = [];
  let revenue = revenueBase;
  let expense = expenseBase;
  for (let i = 0; i < 12; i++) {
    months.push({ revenue, expense, profit: revenue - expense });
    revenue *= 1 + growth;
    expense *= 1 + growth * 0.4; // expenses scale slower than revenue
  }

  const annualRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const annualExpense = months.reduce((s, m) => s + m.expense, 0);
  const ebitda = annualRevenue - annualExpense;
  const margin = annualRevenue > 0 ? (ebitda / annualRevenue) * 100 : 0;
  const targetMargin = Number(data.targetMargin) || 0;

  let health = "Low";
  if (margin >= targetMargin) health = "High";
  else if (margin >= targetMargin * 0.6) health = "Moderate";

  const maxMonthly = Math.max(...months.map((m) => m.revenue), 1);

  return { months, annualRevenue, annualExpense, ebitda, margin, health, maxMonthly, revenueBase, expenseBase };
}

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default function PlForecasting() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newLine, setNewLine] = useState({ revenue: { label: "", amount: "" }, expense: { label: "", amount: "" } });
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
        <div className="p-10 text-on-surface-variant">Loading P&amp;L forecast…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzePl(data);

  function addLine(kind) {
    const draft = newLine[kind];
    if (!draft.label.trim() || !draft.amount) return;
    const key = kind === "revenue" ? "revenueLines" : "expenseLines";
    updateData({ [key]: [...(data[key] || []), { id: `${kind[0]}${Date.now()}`, label: draft.label.trim(), amount: Number(draft.amount) }] });
    setNewLine((v) => ({ ...v, [kind]: { label: "", amount: "" } }));
  }

  function removeLine(kind, lid) {
    const key = kind === "revenue" ? "revenueLines" : "expenseLines";
    updateData({ [key]: (data[key] || []).filter((l) => l.id !== lid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">P&amp;L Forecasting</div>
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
          Refine 12-month projections with a growth scenario and track EBITDA in real time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-on-surface-variant">Projected Revenue</span>
              <Icon name="trending_up" className="text-secondary" />
            </div>
            <div className="text-2xl font-bold text-primary">{fmtMoney(analysis.annualRevenue)}</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-on-surface-variant">Net Margin</span>
              <Icon name="pie_chart" className="text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{analysis.margin.toFixed(1)}%</div>
            <div className="text-xs text-on-surface-variant mt-1">Target: {data.targetMargin}%</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-on-surface-variant">EBITDA (Annual)</span>
              <Icon name="account_balance_wallet" className="text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{fmtMoney(analysis.ebitda)}</div>
            <div className="text-xs text-on-surface-variant mt-1">Operational Health: {analysis.health}</div>
          </div>
          <div className="bg-secondary-container/10 border border-secondary/30 rounded-xl p-6">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-secondary">Scenario</span>
              <Icon name="hourglass_top" className="text-secondary" />
            </div>
            <div className="text-2xl font-bold text-primary">{SCENARIOS[data.scenario].label}</div>
            <div className="text-xs text-on-surface-variant mt-1">+{Math.round(SCENARIOS[data.scenario].growth * 100)}% MoM</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="font-bold text-primary mb-6">12-Month Revenue Forecast</h3>
              <div className="h-56 flex items-end justify-between gap-2 px-2">
                {analysis.months.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-sm transition-all ${i === 11 ? "bg-secondary" : "bg-primary-container/30 hover:bg-primary-container"}`}
                      style={{ height: `${Math.max(4, (m.revenue / analysis.maxMonthly) * 100)}%` }}
                      title={fmtMoney(m.revenue)}
                    />
                    <span className="text-[9px] text-on-surface-variant">{MONTH_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <h3 className="font-bold text-primary">Revenue Lines</h3>
              </div>
              <ul className="divide-y divide-outline-variant/40">
                {(data.revenueLines || []).map((r) => (
                  <li key={r.id} className="group flex items-center justify-between px-6 py-3">
                    <span className="text-sm">{r.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-secondary">{fmtMoney(r.amount)}/mo</span>
                      <button onClick={() => removeLine("revenue", r.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-4 bg-surface-container-low flex gap-2">
                <input value={newLine.revenue.label} onChange={(e) => setNewLine((v) => ({ ...v, revenue: { ...v.revenue, label: e.target.value } }))} placeholder="Revenue line" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <input type="number" value={newLine.revenue.amount} onChange={(e) => setNewLine((v) => ({ ...v, revenue: { ...v.revenue, amount: e.target.value } }))} placeholder="$/mo" className="w-28 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <button onClick={() => addLine("revenue")} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <h3 className="font-bold text-primary">Expense Lines</h3>
              </div>
              <ul className="divide-y divide-outline-variant/40">
                {(data.expenseLines || []).map((e) => (
                  <li key={e.id} className="group flex items-center justify-between px-6 py-3">
                    <span className="text-sm">{e.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-error">-{fmtMoney(e.amount)}/mo</span>
                      <button onClick={() => removeLine("expense", e.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-4 bg-surface-container-low flex gap-2">
                <input value={newLine.expense.label} onChange={(e) => setNewLine((v) => ({ ...v, expense: { ...v.expense, label: e.target.value } }))} placeholder="Expense line" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <input type="number" value={newLine.expense.amount} onChange={(e) => setNewLine((v) => ({ ...v, expense: { ...v.expense, amount: e.target.value } }))} placeholder="$/mo" className="w-28 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <button onClick={() => addLine("expense")} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 bg-white rounded-xl p-6 border border-secondary shadow-sm space-y-4">
            <h3 className="font-bold text-primary flex items-center gap-2"><Icon name="psychology" className="text-secondary" /> Scenario Planner</h3>
            <p className="text-sm text-on-surface-variant">Adjust the growth path to see the effect on your 12-month EBITDA.</p>
            {Object.entries(SCENARIOS).map(([key, s]) => (
              <label
                key={key}
                className={`block p-4 border rounded-xl cursor-pointer transition-all ${data.scenario === key ? "border-secondary bg-secondary-container/10" : "border-outline-variant hover:bg-surface-container"}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-primary">{s.label}</span>
                  <input type="radio" name="scenario" checked={data.scenario === key} onChange={() => updateData({ scenario: key })} className="accent-secondary" />
                </div>
                <div className="text-sm text-on-surface-variant">{s.hint}</div>
              </label>
            ))}
            <label className="block pt-2">
              <span className="text-xs uppercase text-on-surface-variant">Target margin (%)</span>
              <input type="number" value={data.targetMargin} onChange={(e) => updateData({ targetMargin: Number(e.target.value) })} className="w-full mt-1 border border-outline-variant rounded-lg p-2 outline-none focus:border-secondary" />
            </label>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
