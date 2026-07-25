import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return { what: "", why: "", how: "" };
}

const JARGON_WORDS = [
  "synergy", "synergies", "leverage", "paradigm", "disruptive", "best-in-class", "cutting-edge",
  "holistic", "ecosystem", "value-add", "bandwidth", "circle back", "low-hanging fruit",
  "move the needle", "boil the ocean", "game-changer", "turnkey", "robust solution",
];
const ABSOLUTE_WORDS = ["always", "never", "guaranteed", "100% certain", "no one else", "best in the world", "impossible", "everyone agrees"];

function jargonHits(text) {
  const lower = text.toLowerCase();
  return JARGON_WORDS.filter((w) => lower.includes(w));
}

// Deterministic heuristic — no external LLM call.
function analyzeInitiative(data) {
  const { what, why, how } = data;
  const fields = [what, why, how];
  const filled = fields.filter((f) => f.trim().length > 0).length;

  if (filled === 0) {
    return {
      hasContent: false,
      clarity: 0,
      biasStatus: "Neutral",
      pitch: "",
      jargon: [],
    };
  }

  const combined = `${what} ${why} ${how}`;
  const jargon = jargonHits(combined);
  const digitMatches = combined.match(/\d+(\.\d+)?%?/g) || [];
  const absoluteHits = ABSOLUTE_WORDS.filter((w) => combined.toLowerCase().includes(w));

  const completeness = (filled / fields.length) * 55;
  const jargonPenalty = Math.min(25, jargon.length * 8);
  const evidenceBonus = Math.min(20, digitMatches.length * 7);
  const biasPenalty = Math.min(15, absoluteHits.length * 8);

  const clarity = Math.max(5, Math.min(99, Math.round(completeness - jargonPenalty + evidenceBonus - biasPenalty)));

  const biasStatus = absoluteHits.length > 0 ? "Flagged" : "Neutral";

  const pitch =
    filled === 3
      ? `We are building ${what.trim().replace(/\.$/, "")}. This is vital because ${why.trim().replace(/\.$/, "").toLowerCase()}. To achieve this, our immediate strategy focuses on ${how
          .trim()
          .replace(/\.$/, "")
          .toLowerCase()}.`
      : "";

  return { hasContent: true, clarity, biasStatus, pitch, jargon, absoluteHits, digitCount: digitMatches.length, filled };
}

export default function InitiativeWorkshop() {
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
        <div className="p-10 text-on-surface-variant">Loading Initiative workshop…</div>
      </Layout>
    );
  }

  const analysis = analyzeInitiative(doc.data);

  function copyPitch() {
    navigator.clipboard?.writeText(analysis.pitch);
  }

  const STEPS = [
    { key: "what", icon: "lightbulb", label: "The What", hint: "Definition & Scope", placeholder: "What is the core initiative? Define it in 2-3 sentences without jargon…" },
    { key: "why", icon: "trending_up", label: "The Why", hint: "Business Rationale", placeholder: "Why does this matter now? What are the key ROI drivers or competitive advantages?" },
    { key: "how", icon: "rocket_launch", label: "The How", hint: "Implementation Path", placeholder: "List the first critical milestones to prove the hypothesis…" },
  ];

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex justify-between items-end flex-wrap gap-4 mb-2">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Initiative Framework: What → Why → How</div>
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
          Transform a raw idea into a high-conviction strategy pitch using the clarity-first
          What → Why → How method.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.key} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-secondary-container/30 rounded-lg flex items-center justify-center">
                  <Icon name={step.icon} className="text-secondary text-[26px]" filled />
                </div>
                <div>
                  <span className="block text-secondary font-bold text-xs uppercase tracking-wider">Step 0{i + 1}</span>
                  <h3 className="font-bold text-primary">{step.label}</h3>
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-on-surface-variant mb-1 block">{step.hint}</span>
                <textarea
                  value={doc.data[step.key]}
                  onChange={(e) => updateField(step.key, e.target.value)}
                  rows={5}
                  placeholder={step.placeholder}
                  className="w-full text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Synthesis */}
          <div className="bg-white rounded-xl border-2 border-secondary/20 shadow-sm overflow-hidden">
            <div className="bg-primary px-6 py-4 flex items-center gap-3">
              <Icon name="auto_fix" className="text-secondary-fixed" />
              <h3 className="font-bold text-white">The Coherent Pitch</h3>
            </div>
            <div className="p-6">
              {analysis.pitch ? (
                <>
                  <p className="text-on-surface-variant leading-relaxed mb-4">{analysis.pitch}</p>
                  <button onClick={copyPitch} className="flex items-center gap-2 text-secondary text-sm font-semibold hover:underline">
                    <Icon name="content_copy" className="text-[16px]" />
                    Copy to Clipboard
                  </button>
                </>
              ) : (
                <p className="text-on-surface-variant italic">
                  Fill in What, Why, and How to synthesize a coherent elevator pitch.
                </p>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Clarity Score</p>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
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
                      strokeDashoffset={2 * Math.PI * 40 - (analysis.clarity / 100) * (2 * Math.PI * 40)}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.5s" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-primary">{analysis.clarity}%</span>
                  </div>
                </div>
              </div>
              {analysis.hasContent && analysis.jargon.length > 0 && (
                <p className="text-xs text-error text-center">Jargon detected: {analysis.jargon.join(", ")}</p>
              )}
            </div>

            <div className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon name="verified_user" className="text-secondary" />
                <span className="text-sm font-semibold">Bias Check: {analysis.biasStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="memory" className="text-secondary" />
                <span className="text-sm font-semibold">Model: Deterministic Heuristic</span>
              </div>
              {analysis.hasContent && analysis.absoluteHits?.length > 0 && (
                <p className="text-xs text-error">Absolute language: {analysis.absoluteHits.join(", ")}</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
