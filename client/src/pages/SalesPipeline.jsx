import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const STAGES = [
  { id: "discovery", label: "Discovery" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "closed", label: "Closed" },
];

function defaultData() {
  return {
    deals: [
      { id: "d1", name: "Stellar Labs Integration", stage: "discovery", value: 24500, winProb: 20 },
      { id: "d2", name: "Lumina Global Rollout", stage: "qualified", value: 68000, winProb: 45 },
      { id: "d3", name: "Vanguard Systems", stage: "proposal", value: 112000, winProb: 70 },
      { id: "d4", name: "NexGen Logistics", stage: "negotiation", value: 250000, winProb: 90 },
      { id: "d5", name: "BlueWave Agency", stage: "closed", value: 85000, winProb: 100 },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzePipeline(data) {
  const deals = data.deals || [];
  const byStage = STAGES.map((s) => {
    const stageDeals = deals.filter((d) => d.stage === s.id);
    const value = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);
    return { ...s, deals: stageDeals, value, count: stageDeals.length };
  });
  const weightedForecast = deals.reduce((sum, d) => sum + Number(d.value) * (Number(d.winProb) / 100), 0);
  const totalPipeline = deals.filter((d) => d.stage !== "closed").reduce((sum, d) => sum + Number(d.value), 0);
  const closedWon = deals.filter((d) => d.stage === "closed").reduce((sum, d) => sum + Number(d.value), 0);
  return { byStage, weightedForecast, totalPipeline, closedWon };
}

export default function SalesPipeline() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState({ name: "", value: "", winProb: 20 });
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
        <div className="p-10 text-on-surface-variant">Loading sales pipeline…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzePipeline(data);

  function moveDeal(did, dir) {
    const deal = data.deals.find((d) => d.id === did);
    const idx = STAGES.findIndex((s) => s.id === deal.stage);
    const nextIdx = Math.min(STAGES.length - 1, Math.max(0, idx + dir));
    updateData({ deals: data.deals.map((d) => (d.id === did ? { ...d, stage: STAGES[nextIdx].id } : d)) });
  }

  function addDeal() {
    if (!draft.name.trim()) return;
    updateData({ deals: [...data.deals, { id: `d${Date.now()}`, name: draft.name, stage: "discovery", value: Number(draft.value) || 0, winProb: Number(draft.winProb) }] });
    setDraft({ name: "", value: "", winProb: 20 });
  }

  function removeDeal(did) {
    updateData({ deals: data.deals.filter((d) => d.id !== did) });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Sales Pipeline Kanban</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-on-surface-variant mb-1">Open Pipeline</div>
            <div className="text-2xl font-bold text-primary">${analysis.totalPipeline.toLocaleString()}</div>
          </div>
          <div className="bg-secondary-container/10 rounded-2xl p-5 border border-secondary/20 shadow-sm">
            <div className="text-xs uppercase text-secondary mb-1">Weighted Forecast</div>
            <div className="text-2xl font-bold text-secondary">${Math.round(analysis.weightedForecast).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-on-surface-variant mb-1">Closed Won</div>
            <div className="text-2xl font-bold text-primary">${analysis.closedWon.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {analysis.byStage.map((stage, si) => (
            <div key={stage.id} className="min-w-[260px] max-w-[260px] flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-primary">{stage.label}</h3>
                <span className="text-xs text-on-surface-variant">${stage.value.toLocaleString()}</span>
              </div>
              <div className="space-y-3">
                {stage.deals.map((d) => (
                  <div key={d.id} className="group bg-white border border-outline-variant rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-primary flex-1">{d.name}</h4>
                      <button onClick={() => removeDeal(d.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[14px]" /></button>
                    </div>
                    <div className="flex justify-between text-xs mb-3">
                      <span className="text-on-surface-variant">Value</span>
                      <span className="font-medium text-primary">${Number(d.value).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-3">
                      <span className="text-on-surface-variant">Win Prob.</span>
                      <span className="font-medium text-secondary">{d.winProb}%</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-outline-variant/20">
                      <button disabled={si === 0} onClick={() => moveDeal(d.id, -1)} className="text-on-surface-variant hover:text-primary disabled:opacity-20"><Icon name="chevron_left" /></button>
                      <button disabled={si === STAGES.length - 1} onClick={() => moveDeal(d.id, 1)} className="text-on-surface-variant hover:text-primary disabled:opacity-20"><Icon name="chevron_right" /></button>
                    </div>
                  </div>
                ))}
              </div>
              {si === 0 && (
                <div className="bg-white border border-dashed border-outline-variant rounded-2xl p-3 space-y-2">
                  <input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} placeholder="Deal name" className="w-full text-xs border border-outline-variant rounded px-2 py-1 outline-none focus:border-secondary" />
                  <input value={draft.value} onChange={(e) => setDraft((v) => ({ ...v, value: e.target.value }))} placeholder="Value $" type="number" className="w-full text-xs border border-outline-variant rounded px-2 py-1 outline-none focus:border-secondary" />
                  <button onClick={addDeal} className="w-full py-1 bg-primary text-white rounded text-xs">Add Deal</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
