import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return { tam: 1200000000, sam: 450000000, som: 25000000, notes: "" };
}

function fmt(n) {
  const num = Number(n) || 0;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num}`;
}

// Deterministic heuristic — no external LLM call.
function computeSizing(data) {
  const tam = Number(data.tam) || 0;
  const sam = Number(data.sam) || 0;
  const som = Number(data.som) || 0;

  const samOfTamPct = tam > 0 ? (sam / tam) * 100 : 0;
  const somOfSamPct = sam > 0 ? (som / sam) * 100 : 0;
  const somOfTamPct = tam > 0 ? (som / tam) * 100 : 0;

  // Healthy SOM capture is typically 1-10% of SAM in year 1-2; score accordingly.
  let viability;
  let classification;
  if (somOfSamPct <= 0) {
    viability = 0;
    classification = "Incomplete";
  } else if (somOfSamPct <= 15) {
    viability = Math.round(60 + (somOfSamPct / 15) * 30);
    classification = "Realistic";
  } else if (somOfSamPct <= 30) {
    viability = Math.round(90 - ((somOfSamPct - 15) / 15) * 20);
    classification = "Aggressive";
  } else {
    viability = Math.max(20, Math.round(70 - (somOfSamPct - 30)));
    classification = "Highly Aggressive";
  }
  viability = Math.max(0, Math.min(100, viability));

  let summary;
  if (tam <= 0 || sam <= 0 || som <= 0) {
    summary = "Enter TAM, SAM, and SOM values to generate a market viability read.";
  } else if (classification === "Aggressive" || classification === "Highly Aggressive") {
    summary = `Your SOM target captures ${somOfSamPct.toFixed(1)}% of SAM — that's an aggressive 12-24 month goal. Validate sales capacity before committing to this number externally.`;
  } else {
    summary = `Your SOM target captures a realistic ${somOfSamPct.toFixed(1)}% of SAM. SAM itself represents ${samOfTamPct.toFixed(1)}% of TAM, leaving room to expand scope later.`;
  }

  return { samOfTamPct, somOfSamPct, somOfTamPct, viability, classification, summary };
}

export default function MarketSizing() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
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
        <div className="p-10 text-on-surface-variant">Loading market sizing workshop…</div>
      </Layout>
    );
  }

  const { tam, sam, som, notes } = doc.data;
  const sizing = computeSizing(doc.data);
  const samPct = tam > 0 ? Math.max(20, Math.min(100, (sam / tam) * 100)) : 65;
  const somPct = sam > 0 ? Math.max(10, Math.min(samPct - 5, (som / sam) * samPct)) : 30;

  const circumference = 2 * Math.PI * 56;
  const dashOffset = circumference - (sizing.viability / 100) * circumference;

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Market Sizing Workshop</div>
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
          Define your playing field. Calculate Total, Serviceable, and Obtainable market sizes to
          validate scaling potential.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr_320px] gap-8">
          {/* Inputs */}
          <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="edit_note" className="text-primary" />
              <h3 className="font-bold text-primary">Market Inputs</h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Total Addressable Market (TAM)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input
                    type="number"
                    value={tam}
                    onChange={(e) => updateData({ tam: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-outline-variant focus:border-secondary outline-none text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">Global potential for your product category.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Serviceable Addressable Market (SAM)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input
                    type="number"
                    value={sam}
                    onChange={(e) => updateData({ sam: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-outline-variant focus:border-secondary outline-none text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">The segment your business model can reach.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Serviceable Obtainable Market (SOM)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input
                    type="number"
                    value={som}
                    onChange={(e) => updateData({ som: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-outline-variant focus:border-secondary outline-none text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">Realistic capture goal in the next 12-24 months.</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-outline-variant">
              <textarea
                value={notes}
                onChange={(e) => updateData({ notes: e.target.value })}
                placeholder="Notes on methodology, sources, assumptions…"
                className="w-full h-24 bg-surface-container-low border-none rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
          </div>

          {/* Bullseye */}
          <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-outline-variant shadow-sm p-8">
            <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center">
              <div
                className="absolute rounded-full border-2 border-primary/20 bg-primary/5 flex items-start justify-center pt-6"
                style={{ width: "100%", height: "100%" }}
              >
                <span className="text-primary/50 font-bold tracking-widest text-[10px] uppercase">Total Addressable</span>
              </div>
              <div
                className="absolute rounded-full border-2 border-secondary/40 bg-secondary/10 flex items-start justify-center pt-6 transition-all duration-500"
                style={{ width: `${samPct}%`, height: `${samPct}%` }}
              >
                <span className="text-secondary/70 font-bold tracking-widest text-[10px] uppercase">Serviceable</span>
              </div>
              <div
                className="absolute rounded-full bg-secondary shadow-lg flex items-center justify-center transition-all duration-500"
                style={{ width: `${somPct}%`, height: `${somPct}%` }}
              >
                <span className="text-white font-bold text-sm">SOM</span>
              </div>
            </div>
            <div className="mt-8 flex gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary opacity-20" />
                <span>TAM {fmt(tam)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary opacity-40" />
                <span>SAM {fmt(sam)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span>SOM {fmt(som)}</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <aside className="flex flex-col gap-4">
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm text-center">
              <p className="text-xs uppercase text-on-surface-variant tracking-widest mb-4">Market Viability Score</p>
              <div className="relative inline-flex items-center justify-center mb-3">
                <svg className="w-28 h-28 -rotate-90">
                  <circle cx="56" cy="56" r="48" fill="transparent" stroke="#e5eeff" strokeWidth="8" />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="transparent"
                    stroke="#006970"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 - (sizing.viability / 100) * (2 * Math.PI * 48)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s" }}
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-primary">{sizing.viability}</span>
              </div>
              <p className="text-sm font-semibold text-secondary">{sizing.classification}</p>
            </div>

            <div className="bg-white border border-outline-variant rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="auto_awesome" className="text-secondary" filled />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">AI Insights</h4>
              </div>
              <p className="text-sm text-on-surface mb-4">{sizing.summary}</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <p className="text-xs text-on-surface-variant">SAM/TAM</p>
                  <p className="font-bold text-primary">{sizing.samOfTamPct.toFixed(1)}%</p>
                </div>
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <p className="text-xs text-on-surface-variant">SOM/SAM</p>
                  <p className="font-bold text-primary">{sizing.somOfSamPct.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
