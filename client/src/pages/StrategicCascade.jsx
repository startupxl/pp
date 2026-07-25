import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const STEP_CONFIG = [
  {
    key: "aspiration",
    title: "Winning Aspiration",
    prompt: "What is our purpose? What does winning look like for us?",
    type: "text",
    placeholder: "e.g. To become the essential tool for X, reaching Y users by Z with N% retention.",
  },
  {
    key: "whereToPlay",
    title: "Where to Play",
    prompt: "Which geographies, segments, and channels will we target?",
    type: "tags",
    placeholder: "e.g. SaaS solopreneurs, English-speaking markets, Product-led growth",
  },
  {
    key: "howToWin",
    title: "How to Win",
    prompt: "What is our value proposition? How will we differentiate from competitors?",
    type: "howToWin",
  },
  {
    key: "capabilities",
    title: "Capabilities",
    prompt: "What set of activities will allow us to win?",
    type: "text",
    placeholder: "e.g. Proprietary data pipeline, world-class support team, rapid iteration cadence.",
  },
  {
    key: "managementSystems",
    title: "Management Systems",
    prompt: "What systems, structures, and measures support our choices?",
    type: "text",
    placeholder: "e.g. Weekly OKR reviews, customer health scoring, quarterly capability audits.",
  },
];

const ADVANTAGE_OPTIONS = [
  "Differentiation (Premium Experience)",
  "Low Cost (High Efficiency)",
  "Niche Focus (Deep Expertise)",
];

function isComplete(step) {
  if (!step) return false;
  if (step.type === "tags") return (step.tags || []).length > 0;
  if (step.type === "howToWin") return Boolean((step.description || "").trim());
  return Boolean((step.value || "").trim());
}

