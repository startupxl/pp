import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function fmtNum(n) {
  return Math.round(n).toLocaleString();
}

function defaultData() {
  return {
    shareholders: [
      { id: "s1", name: "Jane Doe (Founder)", type: "Common", shares: 4500000 },
      { id: "s2", name: "Aria Smith (Founder)", type: "Common", shares: 4500000 },
      { id: "s3", name: "Aether Capital", type: "Preferred (A)", shares: 5800000 },
    ],
    esopPoolShares: 2400000,
    newRoundShares: 0,
    newRoundHolderName: "New Investor",
  };
}

const TYPE_COLORS = {
  Common: "bg-primary",
  "Preferred (A)": "bg-secondary",
  "Preferred (B)": "bg-secondary-fixed-dim",
  ESOP: "bg-on-primary-container",
};

// Deterministic heuristic — no external LLM call.
function analyzeEquity(data) {
  const holders = [...(data.shareholders || []), { id: "esop", name: "Employee Pool (ESOP)", type: "ESOP", shares: Number(data.esopPoolShares) || 0 }];
  const totalShares = holders.reduce((s, h) => s + Number(h.shares || 0), 0);

  const preRound = holders.map((h) => ({ ...h, ownership: totalShares > 0 ? (Number(h.shares) / totalShares) * 100 : 0 }));

  const founderPct = preRound.filter((h) => h.type === "Common" && h.name.toLowerCase().includes("founder")).reduce((s, h) => s + h.ownership, 0);
  const investorPct = preRound.filter((h) => h.type.startsWith("Preferred")).reduce((s, h) => s + h.ownership, 0);
  const esopPct = preRound.find((h) => h.id === "esop")?.ownership || 0;

  const newShares = Number(data.newRoundShares) || 0;
  const postTotal = totalShares + newShares;
  const postRound = preRound.map((h) => ({ ...h, postOwnership: postTotal > 0 ? (Number(h.shares) / postTotal) * 100 : h.ownership }));
  const newHolderPostOwnership = postTotal > 0 ? (newShares / postTotal) * 100 : 0;
  const dilutionPct = newShares > 0 ? postRound.map((h) => ({ name: h.name, delta: h.postOwnership - h.ownership })) : [];
  const avgDilution = newShares > 0 && dilutionPct.length ? dilutionPct.reduce((s, d) => s + d.delta, 0) / dilutionPct.length : 0;

  return { totalShares, preRound, founderPct, investorPct, esopPct, postTotal, postRound, newHolderPostOwnership, avgDilution, newShares };
}

