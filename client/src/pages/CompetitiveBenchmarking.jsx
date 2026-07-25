import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    us: "Us",
    competitors: [
      { id: "comp1", name: "Competitor A" },
      { id: "comp2", name: "Competitor B" },
    ],
    axes: [
      { id: "pricing", label: "Pricing" },
      { id: "speed", label: "Speed" },
      { id: "depth", label: "Depth" },
      { id: "security", label: "Security" },
      { id: "support", label: "Support" },
      { id: "ux", label: "UX" },
    ],
    scores: {},
    features: [],
  };
}

function scoreFor(scores, axisId, key) {
  return Number(scores?.[axisId]?.[key] ?? 3);
}

// Deterministic heuristic — no external LLM call.
function analyzeBenchmark(data) {
  const { axes, scores, competitors, features } = data;
  if (axes.length === 0) {
    return { hasContent: false, summary: "Add axes and score yourself vs. competitors to see the gap analysis." };
  }
  const deltas = axes.map((axis) => {
    const us = scoreFor(scores, axis.id, "us");
    const competitorScores = competitors.map((c) => scoreFor(scores, axis.id, c.id));
    const avgCompetitor = competitorScores.length
      ? competitorScores.reduce((a, b) => a + b, 0) / competitorScores.length
      : 0;
    return { axis, us, avgCompetitor, delta: us - avgCompetitor };
  });
  const biggestLead = [...deltas].sort((a, b) => b.delta - a.delta)[0];
  const biggestGap = [...deltas].sort((a, b) => a.delta - b.delta)[0];
  const avgDelta = deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;

  let summary;
  if (biggestLead && biggestLead.delta > 0.5) {
    summary = `Your strongest lead is "${biggestLead.axis.label}" (+${biggestLead.delta.toFixed(1)} vs. competitor average) — lean on this in sales positioning.`;
  } else {
    summary = "No axis currently shows a clear lead over competitor average — differentiation strategy needs sharpening.";
  }
  if (biggestGap && biggestGap.delta < -0.3) {
    summary += ` Watch "${biggestGap.axis.label}" — you're trailing by ${Math.abs(biggestGap.delta).toFixed(1)} points there.`;
  }

  const featureLeads = features.filter((f) => f.tier === "leader").length;
  const featureGaps = features.filter((f) => f.tier === "gap").length;

  return {
    hasContent: true,
    summary,
    avgDelta: Math.round(avgDelta * 10) / 10,
    biggestLead,
    biggestGap,
    featureLeads,
    featureGaps,
  };
}

const TIER_META = {
  leader: { label: "Leading", cls: "text-secondary", icon: "check_circle", fill: true },
  parity: { label: "Parity", cls: "text-on-surface-variant", icon: "check_circle", fill: false },
  gap: { label: "Behind", cls: "text-error", icon: "cancel", fill: false },
};

