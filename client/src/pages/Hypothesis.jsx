import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function computeConfidence(assumptions, evidence) {
  const validatedRatio = assumptions.length
    ? assumptions.filter((a) => a.validated).length / assumptions.length
    : 0;
  const evidenceRatio = Math.min(1, evidence.length / 4);
  return Math.round(validatedRatio * 65 + evidenceRatio * 35);
}

function confidenceLabel(score) {
  if (score >= 75) return "High Confidence";
  if (score >= 45) return "Moderate Confidence";
  if (score > 0) return "Low Confidence";
  return "Not Yet Assessed";
}

function statusLabel(stage) {
  if (stage === "validated") return "Validated";
  if (stage === "invalidated") return "Invalidated";
  return "In-Validation";
}

const EVIDENCE_ICONS = {
  data: "bar_chart",
  interview: "description",
  recording: "video_library",
  other: "attachment",
};

export default function Hypothesis() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newAssumption, setNewAssumption] = useState("");
  const [newEvidence, setNewEvidence] = useState({ name: "", kind: "data", note: "" });
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

  function updateHypothesis(text) {
    updateData({ hypothesis: text });
  }

  function addAssumption() {
    if (!newAssumption.trim()) return;
    const assumptions = doc.data?.assumptions || [];
    updateData({
      assumptions: [
        ...assumptions,
        { id: `a${Date.now()}`, text: newAssumption.trim(), validated: false },
      ],
    });
    setNewAssumption("");
  }

  function toggleAssumption(aid) {
    updateData({
      assumptions: (doc.data?.assumptions || []).map((a) =>
        a.id === aid ? { ...a, validated: !a.validated } : a
      ),
    });
  }

  function removeAssumption(aid) {
    updateData({ assumptions: (doc.data?.assumptions || []).filter((a) => a.id !== aid) });
  }

  function updateTestDesign(patch) {
    updateData({ testDesign: { ...(doc.data?.testDesign || {}), ...patch } });
  }

  function updateSuccessCriteria(patch) {
    updateData({ successCriteria: { ...(doc.data?.successCriteria || {}), ...patch } });
  }

  function addEvidence() {
    if (!newEvidence.name.trim()) return;
    const evidence = doc.data?.evidence || [];
    updateData({
      evidence: [
        ...evidence,
        { id: `e${Date.now()}`, ...newEvidence, name: newEvidence.name.trim() },
      ],
    });
    setNewEvidence({ name: "", kind: "data", note: "" });
  }

  function removeEvidence(eid) {
    updateData({ evidence: (doc.data?.evidence || []).filter((e) => e.id !== eid) });
  }

  function setStage(stage) {
    updateData({ stage });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading hypothesis workspace…</div>
      </Layout>
    );
  }

  const assumptions = doc.data?.assumptions || [];
  const testDesign = doc.data?.testDesign || {};
  const successCriteria = doc.data?.successCriteria || {};
  const evidence = doc.data?.evidence || [];
  const stage = doc.data?.stage || "in-validation";
  const confidence = computeConfidence(assumptions, evidence);
  const dashOffset = CIRCUMFERENCE - (confidence / 100) * CIRCUMFERENCE;

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Hypothesis-Driven Thinking Workspace
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
            <p className="text-on-surface-variant max-w-2xl mt-2">
              Validate your critical business assumptions through disciplined hypothesis testing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">{saveState}</span>
            <div className="bg-surface-container rounded-xl p-4 flex flex-col items-end border border-outline-variant">
              <span className="text-on-surface-variant text-xs uppercase tracking-wider">
                Overall Status
              </span>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="text-secondary font-bold text-lg bg-transparent outline-none text-right"
              >
                <option value="in-validation">In-Validation</option>
                <option value="validated">Validated</option>
                <option value="invalidated">Invalidated</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
              <div className="flex items-center gap-2 mb-4">
                <Icon name="lightbulb" className="text-secondary" filled />
                <h3 className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">
                  Core Hypothesis
                </h3>
              </div>
              <textarea
                value={doc.data?.hypothesis || ""}
                onChange={(e) => updateHypothesis(e.target.value)}
                placeholder="State your hypothesis: 'If we [action], then [result] because [reason]...'"
                className="w-full bg-transparent outline-none text-xl font-semibold text-primary resize-none placeholder:text-primary/20"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-outline-variant">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="fact_check" className="text-on-secondary-container" />
                    <h4 className="text-sm font-bold text-primary">Key Assumptions</h4>
                  </div>
                </div>
                <ul className="space-y-3 mb-3">
                  {assumptions.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 group">
                      <input
                        type="checkbox"
                        checked={a.validated}
                        onChange={() => toggleAssumption(a.id)}
                        className="mt-1 rounded text-secondary border-outline-variant"
                      />
                      <span
                        className={`text-sm flex-1 ${
                          a.validated ? "text-on-surface line-through" : "text-on-surface-variant"
                        }`}
                      >
                        {a.text}
                      </span>
                      <button
                        onClick={() => removeAssumption(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                      >
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    value={newAssumption}
                    onChange={(e) => setNewAssumption(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAssumption()}
                    placeholder="Add an assumption to validate…"
                    className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary"
                  />
                  <button
                    onClick={addAssumption}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary text-white"
                  >
                    <Icon name="add" className="text-[16px]" />
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="science" className="text-on-secondary-container" />
                  <h4 className="text-sm font-bold text-primary">Test Design</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs uppercase text-on-surface-variant mb-1 block">
                      Methodology
                    </label>
                    <input
                      value={testDesign.methodology || ""}
                      onChange={(e) => updateTestDesign({ methodology: e.target.value })}
                      placeholder="e.g. A/B test on beta cohort"
                      className="w-full text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-on-surface-variant mb-1 block">
                      Duration
                    </label>
                    <input
                      value={testDesign.duration || ""}
                      onChange={(e) => updateTestDesign({ duration: e.target.value })}
                      placeholder="e.g. 14 business days"
                      className="w-full text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary"
                    />
                  </div>
                  <textarea
                    value={testDesign.note || ""}
                    onChange={(e) => updateTestDesign({ note: e.target.value })}
                    placeholder="Rollout notes (e.g. shadow feature to 5% of traffic)…"
                    className="w-full text-sm border border-dashed border-outline-variant rounded-md p-3 outline-none resize-none bg-surface-container-low"
                    rows={2}
                  />
                </div>
              </div>

              <div className="md:col-span-2 bg-white p-5 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="verified" className="text-on-secondary-container" />
                  <h4 className="text-sm font-bold text-primary">Success Criteria</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[220px] border-l-4 border-secondary p-4 bg-secondary/5 rounded-r-lg">
                    <p className="text-xs uppercase text-on-secondary-container mb-1">
                      Primary Metric
                    </p>
                    <input
                      value={successCriteria.primaryMetric || ""}
                      onChange={(e) => updateSuccessCriteria({ primaryMetric: e.target.value })}
                      placeholder="e.g. 40% reduction"
                      className="w-full font-bold text-primary text-lg bg-transparent outline-none mb-1"
                    />
                    <input
                      value={successCriteria.primaryMetricDetail || ""}
                      onChange={(e) =>
                        updateSuccessCriteria({ primaryMetricDetail: e.target.value })
                      }
                      placeholder="What is being measured?"
                      className="w-full text-sm text-on-surface-variant bg-transparent outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[220px] border-l-4 border-primary p-4 bg-surface-container rounded-r-lg">
                    <p className="text-xs uppercase text-on-surface-variant mb-1">Adoption Goal</p>
                    <input
                      value={successCriteria.adoptionGoal || ""}
                      onChange={(e) => updateSuccessCriteria({ adoptionGoal: e.target.value })}
                      placeholder="e.g. >65% usage"
                      className="w-full font-bold text-primary text-lg bg-transparent outline-none mb-1"
                    />
                    <input
                      value={successCriteria.adoptionGoalDetail || ""}
                      onChange={(e) =>
                        updateSuccessCriteria({ adoptionGoalDetail: e.target.value })
                      }
                      placeholder="What is being measured?"
                      className="w-full text-sm text-on-surface-variant bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm text-center">
              <h4 className="text-sm font-bold text-primary mb-5">Confidence Score</h4>
              <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                  <circle
                    cx="96"
                    cy="96"
                    r={RADIUS}
                    fill="transparent"
                    stroke="#dce9ff"
                    strokeWidth="12"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r={RADIUS}
                    fill="transparent"
                    stroke="#006970"
                    strokeWidth="12"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{confidence}%</span>
                  <span className="text-xs text-on-surface-variant">
                    {confidenceLabel(confidence)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Low Certainty</span>
                <span>Full Validation</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gradient-to-r from-error via-secondary-container to-secondary opacity-40" />
            </div>

            <div className="bg-primary p-5 rounded-xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="attachment" className="text-secondary-fixed-dim" />
                  <h4 className="text-sm font-bold text-white">Validation Evidence</h4>
                </div>
                <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-1 rounded uppercase">
                  {evidence.length} file{evidence.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                {evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 bg-primary-container rounded-lg border border-white/5 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        name={EVIDENCE_ICONS[ev.kind] || "attachment"}
                        className="text-secondary-fixed-dim shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-white truncate">{ev.name}</span>
                        <span className="text-[10px] text-white/50 truncate">
                          {ev.note || ev.kind}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeEvidence(ev.id)}
                      className="text-white/30 hover:text-white shrink-0"
                    >
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </div>
                ))}
                {evidence.length === 0 && (
                  <p className="text-xs text-white/50 text-center py-2">
                    No evidence logged yet — add metadata for interviews, reports, or recordings.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <input
                  value={newEvidence.name}
                  onChange={(e) => setNewEvidence((v) => ({ ...v, name: e.target.value }))}
                  placeholder="File or source name…"
                  className="w-full text-sm bg-primary-container text-white placeholder:text-white/40 rounded-md px-3 py-2 outline-none border border-white/10"
                />
                <div className="flex gap-2">
                  <select
                    value={newEvidence.kind}
                    onChange={(e) => setNewEvidence((v) => ({ ...v, kind: e.target.value }))}
                    className="flex-1 text-sm bg-primary-container text-white rounded-md px-2 py-2 outline-none border border-white/10"
                  >
                    <option value="data">Statistical Report</option>
                    <option value="interview">Qualitative Data</option>
                    <option value="recording">Recording</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={addEvidence}
                    disabled={!newEvidence.name.trim()}
                    className="px-3 py-2 bg-secondary-fixed-dim text-primary rounded-md text-sm font-bold disabled:opacity-40"
                  >
                    <Icon name="cloud_upload" className="text-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap justify-between items-center gap-4 py-6 border-t border-outline-variant">
          <div className="flex items-center gap-6 text-sm text-on-surface-variant">
            <span className="flex items-center gap-2">
              <Icon name="history" className="text-[18px]" />
              {saveState === "Saving..." ? "Saving…" : "All changes saved"}
            </span>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-3 rounded-lg border border-outline-variant text-primary text-sm font-semibold hover:bg-surface-container transition-colors">
              Discard Draft
            </button>
            <button
              onClick={() => setStage("validated")}
              className="px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              Finalize &amp; Lock Hypothesis
            </button>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
