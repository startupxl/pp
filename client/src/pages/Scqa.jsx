import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const STEPS = [
  {
    key: "situation",
    letter: "S",
    label: "Situation",
    prompt: "Set the stable, agreed-upon context. What's the world like today?",
  },
  {
    key: "complication",
    letter: "C",
    label: "Complication",
    prompt: "What changed or went wrong to disrupt that stability?",
  },
  {
    key: "question",
    letter: "Q",
    label: "Question",
    prompt: "What question does the complication force your audience to ask?",
  },
  {
    key: "answer",
    letter: "A",
    label: "Answer",
    prompt: "Give the resolving answer — your recommendation or thesis.",
  },
];

function defaultData() {
  return { situation: "", complication: "", question: "", answer: "" };
}

export default function Scqa() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [activeStep, setActiveStep] = useState("situation");
  const [copied, setCopied] = useState(false);
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
        <div className="p-10 text-on-surface-variant">Loading SCQA workshop…</div>
      </Layout>
    );
  }

  const storyText = STEPS.map((s) => doc.data[s.key]).filter(Boolean).join(" ");

  function copyStory() {
    navigator.clipboard?.writeText(storyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function exportEmail() {
    const subject = encodeURIComponent(title || "SCQA Pitch");
    const body = encodeURIComponent(storyText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <Layout>
      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              SCQA Workshop
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
        <p className="text-on-surface-variant mb-6 max-w-2xl">
          Build a tight narrative: Situation, Complication, Question, Answer — the
          structure behind every good pitch.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="flex flex-col gap-4">
            {STEPS.map((step) => {
              const isActive = activeStep === step.key;
              return (
                <div
                  key={step.key}
                  className={`bg-white rounded-lg p-5 border-2 transition-opacity ${
                    isActive ? "border-secondary" : "border-outline-variant opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {step.letter}
                    </div>
                    <div className="font-semibold">{step.label}</div>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3 ml-11">{step.prompt}</p>
                  <textarea
                    value={doc.data[step.key]}
                    onChange={(e) => updateField(step.key, e.target.value)}
                    onFocus={() => setActiveStep(step.key)}
                    rows={3}
                    className="w-full ml-0 text-sm outline-none resize-none border border-outline-variant rounded-md p-3"
                    placeholder={`Write the ${step.label.toLowerCase()}…`}
                  />
                </div>
              );
            })}
          </div>

          <div className="lg:sticky lg:top-24 h-fit flex flex-col gap-4">
            <div className="bg-primary text-white rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase text-white/70">
                  Live Story Preview
                </div>
                <button onClick={copyStory} title="Copy to clipboard">
                  <Icon
                    name={copied ? "check" : "content_copy"}
                    className="text-[18px] text-white/80"
                  />
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
                {storyText || "Your story will build here as you fill in each step…"}
              </p>
            </div>
            <button
              onClick={exportEmail}
              className="flex items-center justify-center gap-2 bg-secondary text-white font-semibold py-3 rounded-md"
            >
              <Icon name="mail" className="text-[18px]" />
              Export as Pitch Email
            </button>
            <div className="bg-white border border-outline-variant rounded-lg p-4 text-sm text-on-surface-variant italic">
              "The best pitches don't sell an idea — they resolve a tension the audience
              already feels." — Workshop Tip
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