export default function CompetitiveBenchmarking() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newFeature, setNewFeature] = useState({ name: "", ourNote: "", tier: "parity" });
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
        <div className="p-10 text-on-surface-variant">Loading competitive benchmarking…</div>
      </Layout>
    );
  }

  const { us, competitors, axes, scores, features } = doc.data;
  const analysis = analyzeBenchmark(doc.data);

  function setScore(axisId, key, value) {
    updateData({
      scores: { ...scores, [axisId]: { ...(scores[axisId] || {}), [key]: Number(value) } },
    });
  }

  function addCompetitor() {
    if (!newCompetitor.trim()) return;
    updateData({ competitors: [...competitors, { id: `comp${Date.now()}`, name: newCompetitor.trim() }] });
    setNewCompetitor("");
  }

  function removeCompetitor(cid) {
    updateData({ competitors: competitors.filter((c) => c.id !== cid) });
  }

  function addFeature() {
    if (!newFeature.name.trim()) return;
    updateData({
      features: [
        ...features,
        { id: `feat${Date.now()}`, name: newFeature.name.trim(), ourNote: newFeature.ourNote.trim(), tier: newFeature.tier },
      ],
    });
    setNewFeature({ name: "", ourNote: "", tier: "parity" });
  }

  function removeFeature(fid) {
    updateData({ features: features.filter((f) => f.id !== fid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Competitive Benchmarking</div>
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
          Score yourself against competitors across strategic axes, then track feature-by-feature
          parity and gaps.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Advantage Matrix */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-primary">Advantage Matrix</h3>
                  <p className="text-xs text-on-surface-variant">
                    Score {us} vs. each competitor per axis (0-5)
                  </p>
                </div>
                <Icon name="analytics" className="text-secondary" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-outline-variant">
                      <th className="py-2 pr-4">Axis</th>
                      <th className="py-2 px-3 text-secondary">{us}</th>
                      {competitors.map((c) => (
                        <th key={c.id} className="py-2 px-3 text-on-surface-variant">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {axes.map((axis) => (
                      <tr key={axis.id} className="border-b border-outline-variant/50">
                        <td className="py-3 pr-4 font-medium">{axis.label}</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.5"
                            value={scoreFor(scores, axis.id, "us")}
                            onChange={(e) => setScore(axis.id, "us", e.target.value)}
                            className="w-16 border border-outline-variant rounded px-2 py-1 text-center"
                          />
                        </td>
                        {competitors.map((c) => (
                          <td key={c.id} className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              max="5"
                              step="0.5"
                              value={scoreFor(scores, axis.id, c.id)}
                              onChange={(e) => setScore(axis.id, c.id, e.target.value)}
                              className="w-16 border border-outline-variant rounded px-2 py-1 text-center"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2 items-center">
                <input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                  placeholder="Add competitor name"
                  className="text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary flex-1 max-w-xs"
                />
                <button onClick={addCompetitor} className="px-3 py-2 bg-secondary text-white rounded-md text-sm font-semibold">
                  Add Competitor
                </button>
                {competitors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => removeCompetitor(c.id)}
                    className="text-xs text-on-surface-variant hover:text-error flex items-center gap-1"
                    title={`Remove ${c.name}`}
                  >
                    <Icon name="close" className="text-[14px]" /> {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Matrix */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-5">Feature-by-Feature Matrix</h3>
              <div className="space-y-3 mb-5">
                {features.map((f) => {
                  const meta = TIER_META[f.tier];
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant group">
                      <div>
                        <p className="font-medium text-sm">{f.name}</p>
                        {f.ourNote && <p className="text-xs text-on-surface-variant">{f.ourNote}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 text-sm font-semibold ${meta.cls}`}>
                          <Icon name={meta.icon} className="text-[18px]" filled={meta.fill} />
                          {meta.label}
                        </span>
                        <button onClick={() => removeFeature(f.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {features.length === 0 && <p className="text-sm text-on-surface-variant">No features tracked yet.</p>}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={newFeature.name}
                  onChange={(e) => setNewFeature((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Feature name"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <input
                  value={newFeature.ourNote}
                  onChange={(e) => setNewFeature((v) => ({ ...v, ourNote: e.target.value }))}
                  placeholder="Our differentiator (optional)"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <select
                  value={newFeature.tier}
                  onChange={(e) => setNewFeature((v) => ({ ...v, tier: e.target.value }))}
                  className="text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                >
                  <option value="leader">Leading</option>
                  <option value="parity">Parity</option>
                  <option value="gap">Behind</option>
                </select>
                <button onClick={addFeature} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">
                  Add
                </button>
              </div>
            </div>
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Differentiation Strategy</h3>
            </div>
            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-4">
              <p className="text-sm text-on-surface">{analysis.summary}</p>
            </div>
            {analysis.hasContent && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg text-center">
                  <p className="text-xs text-on-surface-variant uppercase">Avg Delta</p>
                  <p className={`text-lg font-bold ${analysis.avgDelta >= 0 ? "text-secondary" : "text-error"}`}>
                    {analysis.avgDelta >= 0 ? "+" : ""}
                    {analysis.avgDelta}
                  </p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg text-center">
                  <p className="text-xs text-on-surface-variant uppercase">Feature Gaps</p>
                  <p className="text-lg font-bold text-error">{analysis.featureGaps}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
