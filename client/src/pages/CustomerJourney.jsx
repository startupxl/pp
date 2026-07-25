import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultStages() {
  return [
    { id: "awareness", name: "Awareness", subtitle: "Problem Recognition", actions: [], feelings: "", touchpoints: [], friction: 20 },
    { id: "consideration", name: "Consideration", subtitle: "Solution Research", actions: [], feelings: "", touchpoints: [], friction: 30 },
    { id: "purchase", name: "Purchase", subtitle: "Decision & Buy-in", actions: [], feelings: "", touchpoints: [], friction: 25 },
    { id: "onboarding", name: "Onboarding", subtitle: "First Value Trip", actions: [], feelings: "", touchpoints: [], friction: 15 },
    { id: "retention", name: "Retention", subtitle: "Loyal Advocate", actions: [], feelings: "", touchpoints: [], friction: 10 },
  ];
}

function defaultData() {
  return { stages: defaultStages() };
}

// Deterministic heuristic — no external LLM call.
function analyzeJourney(data) {
  const stages = data.stages || [];
  if (stages.length === 0) return { journeyHealth: 100, riskiestStage: null, avgFriction: 0 };
  const avgFriction = stages.reduce((s, st) => s + Number(st.friction || 0), 0) / stages.length;
  const journeyHealth = Math.round(100 - avgFriction);
  const riskiestStage = [...stages].sort((a, b) => Number(b.friction) - Number(a.friction))[0];
  return { journeyHealth: Math.max(0, journeyHealth), riskiestStage, avgFriction };
}

function frictionColor(f) {
  if (f >= 60) return "bg-error";
  if (f >= 35) return "bg-secondary-fixed-dim";
  return "bg-secondary";
}

export default function CustomerJourney() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [drafts, setDrafts] = useState({});
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      const merged = { ...defaultData(), ...(d.data || {}) };
      if (!Array.isArray(merged.stages) || merged.stages.length === 0) merged.stages = defaultStages();
      setDoc({ ...d, data: merged });
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

  function updateStage(sid, patch) {
    updateData({ stages: doc.data.stages.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  }

  function onTitleBlur() {
    if (doc && title !== doc.title) scheduleSave({ title });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading customer journey…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeJourney(data);

  function addListItem(sid, key) {
    const draftKey = `${sid}-${key}`;
    const val = (drafts[draftKey] || "").trim();
    if (!val) return;
    const stage = data.stages.find((s) => s.id === sid);
    updateStage(sid, { [key]: [...(stage[key] || []), val] });
    setDrafts((d) => ({ ...d, [draftKey]: "" }));
  }

  function removeListItem(sid, key, idx) {
    const stage = data.stages.find((s) => s.id === sid);
    updateStage(sid, { [key]: stage[key].filter((_, i) => i !== idx) });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Customer Journey Workspace</div>
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
          Visualize the path from initial awareness to long-term advocacy, and track friction at
          every stage.
        </p>

        <div className="overflow-x-auto pb-4 mb-8">
          <div className="flex gap-6 min-w-[1200px]">
            {data.stages.map((s) => (
              <div key={s.id} className="flex-1 flex flex-col gap-3 min-w-[220px]">
                <div className={`h-2 rounded-full ${frictionColor(s.friction)}`} />
                <div className="bg-white rounded-xl border border-outline-variant p-5 flex flex-col gap-4 h-full">
                  <div>
                    <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{s.name}</span>
                    <input
                      value={s.subtitle}
                      onChange={(e) => updateStage(s.id, { subtitle: e.target.value })}
                      className="block w-full mt-2 font-bold text-primary bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs flex items-center gap-1 text-on-surface-variant mb-1"><Icon name="touch_app" className="text-secondary text-[16px]" /> Actions</h4>
                    <ul className="text-xs text-on-surface-variant space-y-1 mb-1">
                      {s.actions.map((a, i) => (
                        <li key={i} className="group flex items-center gap-1">
                          <span>• {a}</span>
                          <button onClick={() => removeListItem(s.id, "actions", i)} className="opacity-0 group-hover:opacity-100 text-error">×</button>
                        </li>
                      ))}
                    </ul>
                    <input
                      value={drafts[`${s.id}-actions`] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [`${s.id}-actions`]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addListItem(s.id, "actions")}
                      placeholder="Add action…"
                      className="w-full text-xs border-b border-outline-variant/40 bg-transparent outline-none focus:border-secondary py-0.5"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs flex items-center gap-1 text-on-surface-variant mb-1"><Icon name="psychology" className="text-secondary text-[16px]" /> Thoughts/Feelings</h4>
                    <textarea
                      value={s.feelings}
                      onChange={(e) => updateStage(s.id, { feelings: e.target.value })}
                      rows={2}
                      placeholder="What are they thinking or feeling?"
                      className="w-full text-xs italic border border-outline-variant rounded-md p-2 outline-none focus:border-secondary resize-none"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs flex items-center gap-1 text-on-surface-variant mb-1"><Icon name="hub" className="text-secondary text-[16px]" /> Touchpoints</h4>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {s.touchpoints.map((t, i) => (
                        <span key={i} className="group px-2 py-0.5 bg-surface-container rounded-md text-[10px]">
                          {t} <button onClick={() => removeListItem(s.id, "touchpoints", i)} className="opacity-40 group-hover:opacity-100 ml-1">×</button>
                        </span>
                      ))}
                    </div>
                    <input
                      value={drafts[`${s.id}-touchpoints`] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [`${s.id}-touchpoints`]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addListItem(s.id, "touchpoints")}
                      placeholder="Add touchpoint…"
                      className="w-full text-xs border-b border-outline-variant/40 bg-transparent outline-none focus:border-secondary py-0.5"
                    />
                  </div>
                  <div className="mt-auto pt-2 border-t border-outline-variant/40">
                    <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                      <span>Friction</span>
                      <span>{s.friction}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={s.friction}
                      onChange={(e) => updateStage(s.id, { friction: Number(e.target.value) })}
                      className="w-full accent-error"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" fill="transparent" stroke="#e5eeff" strokeWidth="7" />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="transparent"
                stroke="#006970"
                strokeWidth="7"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 - (analysis.journeyHealth / 100) * (2 * Math.PI * 40)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-primary">{analysis.journeyHealth}%</div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-secondary tracking-wider mb-1">Friction Insight</p>
            <p className="text-sm text-on-surface-variant">
              {analysis.riskiestStage
                ? `"${analysis.riskiestStage.name}" carries the highest friction (${analysis.riskiestStage.friction}%) — this is where you're most likely to lose customers. Average friction across the journey is ${analysis.avgFriction.toFixed(0)}%.`
                : "Add stages and set friction levels to surface the riskiest point in the journey."}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