export default function StrategicCascade() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [editingKey, setEditingKey] = useState(null);
  const [tagDraft, setTagDraft] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
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

  function updateStep(key, patch) {
    const steps = doc.data?.steps || {};
    updateData({ steps: { ...steps, [key]: { ...steps[key], ...patch } } });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading strategic cascade…</div>
      </Layout>
    );
  }

  const steps = doc.data?.steps || {};
  const completedFlags = STEP_CONFIG.map((cfg) => isComplete(steps[cfg.key]));
  const completedCount = completedFlags.filter(Boolean).length;
  const firstIncompleteIndex = completedFlags.findIndex((c) => !c);
  const activeIndex = firstIncompleteIndex === -1 ? STEP_CONFIG.length - 1 : firstIncompleteIndex;
  const progressPct = Math.round((completedCount / STEP_CONFIG.length) * 100);

  function addTag() {
    if (!tagDraft.trim()) return;
    const step = steps.whereToPlay || {};
    updateStep("whereToPlay", { tags: [...(step.tags || []), tagDraft.trim()] });
    setTagDraft("");
  }

  function removeTag(tag) {
    const step = steps.whereToPlay || {};
    updateStep("whereToPlay", { tags: (step.tags || []).filter((t) => t !== tag) });
  }

  return (
    <Layout>
      <div className="max-w-[1000px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1 flex items-center gap-2">
              <Icon name="stars" className="text-[16px]" filled />
              Strategic Choice Cascade · Lafley &amp; Martin Framework
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

        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-outline-variant shadow-sm mb-10">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">CASCADE PROGRESS</span>
            <span className="text-xl font-bold text-primary">{progressPct}% Complete</span>
          </div>
          <div className="flex gap-3">
            {STEP_CONFIG.map((cfg, i) => {
              const done = completedFlags[i];
              const isActive = i === activeIndex && !done;
              return (
                <div
                  key={cfg.key}
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${
                    done
                      ? "bg-secondary text-white"
                      : isActive
                      ? "bg-secondary-container text-on-secondary-container border-2 border-secondary animate-pulse"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {done ? <Icon name="check" className="text-[18px]" filled /> : i + 1}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          {STEP_CONFIG.map((cfg, i) => {
            const step = steps[cfg.key] || {};
            const done = completedFlags[i];
            const locked = i > activeIndex && !done;
            const editing = editingKey === cfg.key || (i === activeIndex && !done);

            if (locked) {
              return (
                <div key={cfg.key} className="bg-surface-container/30 rounded-2xl p-8 border border-outline-variant/30">
                  <div className="flex items-center gap-4">
                    <Icon name="lock" className="text-outline" />
                    <div>
                      <span className="text-xs font-bold text-on-surface-variant">
                        STEP {i + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-on-surface-variant/70">
                        {cfg.title}
                      </h3>
                      <p className="text-sm text-on-surface-variant/50">{cfg.prompt}</p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cfg.key}
                className={`bg-white rounded-2xl p-8 border-l-4 border-secondary transition-all ${
                  editing ? "shadow-xl ring-2 ring-secondary/20" : "opacity-90 hover:opacity-100"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-secondary">STEP {i + 1}</span>
                    <h3 className="text-lg font-bold text-primary">{cfg.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{cfg.prompt}</p>
                  </div>
                  {!editing && (
                    <button
                      onClick={() => setEditingKey(cfg.key)}
                      className="text-secondary text-sm font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {!editing ? (
                  <StepSummary step={step} cfg={cfg} />
                ) : (
                  <div className="space-y-4">
                    {cfg.type === "text" && (
                      <textarea
                        value={step.value || ""}
                        onChange={(e) => updateStep(cfg.key, { value: e.target.value })}
                        placeholder={cfg.placeholder}
                        rows={3}
                        className="w-full bg-surface-container-low rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-secondary/30 resize-none"
                      />
                    )}
                    {cfg.type === "tags" && (
                      <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(step.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm"
                            >
                              {tag}
                              <button onClick={() => removeTag(tag)} className="hover:text-error">
                                <Icon name="close" className="text-[14px]" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTag()}
                            placeholder={cfg.placeholder}
                            className="flex-1 border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary"
                          />
                          <button
                            onClick={addTag}
                            className="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-semibold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                    {cfg.type === "howToWin" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-primary">
                              Competitive Advantage
                            </label>
                            <select
                              value={step.advantage || ADVANTAGE_OPTIONS[0]}
                              onChange={(e) => updateStep(cfg.key, { advantage: e.target.value })}
                              className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary"
                            >
                              {ADVANTAGE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-primary">
                              Key Value Driver
                            </label>
                            <input
                              value={step.valueDriver || ""}
                              onChange={(e) => updateStep(cfg.key, { valueDriver: e.target.value })}
                              placeholder="e.g., Unmatched Speed"
                              className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-primary">
                            Detailed Strategy Description
                          </label>
                          <textarea
                            value={step.description || ""}
                            onChange={(e) => updateStep(cfg.key, { description: e.target.value })}
                            placeholder="How do you intend to win in the chosen market?"
                            rows={4}
                            className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary resize-none"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      {editingKey === cfg.key && (
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-5 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => setEditingKey(null)}
                        disabled={!isComplete(step)}
                        className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-40 transition-all"
                      >
                        Save &amp; Continue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-surface-container-low rounded-xl p-4 flex items-start gap-2 text-sm text-on-surface-variant">
          <Icon name="info" className="text-[18px] mt-0.5 shrink-0" />
          <span>
            Choices cascade down. Decisions made in Step 1 influence the constraints and
            opportunities for Step 5. Framework by A.G. Lafley and Roger Martin.
          </span>
        </div>
      </div>

      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-4">
        {assistantOpen && (
          <div className="bg-white p-4 rounded-2xl shadow-2xl border border-outline-variant max-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <Icon name="smart_toy" className="text-[14px] text-white" />
              </div>
              <span className="text-sm font-semibold text-primary">Strategic Assistant</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {steps.aspiration?.value
                ? `Based on your Winning Aspiration, make sure Step 3's "How to Win" choice directly supports it — don't let them drift apart.`
                : "Fill in your Winning Aspiration first — every later step should trace back to it."}
            </p>
          </div>
        )}
        <button
          onClick={() => setAssistantOpen((v) => !v)}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <Icon name="psychology" className="text-[24px]" filled />
        </button>
      </div>
    </Layout>
  );
}

function StepSummary({ step, cfg }) {
  if (cfg.type === "tags") {
    return (
      <div className="flex gap-2 flex-wrap">
        {(step.tags || []).map((tag) => (
          <span key={tag} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">
            {tag}
          </span>
        ))}
      </div>
    );
  }
  if (cfg.type === "howToWin") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2 text-sm">
          <span className="font-semibold text-primary">{step.advantage}</span>
          {step.valueDriver && (
            <span className="text-on-surface-variant">· {step.valueDriver}</span>
          )}
        </div>
        <p className="text-sm text-on-surface-variant">{step.description}</p>
      </div>
    );
  }
  return (
    <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface italic text-sm">
      "{step.value}"
    </div>
  );
}
