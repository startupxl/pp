import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const QUADRANTS = [
  {
    key: "costLeadership",
    title: "Cost Leadership",
    subtitle: "Industrywide • Low Cost",
    icon: "payments",
    placeholder: "List cost management initiatives...",
  },
  {
    key: "differentiation",
    title: "Differentiation",
    subtitle: "Industrywide • Uniqueness",
    icon: "diamond",
    placeholder: "List unique value propositions...",
  },
  {
    key: "focusedCost",
    title: "Focused Cost",
    subtitle: "Niche Market • Low Cost",
    icon: "track_changes",
    placeholder: "Identify niche cost efficiencies...",
  },
  {
    key: "focusedDifferentiation",
    title: "Focused Differentiation",
    subtitle: "Niche Market • Uniqueness",
    icon: "star_rate",
    placeholder: "Detail boutique specialty features...",
  },
];

const STRATEGY_OPTIONS = [
  "Cost Leader",
  "Differentiated",
  "Focused Cost",
  "Focused Differentiation",
  "Unclear",
];

const STRATEGY_BADGE_CLASSES = {
  "Cost Leader": "bg-surface-container-highest text-primary",
  Differentiated: "bg-secondary-container text-on-secondary-container",
  "Focused Cost": "bg-surface-container text-on-surface-variant",
  "Focused Differentiation": "bg-secondary/10 text-secondary",
  Unclear: "bg-outline-variant/40 text-on-surface-variant",
};

// Deterministic heuristic (word-count based) — no external LLM call, mirrors
// the style of server/analysisEngine.js.
function analyzeStrategy(quadrants) {
  const wordCount = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;
  const costWords = wordCount(quadrants.costLeadership) + wordCount(quadrants.focusedCost);
  const diffWords =
    wordCount(quadrants.differentiation) + wordCount(quadrants.focusedDifferentiation);
  const broadWords = wordCount(quadrants.costLeadership) + wordCount(quadrants.differentiation);
  const nicheWords =
    wordCount(quadrants.focusedCost) + wordCount(quadrants.focusedDifferentiation);
  const totalWords = costWords + diffWords;

  const diffPct = totalWords ? Math.round((diffWords / totalWords) * 100) : 50;
  const leaning = diffPct >= 50 ? "Differentiation" : "Cost Leadership";
  const leaningPct = diffPct >= 50 ? diffPct : 100 - diffPct;

  const advice = [];
  if (totalWords === 0) {
    advice.push("Fill in at least one quadrant to get a strategic alignment read.");
  } else {
    if (costWords > 0 && diffWords > 0 && Math.abs(costWords - diffWords) <= 2) {
      advice.push(
        "Your inputs are split fairly evenly between cost and differentiation — watch for the 'stuck in the middle' risk of committing to neither."
      );
    }
    if (diffWords > 0) {
      advice.push(
        "Evaluate whether your premium features are truly valued by the broad market or if they appeal to a specific niche."
      );
    }
    if (costWords > 0) {
      advice.push(
        "Check whether your cost advantages (scale, process, sourcing) are durable and hard for competitors to replicate."
      );
    }
    if (nicheWords > broadWords && nicheWords > 0) {
      advice.push(
        "Your detail is concentrated in the Focused quadrants — consider committing fully to a niche strategy rather than spreading resources broadly."
      );
    }
  }

  return { leaning, leaningPct, advice: advice.slice(0, 3), hasContent: totalWords > 0 };
}

export default function Porter() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newCompetitor, setNewCompetitor] = useState({ name: "", strategy: STRATEGY_OPTIONS[0] });
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

  function updateQuadrant(key, value) {
    updateData({ quadrants: { ...(doc.data?.quadrants || {}), [key]: value } });
  }

  function addCompetitor() {
    if (!newCompetitor.name.trim()) return;
    const competitors = doc.data?.competitors || [];
    updateData({
      competitors: [
        ...competitors,
        { id: `c${Date.now()}`, name: newCompetitor.name.trim(), strategy: newCompetitor.strategy },
      ],
    });
    setNewCompetitor({ name: "", strategy: STRATEGY_OPTIONS[0] });
  }

  function removeCompetitor(cid) {
    updateData({ competitors: (doc.data?.competitors || []).filter((c) => c.id !== cid) });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading strategy matrix…</div>
      </Layout>
    );
  }

  const quadrants = doc.data?.quadrants || {};
  const competitors = doc.data?.competitors || [];
  const analysis = analyzeStrategy(quadrants);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Porter's Generic Strategies
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
          Define your firm's strategic advantage and scope to achieve superior performance in the
          marketplace.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {QUADRANTS.map((q) => (
                <div
                  key={q.key}
                  className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm hover:border-secondary transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-primary group-hover:text-secondary transition-colors">
                        {q.title}
                      </h3>
                      <p className="text-xs text-on-surface-variant">{q.subtitle}</p>
                    </div>
                    <Icon
                      name={q.icon}
                      filled
                      className="text-secondary opacity-20 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <textarea
                    value={quadrants[q.key] || ""}
                    onChange={(e) => updateQuadrant(q.key, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full h-36 bg-surface-container-low border-none rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40 placeholder:text-on-surface-variant/40"
                  />
                </div>
              ))}
            </div>

            <div className="bg-primary rounded-xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 text-white">
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-2">The "Stuck in the Middle" Risk</h4>
                <p className="text-white/80 text-sm">
                  Avoid trying to achieve both cost leadership and differentiation simultaneously
                  across a broad market, which often leads to poor financial performance.
                </p>
              </div>
              <div className="w-40 h-20 rounded-lg bg-primary-container flex items-center justify-center border border-white/10 shrink-0">
                <Icon name="warning" className="text-[40px] text-secondary-fixed-dim opacity-60" />
              </div>
            </div>
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                AI Insights
              </h3>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-5">
              <p className="text-xs font-bold text-secondary mb-1">STRATEGIC ALIGNMENT</p>
              {analysis.hasContent ? (
                <p className="text-sm text-on-surface">
                  You are currently leaning {analysis.leaningPct}% toward{" "}
                  <span className="font-bold">{analysis.leaning}</span>.
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Fill in the quadrants to see your strategic alignment.
                </p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-semibold text-primary">Strategic Advice</h4>
              {analysis.advice.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-secondary" />
                  <p className="text-sm text-on-surface-variant">{a}</p>
                </div>
              ))}
            </div>

            <div className="pt-5 border-t border-outline-variant">
              <h4 className="text-sm font-semibold text-primary mb-3">Competitor Benchmarking</h4>
              <div className="space-y-2 mb-3">
                {competitors.map((c) => (
                  <div key={c.id} className="flex items-center justify-between group">
                    <span className="text-sm text-on-surface-variant truncate">{c.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${STRATEGY_BADGE_CLASSES[c.strategy]}`}
                      >
                        {c.strategy}
                      </span>
                      <button
                        onClick={() => removeCompetitor(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                      >
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    </div>
                  </div>
                ))}
                {competitors.length === 0 && (
                  <p className="text-sm text-on-surface-variant">No competitors added yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Competitor name"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
                />
                <select
                  value={newCompetitor.strategy}
                  onChange={(e) => setNewCompetitor((v) => ({ ...v, strategy: e.target.value }))}
                  className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
                >
                  {STRATEGY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addCompetitor}
                  disabled={!newCompetitor.name.trim()}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md bg-primary text-white disabled:opacity-40"
                >
                  <Icon name="add" className="text-[16px]" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
