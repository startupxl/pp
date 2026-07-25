import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    situation: "",
    situationPoints: ["", "", ""],
    financialRiskPerHour: "",
    churnRisk: "Medium",
    opexWasteMonthly: "",
    impactNarrative: "",
    recommendation: "",
    steps: [
      { label: "", phase: "Phase 1" },
      { label: "", phase: "Phase 2" },
    ],
    timeToValueMonths: "",
  };
}

const CHURN_LEVELS = ["Low", "Medium", "High"];

// Deterministic heuristic — no external LLM call.
function analyzeSir(data) {
  const fields = [
    data.situation,
    data.impactNarrative,
    data.recommendation,
    data.financialRiskPerHour,
    data.opexWasteMonthly,
    data.timeToValueMonths,
  ];
  const filledCount = fields.filter((f) => String(f || "").trim().length > 0).length;
  const pointsFilled = data.situationPoints.filter((p) => p.trim()).length;
  const stepsFilled = data.steps.filter((s) => s.label.trim()).length;

  const completeness = (filledCount / fields.length) * 55;
  const pointsScore = Math.min(20, pointsFilled * 7);
  const stepsScore = Math.min(15, stepsFilled * 7.5);
  const numericBonus =
    (Number(data.financialRiskPerHour) > 0 ? 5 : 0) + (Number(data.opexWasteMonthly) > 0 ? 5 : 0);

  const confidence = Math.max(5, Math.min(99, Math.round(completeness + pointsScore + stepsScore + numericBonus)));

  const riskPerHour = Number(data.financialRiskPerHour) || 0;
  const opexWaste = Number(data.opexWasteMonthly) || 0;
  const monthsToValue = Number(data.timeToValueMonths) || 0;

  // Simple ROI heuristic: annualized avoided downtime cost (assume 8hrs/yr risk exposure)
  // plus annualized opex waste eliminated, relative to a modeled implementation cost proxy
  // (opex waste x 6 months as a stand-in "cost of change").
  const annualizedRiskAvoided = riskPerHour * 8;
  const annualizedOpexSaved = opexWaste * 12;
  const modeledCost = Math.max(1, opexWaste * 6 || annualizedRiskAvoided * 0.1 || 1000);
  const roi = Math.round(((annualizedRiskAvoided + annualizedOpexSaved) / modeledCost) * 100);

  const churnScoreMap = { Low: 20, Medium: 55, High: 85 };
  const riskFactor = confidence >= 70 && churnScoreMap[data.churnRisk] < 70 ? "Low (Managed)" : churnScoreMap[data.churnRisk] >= 70 ? "Elevated" : "Moderate";

  let summary = "Fill in Situation, Impact, and Recommendation to generate an executive summary.";
  if (filledCount >= 3) {
    const riskText = riskPerHour > 0 ? `an estimated $${riskPerHour.toLocaleString()}/hr exposure` : "meaningful operational exposure";
    const opexText = opexWaste > 0 ? ` and $${opexWaste.toLocaleString()}/mo in avoidable OpEx` : "";
    summary = `The data suggests ${data.churnRisk.toLowerCase()} churn risk alongside ${riskText}${opexText}. ${
      data.recommendation ? data.recommendation.trim() : "A recommendation has not yet been finalized."
    } ${monthsToValue > 0 ? `Time to value is estimated at ${monthsToValue} month${monthsToValue === 1 ? "" : "s"}.` : ""}`.trim();
  }

  return {
    confidence,
    roi: Number.isFinite(roi) && roi > 0 ? roi : 0,
    riskFactor,
    summary,
    monthsToValue,
  };
}

