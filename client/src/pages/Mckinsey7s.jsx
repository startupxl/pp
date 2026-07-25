import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const ELEMENTS = [
  { key: "strategy", label: "Strategy", icon: "map", hard: true },
  { key: "structure", label: "Structure", icon: "account_tree", hard: true },
  { key: "systems", label: "Systems", icon: "settings_input_component", hard: true },
  { key: "shared_values", label: "Shared Values", icon: "diversity_3", hard: false, core: true },
  { key: "style", label: "Style", icon: "palette", hard: false },
  { key: "staff", label: "Staff", icon: "groups", hard: false },
  { key: "skills", label: "Skills", icon: "bolt", hard: false },
];

function defaultData() {
  return {
    elements: ELEMENTS.map((e) => ({ key: e.key, assessment: "", complete: false })),
  };
}

// Deterministic heuristic — no external LLM call.
function analyze7s(data) {
  const elements = data.elements || [];
  const completeCount = elements.filter((e) => e.complete).length;
  const harmony = elements.length ? Math.round((completeCount / elements.length) * 100) : 0;
  const hardComplete = elements.filter((e) => ELEMENTS.find((m) => m.key === e.key)?.hard && e.complete).length;
  const softComplete = elements.filter((e) => !ELEMENTS.find((m) => m.key === e.key)?.hard && e.complete).length;
  const gaps = elements.filter((e) => !e.complete).map((e) => ELEMENTS.find((m) => m.key === e.key)?.label);
  let tier = "Fragmented";
  if (harmony >= 85) tier = "Fully Aligned";
  else if (harmony >= 50) tier = "Emerging Alignment";
  return { harmony, hardComplete, softComplete, gaps, tier };
}

export default function Mckinsey7s() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [activeKey, setActiveKey] = useState(null);
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
        <div className="p-10 text-on-surface-variant">Loading McKinsey 7S workshop…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyze7s(data);
  const active = activeKey ? data.elements.find((e) => e.key === activeKey) : null;
  const activeMeta = activeKey ? ELEMENTS.find((e) => e.key === activeKey) : null;

  function updateElement(key, patch) {
    updateData({ elements: data.elements.map((e) => (e.key === key ? { ...e, ...patch } : e)) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">McKinsey 7S Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs uppercase text-on-surface-variant">Harmony Score</div>
              <div className="text-2xl font-bold text-secondary">{analysis.harmony}%</div>
            </div>
            <span className="text-sm text-on-surface-variant">{saveState}</span>
          </div>
        </div>
        <p className="text-on-surface-variant mb-6 max-w-2xl">{analysis.tier} — {analysis.gaps.length ? `${analysis.gaps.length} element(s) still need review: ${analysis.gaps.join(", ")}.` : "All elements have been reviewed."}</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-outline-variant shadow-sm p-6">
            <div className="grid grid-cols-3 gap-4">
              {ELEMENTS.map((meta) => {
                const el = data.elements.find((e) => e.key === meta.key);
                const isActive = activeKey === meta.key;
                return (
                  <button
                    key={meta.key}
                    onClick={() => setActiveKey(meta.key)}
                    className={`aspect-square rounded-full flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                      meta.core
                        ? "bg-primary text-white border-primary"
                        : el?.complete
                        ? "bg-secondary-container/30 border-secondary text-secondary"
                        : "bg-white border-outline-variant text-primary hover:border-secondary"
                    } ${isActive ? "scale-105 shadow-lg" : ""}`}
                  >
                    <Icon name={meta.icon} className="text-2xl" />
                    <span className="text-xs font-semibold">{meta.label}</span>
                    {el?.complete && <Icon name="check_circle" className="text-[14px]" filled />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl border border-outline-variant shadow-sm p-6">
            {!active ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                  <Icon name="touch_app" className="text-3xl text-on-surface-variant" />
                </div>
                <h3 className="font-bold text-primary mb-1">Diagnostic Mode</h3>
                <p className="text-sm text-on-surface-variant max-w-xs">Select an element from the 7S web to begin the alignment audit.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                    <Icon name={activeMeta.icon} className="text-secondary text-2xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">{activeMeta.label}</h3>
                    <p className="text-xs text-secondary">{activeMeta.hard ? "Hard Element" : "Soft Element"}</p>
                  </div>
                </div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">Current State Assessment</label>
                <textarea
                  value={active.assessment}
                  onChange={(e) => updateElement(active.key, { assessment: e.target.value })}
                  className="w-full h-28 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm outline-none focus:border-secondary resize-none mb-4"
                  placeholder={`Describe the current ${activeMeta.label.toLowerCase()}...`}
                />
                <button
                  onClick={() => updateElement(active.key, { complete: !active.complete })}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    active.complete ? "bg-secondary-container text-on-secondary-container" : "bg-primary text-white hover:opacity-90"
                  }`}
                >
                  {active.complete ? "Marked Complete ✓" : "Mark as Complete & Update Harmony"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-secondary-container/10 border border-secondary/10 rounded-2xl p-6 flex items-center gap-3">
          <Icon name="lightbulb" className="text-secondary" />
          <p className="text-sm text-on-surface-variant">
            Hard elements reviewed: <strong className="text-primary">{analysis.hardComplete}/3</strong> · Soft elements reviewed: <strong className="text-primary">{analysis.softComplete}/4</strong>. Strong alignment on Shared Values tends to reduce operational friction the most.
          </p>
        </div>
      </div>
    </Layout>
  );
}
