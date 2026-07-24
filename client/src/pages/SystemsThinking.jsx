import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import LoopCanvas from "../components/LoopCanvas";
import { api } from "../api";

// Deterministic heuristic analysis of the causal loop graph — mirrors the
// style of server/analysisEngine.js but only needs the current graph, so it
// runs client-side. No external LLM call.
function analyzeSystem(nodes, edges) {
  const reinforcing = edges.filter((e) => e.loop !== "balancing").length;
  const balancing = edges.filter((e) => e.loop === "balancing").length;
  const flowCount = nodes.filter((n) => n.kind === "flow").length;

  const responseLagDays = Math.max(1, flowCount * 3.5 + edges.length * 0.8);

  const imbalance = reinforcing - balancing;
  const oscillationRisk = edges.length
    ? Math.min(97, Math.max(5, Math.round(50 + imbalance * 12)))
    : 0;

  let stability = "Stable";
  if (edges.length === 0) stability = "Undetermined";
  else if (oscillationRisk >= 70) stability = "Unstable";
  else if (oscillationRisk >= 40) stability = "Fluctuating";

  const degree = {};
  edges.forEach((e) => {
    degree[e.from] = (degree[e.from] || 0) + 1;
    degree[e.to] = (degree[e.to] || 0) + 1;
  });
  let hubId = null;
  let hubDegree = 0;
  Object.entries(degree).forEach(([id, count]) => {
    if (count > hubDegree) {
      hubDegree = count;
      hubId = id;
    }
  });
  const hub = nodes.find((n) => n.id === hubId);

  return { responseLagDays, oscillationRisk, stability, reinforcing, balancing, hub };
}

function stabilityClasses(stability) {
  if (stability === "Unstable") return "text-error";
  if (stability === "Fluctuating") return "text-secondary-fixed-dim";
  if (stability === "Stable") return "text-secondary-fixed-dim";
  return "text-on-primary/60";
}

export default function SystemsThinking() {
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

  function onNodesChange(nodes) {
    setDoc((d) => ({ ...d, data: { ...d.data, nodes } }));
    scheduleSave({ data: { ...doc.data, nodes } });
  }

  function onEdgesChange(edges) {
    setDoc((d) => ({ ...d, data: { ...d.data, edges } }));
    scheduleSave({ data: { ...doc.data, edges } });
  }

  function onTitleBlur() {
    if (title !== doc.title) scheduleSave({ title });
  }

  function applyIntervention(analysis) {
    const leveragePoints = doc.data?.leveragePoints || [];
    const newPoint = {
      id: `lp${Date.now()}`,
      priority: "High",
      title: analysis.hub ? `Rebalance around "${analysis.hub.label}"` : "Add a balancing loop",
      description: analysis.hub
        ? `"${analysis.hub.label}" has the most connections in the system — add a balancing loop or delay here to reduce oscillation risk.`
        : "Introduce a balancing loop to counteract runaway reinforcing feedback.",
      impact: Math.min(95, 60 + analysis.oscillationRisk / 5),
    };
    const nextPoints = [newPoint, ...leveragePoints];
    setDoc((d) => ({ ...d, data: { ...d.data, leveragePoints: nextPoints } }));
    scheduleSave({ data: { ...doc.data, leveragePoints: nextPoints } });
  }

  function removeLeveragePoint(pointId) {
    const leveragePoints = (doc.data?.leveragePoints || []).filter((p) => p.id !== pointId);
    setDoc((d) => ({ ...d, data: { ...d.data, leveragePoints } }));
    scheduleSave({ data: { ...doc.data, leveragePoints } });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading systems map…</div>
      </Layout>
    );
  }

  const nodes = doc.data?.nodes || [];
  const edges = doc.data?.edges || [];
  const leveragePoints = doc.data?.leveragePoints || [];
  const analysis = analyzeSystem(nodes, edges);

  return (
    <Layout>
      <div className="max-w-[1700px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Systems Thinking Workspace
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="flex flex-col gap-6">
            <LoopCanvas
              nodes={nodes}
              onNodesChange={onNodesChange}
              edges={edges}
              onEdgesChange={onEdgesChange}
            />

            <div className="bg-primary rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Icon name="waves" className="text-secondary-fixed-dim" />
                  <h3 className="text-sm font-semibold text-white">Delay / Feedback Analyzer</h3>
                </div>
                <span className="text-xs text-white/50">
                  {analysis.reinforcing} reinforcing · {analysis.balancing} balancing loop
                  {analysis.balancing === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-primary-container p-4 rounded-xl border border-white/5">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">
                    Response Lag
                  </p>
                  <p className="text-secondary-fixed-dim text-2xl font-semibold">
                    {analysis.responseLagDays.toFixed(1)} Days
                  </p>
                </div>
                <div className="bg-primary-container p-4 rounded-xl border border-white/5">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">
                    Oscillation Risk
                  </p>
                  <p className="text-secondary-fixed-dim text-2xl font-semibold">
                    {analysis.oscillationRisk === 0 && edges.length === 0
                      ? "—"
                      : `${analysis.oscillationRisk}%`}
                  </p>
                </div>
                <div className="bg-primary-container p-4 rounded-xl border border-white/5">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">
                    System Stability
                  </p>
                  <p className={`text-2xl font-semibold ${stabilityClasses(analysis.stability)}`}>
                    {analysis.stability}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Icon name="bolt" className="text-secondary" />
                <h3 className="text-lg font-bold text-primary">Leverage Points</h3>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                Identify where small shifts in one thing can produce big changes in everything.
              </p>

              <div className="space-y-4">
                {leveragePoints.length === 0 && (
                  <div className="text-sm text-on-surface-variant border border-dashed border-outline-variant rounded-xl p-5 text-center">
                    No leverage points yet — apply an intervention from the insight below.
                  </div>
                )}
                {leveragePoints.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant hover:border-secondary transition-all group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase">
                        Priority {p.priority}
                      </span>
                      <button
                        onClick={() => removeLeveragePoint(p.id)}
                        className="text-on-surface-variant hover:text-error"
                      >
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    </div>
                    <h4 className="text-sm font-semibold text-primary mb-2">{p.title}</h4>
                    <p className="text-sm text-on-surface-variant mb-3">{p.description}</p>
                    <span className="text-secondary text-sm font-semibold flex items-center gap-1">
                      {Math.round(p.impact)}% Impact
                      <Icon name="trending_up" className="text-[16px]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-primary rounded-2xl relative overflow-hidden mt-auto">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Icon name="psychology" className="text-6xl" />
              </div>
              <h5 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                <Icon name="auto_awesome" className="text-secondary-fixed-dim text-[18px]" />
                Principle Pitch Insight
              </h5>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                {edges.length === 0
                  ? "Add stocks, flows, and at least one loop connection to generate an intervention insight."
                  : analysis.hub
                  ? `"${analysis.hub.label}" is the most connected node in your system. With ${analysis.reinforcing} reinforcing loop${
                      analysis.reinforcing === 1 ? "" : "s"
                    } and ${analysis.balancing} balancing loop${
                      analysis.balancing === 1 ? "" : "s"
                    }, oscillation risk is ${analysis.oscillationRisk}%. Consider a buffer or delay here.`
                  : "Your system currently looks balanced — keep monitoring as you add more loops."}
              </p>
              <button
                onClick={() => applyIntervention(analysis)}
                disabled={edges.length === 0}
                className="w-full py-2 bg-secondary-fixed-dim text-primary text-sm font-bold rounded-lg disabled:opacity-40"
              >
                Apply Intervention
              </button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