export default function SirWorkshop() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      const merged = { ...defaultData(), ...(d.data || {}) };
      if (!Array.isArray(merged.situationPoints) || merged.situationPoints.length === 0) {
        merged.situationPoints = ["", "", ""];
      }
      if (!Array.isArray(merged.steps) || merged.steps.length === 0) {
        merged.steps = [
          { label: "", phase: "Phase 1" },
          { label: "", phase: "Phase 2" },
        ];
      }
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

  function updateField(key, value) {
    setDoc((d) => {
      const data = { ...d.data, [key]: value };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function updatePoint(idx, value) {
    setDoc((d) => {
      const situationPoints = [...d.data.situationPoints];
      situationPoints[idx] = value;
      const data = { ...d.data, situationPoints };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function addPoint() {
    updateField("situationPoints", [...doc.data.situationPoints, ""]);
  }

  function updateStep(idx, value) {
    setDoc((d) => {
      const steps = d.data.steps.map((s, i) => (i === idx ? { ...s, label: value } : s));
      const data = { ...d.data, steps };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function addStep() {
    const nextPhase = `Phase ${doc.data.steps.length + 1}`;
    updateField("steps", [...doc.data.steps, { label: "", phase: nextPhase }]);
  }

  function onTitleBlur() {
    if (doc && title !== doc.title) scheduleSave({ title });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading SIR workspace…</div>
      </Layout>
    );
  }

  const analysis = analyzeSir(doc.data);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Executive Decision: SIR Analysis</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
            <p className="text-on-surface-variant max-w-2xl mt-2">
              A structured Situation → Impact → Recommendation breakdown for high-stakes decisions.
            </p>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl p-5 min-w-[260px] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Decision Confidence</span>
              <span className="text-secondary font-bold text-xl">{analysis.confidence}%</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${analysis.confidence}%` }} />
            </div>
            <div className="flex items-center gap-2 text-xs text-on-secondary-container">
              <Icon name="verified" className="text-[16px]" />
              Based on completeness &amp; quantified risk data
            </div>
            <span className="text-xs text-on-surface-variant">{saveState}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Situation */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center">
                <Icon name="contextual_token" className="text-primary" />
              </div>
              <h3 className="font-bold text-primary">Situation</h3>
            </div>
            <textarea
              value={doc.data.situation}
              onChange={(e) => updateField("situation", e.target.value)}
              rows={4}
              placeholder="What's the current state? What triggered this decision?"
              className="w-full text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
            />
            <div className="space-y-2">
              {doc.data.situationPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon name="check_circle" className="text-secondary text-[18px] mt-1" />
                  <input
                    value={p}
                    onChange={(e) => updatePoint(i, e.target.value)}
                    placeholder="Supporting fact…"
                    className="w-full text-sm border-b border-outline-variant/40 bg-transparent outline-none focus:border-secondary py-1"
                  />
                </div>
              ))}
              <button onClick={addPoint} className="text-xs text-secondary font-semibold hover:underline">+ Add fact</button>
            </div>
          </div>

          {/* Impact */}
          <div className="bg-white rounded-xl border border-outline-variant border-l-4 border-l-error shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-error-container rounded-lg flex items-center justify-center">
                <Icon name="priority_high" className="text-error" />
              </div>
              <h3 className="font-bold text-primary">Impact</h3>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Financial risk ($/hour of inaction)</span>
              <input
                type="number"
                value={doc.data.financialRiskPerHour}
                onChange={(e) => updateField("financialRiskPerHour", e.target.value)}
                placeholder="e.g. 450"
                className="w-full mt-1 text-sm border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">OpEx waste ($/month)</span>
              <input
                type="number"
                value={doc.data.opexWasteMonthly}
                onChange={(e) => updateField("opexWasteMonthly", e.target.value)}
                placeholder="e.g. 12000"
                className="w-full mt-1 text-sm border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Churn risk</span>
              <select
                value={doc.data.churnRisk}
                onChange={(e) => updateField("churnRisk", e.target.value)}
                className="w-full mt-1 text-sm border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary bg-white"
              >
                {CHURN_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <textarea
              value={doc.data.impactNarrative}
              onChange={(e) => updateField("impactNarrative", e.target.value)}
              rows={3}
              placeholder="Describe the downstream consequences of inaction…"
              className="w-full text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
            />
          </div>

          {/* Recommendation */}
          <div className="bg-white rounded-xl border border-outline-variant border-l-4 border-l-secondary shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-container rounded-lg flex items-center justify-center">
                <Icon name="rocket_launch" className="text-secondary" />
              </div>
              <h3 className="font-bold text-primary">Recommendation</h3>
            </div>
            <textarea
              value={doc.data.recommendation}
              onChange={(e) => updateField("recommendation", e.target.value)}
              rows={3}
              placeholder="What do you recommend, and why?"
              className="w-full text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
            />
            <div className="space-y-2">
              {doc.data.steps.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-secondary/5 rounded-lg border border-secondary/20 gap-2">
                  <input
                    value={s.label}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Step: ${s.phase}`}
                    className="w-full text-sm bg-transparent outline-none"
                  />
                  <span className="text-xs text-secondary bg-secondary-fixed px-2 py-1 rounded-full whitespace-nowrap">{s.phase}</span>
                </div>
              ))}
              <button onClick={addStep} className="text-xs text-secondary font-semibold hover:underline">+ Add step</button>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Time to value (months)</span>
              <input
                type="number"
                value={doc.data.timeToValueMonths}
                onChange={(e) => updateField("timeToValueMonths", e.target.value)}
                placeholder="e.g. 4"
                className="w-full mt-1 text-sm border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary"
              />
            </label>
          </div>
        </div>

        {/* AI-style deterministic executive summary */}
        <div className="bg-gradient-to-br from-white to-surface-container-low border-t-4 border-primary rounded-xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-primary-container rounded-full flex items-center justify-center">
              <Icon name="auto_awesome" className="text-secondary text-[20px]" />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-[2px] text-on-surface-variant">Executive Summary</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-3">
              <p className="text-primary italic leading-relaxed mb-4">{analysis.summary}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-xs rounded-full">ROI: {analysis.roi}%</span>
                <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-xs rounded-full">Risk Factor: {analysis.riskFactor}</span>
                <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-xs rounded-full">
                  Time to Value: {analysis.monthsToValue > 0 ? `${analysis.monthsToValue} Months` : "TBD"}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center border-l border-outline-variant pl-8 gap-3">
              <p className="text-xs text-on-surface-variant font-bold uppercase text-center">Confidence</p>
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#006970"
                    strokeDasharray={`${analysis.confidence}, 100`}
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-primary">{analysis.confidence}</span>
                  <span className="text-[8px] uppercase font-bold text-on-surface-variant">Score</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