export default function EquityManagement() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newHolder, setNewHolder] = useState({ name: "", type: "Common", shares: "" });
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
        <div className="p-10 text-on-surface-variant">Loading equity workspace…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeEquity(data);

  function addHolder() {
    if (!newHolder.name.trim() || !newHolder.shares) return;
    updateData({ shareholders: [...data.shareholders, { id: `h${Date.now()}`, name: newHolder.name.trim(), type: newHolder.type, shares: Number(newHolder.shares) }] });
    setNewHolder({ name: "", type: "Common", shares: "" });
  }

  function removeHolder(hid) {
    updateData({ shareholders: data.shareholders.filter((h) => h.id !== hid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Equity &amp; Cap Table</div>
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
          Real-time ownership structure and dilution forecasting for your organization.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-bold text-primary">Ownership Distribution</h3>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Founders</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-secondary" /> Investors</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-on-primary-container" /> ESOP</span>
              </div>
            </div>
            <div className="h-40 flex items-end gap-8 px-4 mb-6">
              {[
                { label: "Founders", pct: analysis.founderPct, color: "bg-primary" },
                { label: "Investors", pct: analysis.investorPct, color: "bg-secondary" },
                { label: "ESOP", pct: analysis.esopPct, color: "bg-on-primary-container" },
              ].map((b) => (
                <div key={b.label} className="flex-1 flex flex-col items-center">
                  <div className={`w-full rounded-t-lg ${b.color}`} style={{ height: `${Math.max(4, b.pct)}%` }} />
                  <p className="mt-2 text-xs text-on-surface-variant">{b.label}</p>
                  <p className="font-bold text-primary">{b.pct.toFixed(1)}%</p>
                </div>
              ))}
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-on-surface-variant uppercase border-t border-outline-variant">
                  <th className="py-3">Shareholder</th>
                  <th className="py-3">Type</th>
                  <th className="py-3 text-right">Shares</th>
                  <th className="py-3 text-right">Ownership</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {analysis.preRound
                  .filter((h) => h.id !== "esop")
                  .map((h) => (
                    <tr key={h.id} className="border-t border-surface-container group">
                      <td className="py-3">{h.name}</td>
                      <td className="py-3">{h.type}</td>
                      <td className="py-3 text-right">{fmtNum(h.shares)}</td>
                      <td className="py-3 text-right font-semibold">{h.ownership.toFixed(2)}%</td>
                      <td className="py-3 text-right">
                        <button onClick={() => removeHolder(h.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="mt-4 flex gap-2">
              <input value={newHolder.name} onChange={(e) => setNewHolder((v) => ({ ...v, name: e.target.value }))} placeholder="Shareholder name" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <select value={newHolder.type} onChange={(e) => setNewHolder((v) => ({ ...v, type: e.target.value }))} className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary bg-white">
                <option>Common</option>
                <option>Preferred (A)</option>
                <option>Preferred (B)</option>
              </select>
              <input type="number" value={newHolder.shares} onChange={(e) => setNewHolder((v) => ({ ...v, shares: e.target.value }))} placeholder="Shares" className="w-32 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <button onClick={addHolder} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <h3 className="text-sm font-bold text-primary mb-4">Share Class Summary</h3>
              <div className="space-y-3">
                {["Common", "Preferred (A)", "Preferred (B)"].map((type) => {
                  const shares = data.shareholders.filter((h) => h.type === type).reduce((s, h) => s + Number(h.shares), 0);
                  if (shares === 0) return null;
                  const pct = analysis.totalShares > 0 ? (shares / analysis.totalShares) * 100 : 0;
                  return (
                    <div key={type} className="p-3 bg-surface-container rounded-xl">
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>{type}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <p className="text-xl font-bold">{fmtNum(shares)}</p>
                        <p className="text-xs opacity-60">{pct.toFixed(1)}% Total</p>
                      </div>
                    </div>
                  );
                })}
                <label className="block p-3 bg-primary-container rounded-xl text-on-primary-container">
                  <span className="text-xs uppercase">Employee Pool (ESOP)</span>
                  <input
                    type="number"
                    value={data.esopPoolShares}
                    onChange={(e) => updateData({ esopPoolShares: Number(e.target.value) })}
                    className="w-full mt-1 bg-transparent text-xl font-bold outline-none border-b border-white/30"
                  />
                  <span className="text-xs opacity-70">{analysis.esopPct.toFixed(1)}% Total</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="model_training" className="text-secondary" />
            <h3 className="font-bold text-primary">Scenario Modeler</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-6">Simulate a new funding round and see the dilution impact on existing shareholders.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
            <label className="block">
              <span className="text-xs uppercase text-on-surface-variant">New investor</span>
              <input value={data.newRoundHolderName} onChange={(e) => updateData({ newRoundHolderName: e.target.value })} className="w-full mt-1 border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary" />
            </label>
            <label className="block">
              <span className="text-xs uppercase text-on-surface-variant">New shares issued</span>
              <input type="number" value={data.newRoundShares} onChange={(e) => updateData({ newRoundShares: Number(e.target.value) })} className="w-full mt-1 border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary" />
            </label>
            <div className="bg-white border border-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-on-surface-variant">New investor post-round</p>
              <p className="text-xl font-bold text-secondary">{analysis.newHolderPostOwnership.toFixed(1)}%</p>
            </div>
          </div>
          {analysis.newShares > 0 && (
            <div className="bg-white rounded-xl border border-outline-variant p-4">
              <p className="text-xs uppercase text-on-surface-variant mb-2">Avg. dilution across existing holders: <span className="font-bold text-error">{analysis.avgDilution.toFixed(2)} pts</span></p>
              <table className="w-full text-sm">
                <tbody>
                  {analysis.postRound.filter((h) => h.id !== "esop" || Number(data.esopPoolShares) > 0).map((h) => (
                    <tr key={h.id} className="border-t border-surface-container">
                      <td className="py-2">{h.name}</td>
                      <td className="py-2 text-right">{h.ownership.toFixed(2)}% → {h.postOwnership.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
