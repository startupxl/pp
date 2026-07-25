import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return { point: "", reason: "", example: "", reinforcePoint: "" };
}

const STEPS = [
  { key: "point", letter: "P", label: "The Main Point", hint: "State your primary objective clearly, in one sentence.", rows: 2 },
  { key: "reason", letter: "R", label: "The Reason", hint: "Why does this matter? What is the core rationale?", rows: 3 },
  { key: "example", letter: "E", label: "The Example / Evidence", hint: "Provide data, a case study, or a specific scenario.", rows: 4 },
  { key: "reinforcePoint", letter: "P", label: "Reinforce the Point", hint: "Restate the point with a call to action.", rows: 2 },
];

// Deterministic heuristic — no external LLM call.
function analyzePrep(data) {
  const filled = STEPS.filter((s) => (data[s.key] || "").trim().length > 0);
  if (filled.length === 0) {
    return { hasContent: false, summary: "Fill in each PREP section to generate a credibility read.", credibility: 0, missing: STEPS.map((s) => s.label) };
  }
  const missing = STEPS.filter((s) => !(data[s.key] || "").trim()).map((s) => s.label);

  // Credibility: based on presence of numbers/data (digits, %) in reason + example, plus completeness.
  const evidenceText = `${data.reason || ""} ${data.example || ""}`;
  const digitMatches = evidenceText.match(/\d+(\.\d+)?%?/g) || [];
  const completenessScore = (filled.length / STEPS.length) * 60;
  const evidenceScore = Math.min(40, digitMatches.length * 10);
  const credibility = Math.round(completenessScore + evidenceScore);

  let summary;
  if (missing.length > 0) {
    summary = `Missing: ${missing.join(", ")}. Complete all four PREP beats for a persuasive, well-supported message.`;
  } else if (digitMatches.length === 0) {
    summary = "Structure is complete, but your Reason/Example lack concrete data — add a number or metric to raise credibility.";
  } else {
    summary = `Strong structure with ${digitMatches.length} data point${digitMatches.length === 1 ? "" : "s"} referenced — this message is ready to deliver.`;
  }

  return { hasContent: true, summary, credibility: Math.min(100, credibility), missing, digitCount: digitMatches.length };
}

export default function PrepFramework() {
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

  function updateField(key, value) {
    setDoc((d) => {
      const data = { ...d.data, [key]: value };
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
        <div className="p-10 text-on-surface-variant">Loading PREP workspace…</div>
      </Layout>
    );
  }

  const analysis = analyzePrep(doc.data);
  const tldr = STEPS.map((s) => doc.data[s.key]).filter(Boolean).join(" ");

  function copySummary() {
    navigator.clipboard?.writeText(tldr);
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">PREP Framework Workspace</div>
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
          Structure a persuasive message with Point → Reason → Example → Point — ideal for
          concise executive communication.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-4">
            {STEPS.map((step, idx) => (
              <div key={step.key + idx} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 border-l-4 border-l-primary">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {step.letter}
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-sm">{step.label}</p>
                    <p className="text-xs text-on-surface-variant">{step.hint}</p>
                  </div>
                </div>
                <textarea
                  value={doc.data[step.key]}
                  onChange={(e) => updateField(step.key, e.target.value)}
                  rows={step.rows}
                  placeholder={`Write the ${step.label.toLowerCase()}…`}
                  className="w-full text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
                />
              </div>
            ))}
          </div>

          <aside className="flex flex-col gap-4 h-fit sticky top-24">
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Credibility Meter</p>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="transparent" stroke="#e5eeff" strokeWidth="8" />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      fill="transparent"
                      stroke="#006970"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 - (analysis.credibility / 100) * (2 * Math.PI * 48)}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.5s" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{analysis.credibility}%</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant text-center">{analysis.summary}</p>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="bolt" className="text-secondary" />
                <h4 className="text-sm font-bold text-primary uppercase">TL;DR Generator</h4>
              </div>
              <div className="bg-white p-3 rounded-lg border border-outline-variant/40 text-sm text-on-surface min-h-[80px]">
                {tldr || "Your summary builds here as you fill in each PREP step…"}
              </div>
              <button
                onClick={copySummary}
                className="mt-3 flex items-center gap-1 text-secondary text-sm font-semibold hover:underline"
              >
                <Icon name="content_copy" className="text-[16px]" />
                Copy Summary
              </button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
