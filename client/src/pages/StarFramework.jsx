import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return { situation: "", task: "", action: "", result: "" };
}

const STEPS = [
  { key: "situation", label: "SITUATION", title: "The Context", icon: "contextual_token", placeholder: "Set the scene: What was the environment? Who was involved? What was the challenge?" },
  { key: "task", label: "TASK", title: "The Objective", icon: "assignment", placeholder: "Specify your role: What was your specific responsibility? What was the goal?" },
  { key: "action", label: "ACTION", title: "Your Strategy", icon: "bolt", placeholder: "What did YOU do? Steps taken, tools used, obstacles overcome." },
  { key: "result", label: "RESULT", title: "The Outcome", icon: "military_tech", placeholder: "Quantify impact: metrics, savings, recognition, or lessons learned." },
];

const STRONG_VERBS = [
  "led", "spearheaded", "architected", "built", "launched", "drove", "delivered", "designed",
  "implemented", "scaled", "mentored", "negotiated", "reduced", "increased", "optimized",
  "created", "transformed", "pioneered", "streamlined",
];

// Deterministic heuristic — no external LLM call.
function analyzeStar(data) {
  const filled = STEPS.filter((s) => (data[s.key] || "").trim().length > 0);
  if (filled.length === 0) {
    return { hasContent: false, summary: "Fill in Situation, Task, Action, and Result to generate an impact score.", impactScore: 0 };
  }
  const missing = STEPS.filter((s) => !(data[s.key] || "").trim()).map((s) => s.label);

  const resultText = data.result || "";
  const quantified = resultText.match(/\d+(\.\d+)?%?/g) || [];
  const actionText = (data.action || "").toLowerCase();
  const verbsUsed = STRONG_VERBS.filter((v) => actionText.includes(v));

  const completenessScore = (filled.length / STEPS.length) * 50;
  const quantScore = Math.min(30, quantified.length * 10);
  const verbScore = Math.min(20, verbsUsed.length * 7);
  const impactScore = Math.round(completenessScore + quantScore + verbScore);

  let summary;
  if (missing.length > 0) {
    summary = `Missing: ${missing.join(", ")}. A complete STAR story needs all four beats to land in an interview or review.`;
  } else if (quantified.length === 0) {
    summary = "Story structure is complete, but the Result has no quantified metrics — add a number to make the impact concrete.";
  } else if (verbsUsed.length === 0) {
    summary = `Result is well-quantified (${quantified.length} metric${quantified.length === 1 ? "" : "s"}), but Action could use stronger ownership verbs like "led" or "architected".`;
  } else {
    summary = `Strong narrative: ${verbsUsed.length} leadership verb${verbsUsed.length === 1 ? "" : "s"} and ${quantified.length} quantified result${quantified.length === 1 ? "" : "s"}.`;
  }

  let grade;
  if (impactScore >= 85) grade = "A";
  else if (impactScore >= 70) grade = "A-";
  else if (impactScore >= 55) grade = "B";
  else if (impactScore >= 40) grade = "C";
  else grade = "D";

  return { hasContent: true, summary, impactScore: Math.min(100, impactScore), grade, quantified, verbsUsed };
}

export default function StarFramework() {
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
        <div className="p-10 text-on-surface-variant">Loading STAR workspace…</div>
      </Layout>
    );
  }

  const analysis = analyzeStar(doc.data);
  const narrative = STEPS.map((s) => doc.data[s.key]).filter(Boolean).join(" ");
  const circumference = 2 * Math.PI * 34;

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">STAR Framework Workspace</div>
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
          Turn a project or accomplishment into a tight Situation → Task → Action → Result story
          for reviews, interviews, or portfolios.
        </p>

        <div className="flex items-center justify-end mb-4">
          <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" height="64" width="64">
                <circle cx="32" cy="32" r="26" fill="transparent" stroke="#dce9ff" strokeWidth="6" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="transparent"
                  stroke="#006970"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 - (analysis.impactScore / 100) * (2 * Math.PI * 26)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.5s" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-primary text-sm">
                {analysis.impactScore}
              </div>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Impact Score</p>
              <p className="text-secondary font-bold">{analysis.hasContent ? analysis.grade : "—"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {STEPS.map((step) => (
            <div key={step.key} className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <Icon name={step.icon} className="text-[20px]" />
                </div>
                <span className="text-[10px] font-semibold text-on-surface-variant/60">{step.label}</span>
              </div>
              <h3 className="font-bold text-primary mb-2">{step.title}</h3>
              <textarea
                value={doc.data[step.key]}
                onChange={(e) => updateField(step.key, e.target.value)}
                rows={5}
                placeholder={step.placeholder}
                className="w-full text-sm outline-none resize-none bg-transparent border-none p-0 focus:ring-0 placeholder:text-outline-variant"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="bg-primary p-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="auto_awesome" className="text-white text-[18px]" filled />
              </div>
              <h4 className="font-bold text-white">Polished Narrative</h4>
            </div>
            <div className="p-6">
              <p className="text-sm text-on-surface-variant italic leading-relaxed">
                {narrative || "Your polished narrative will assemble here as you fill in each STAR section…"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Feedback</h4>
            </div>
            <p className="text-sm text-on-surface mb-4">{analysis.summary}</p>
            {analysis.hasContent && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg text-center">
                  <p className="text-xs text-on-surface-variant">Metrics Found</p>
                  <p className="font-bold text-primary">{analysis.quantified.length}</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg text-center">
                  <p className="text-xs text-on-surface-variant">Strong Verbs</p>
                  <p className="font-bold text-primary">{analysis.verbsUsed.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
