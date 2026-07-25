import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    personaName: "",
    says: [],
    does: [],
    thinks: [],
    feels: [],
    pains: [],
    gains: [],
  };
}

const QUADRANTS = [
  { key: "says", label: "Says", icon: "forum" },
  { key: "does", label: "Does", icon: "touch_app" },
  { key: "thinks", label: "Thinks", icon: "psychology" },
  { key: "feels", label: "Feels", icon: "favorite" },
];

// Deterministic heuristic — no external LLM call.
function analyzeEmpathy(data) {
  const filledQuadrants = QUADRANTS.filter((q) => (data[q.key] || []).length > 0).length;
  const totalNotes = QUADRANTS.reduce((s, q) => s + (data[q.key] || []).length, 0);
  const pains = data.pains || [];
  const gains = data.gains || [];

  const completeness = Math.round((filledQuadrants / QUADRANTS.length) * 60 + Math.min(20, totalNotes * 2));
  const balanceBonus = pains.length > 0 && gains.length > 0 ? 20 : 0;
  const empathyScore = Math.min(100, completeness + balanceBonus);

  let insight = "Fill in each quadrant and list pains/gains to surface a persona insight.";
  if (pains.length > 0 || gains.length > 0) {
    const dominant = pains.length > gains.length ? "pain-dominant" : gains.length > pains.length ? "gain-dominant" : "balanced";
    if (dominant === "pain-dominant") {
      insight = `This persona's experience is currently pain-dominant (${pains.length} pains vs ${gains.length} gains). Prioritize removing the top friction point before pitching new value.`;
    } else if (dominant === "gain-dominant") {
      insight = `This persona's experience skews toward desired gains (${gains.length} vs ${pains.length} pains). Lead your pitch with the outcomes they're already reaching for.`;
    } else {
      insight = `Pains and gains are balanced (${pains.length} each). A pitch framed as "remove X, unlock Y" will likely resonate.`;
    }
  }

  return { filledQuadrants, totalNotes, empathyScore, insight };
}

function QuadrantCard({ label, icon, items, onAdd, onRemove, draft, setDraft }) {
  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon name={icon} className="text-secondary" />
        <h3 className="font-bold text-primary">{label}</h3>
      </div>
      <div className="flex flex-wrap gap-3 min-h-[60px]">
        {items.map((note, i) => (
          <div key={i} className="group relative bg-secondary-container/40 text-on-secondary-container text-sm p-3 rounded-lg shadow-sm max-w-[220px]">
            {note}
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-outline-variant text-on-surface-variant opacity-0 group-hover:opacity-100 flex items-center justify-center"
            >
              <Icon name="close" className="text-[12px]" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-on-surface-variant italic">No notes yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={`What do they ${label.toLowerCase()}...`}
          className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary"
        />
        <button onClick={onAdd} className="px-3 bg-primary text-white rounded-lg">
          <Icon name="add" className="text-[16px]" />
        </button>
      </div>
    </div>
  );
}

export default function EmpathyMap() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [drafts, setDrafts] = useState({ says: "", does: "", thinks: "", feels: "", pains: "", gains: "" });
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
        <div className="p-10 text-on-surface-variant">Loading empathy map…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeEmpathy(data);

  function addNote(key) {
    const val = drafts[key].trim();
    if (!val) return;
    updateData({ [key]: [...(data[key] || []), val] });
    setDrafts((d) => ({ ...d, [key]: "" }));
  }

  function removeNote(key, idx) {
    updateData({ [key]: (data[key] || []).filter((_, i) => i !== idx) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Empathy Map Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <label className="block max-w-md mb-8">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Target persona</span>
          <input
            value={data.personaName}
            onChange={(e) => updateData({ personaName: e.target.value })}
            placeholder="e.g. Alex, The Builder"
            className="w-full mt-1 text-lg font-bold border-b border-outline-variant bg-transparent outline-none focus:border-secondary py-1"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {QUADRANTS.map((q) => (
            <QuadrantCard
              key={q.key}
              label={q.label}
              icon={q.icon}
              items={data[q.key] || []}
              onAdd={() => addNote(q.key)}
              onRemove={(i) => removeNote(q.key, i)}
              draft={drafts[q.key]}
              setDraft={(v) => setDrafts((d) => ({ ...d, [q.key]: v }))}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-error-container/20 border border-error/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3 text-error">
              <Icon name="warning" />
              <span className="text-xs font-bold uppercase tracking-wider">Pain Points</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(data.pains || []).map((p, i) => (
                <span key={i} className="group relative bg-white border border-error/10 px-3 py-1.5 rounded-full text-sm text-on-error-container">
                  {p}
                  <button onClick={() => removeNote("pains", i)} className="ml-2 opacity-40 hover:opacity-100">×</button>
                </span>
              ))}
              {(data.pains || []).length === 0 && <p className="text-sm text-on-surface-variant italic">No pain points yet.</p>}
            </div>
            <div className="flex gap-2">
              <input value={drafts.pains} onChange={(e) => setDrafts((d) => ({ ...d, pains: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addNote("pains")} placeholder="Add a pain point…" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-error" />
              <button onClick={() => addNote("pains")} className="px-3 bg-error text-white rounded-lg"><Icon name="add" className="text-[16px]" /></button>
            </div>
          </div>
          <div className="bg-secondary-container/20 border border-secondary/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3 text-secondary">
              <Icon name="trending_up" />
              <span className="text-xs font-bold uppercase tracking-wider">Desired Gains</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(data.gains || []).map((g, i) => (
                <span key={i} className="group relative bg-white border border-secondary/10 px-3 py-1.5 rounded-full text-sm text-on-secondary-container">
                  {g}
                  <button onClick={() => removeNote("gains", i)} className="ml-2 opacity-40 hover:opacity-100">×</button>
                </span>
              ))}
              {(data.gains || []).length === 0 && <p className="text-sm text-on-surface-variant italic">No desired gains yet.</p>}
            </div>
            <div className="flex gap-2">
              <input value={drafts.gains} onChange={(e) => setDrafts((d) => ({ ...d, gains: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addNote("gains")} placeholder="Add a desired gain…" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
              <button onClick={() => addNote("gains")} className="px-3 bg-secondary text-white rounded-lg"><Icon name="add" className="text-[16px]" /></button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-6 flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="transparent" stroke="#e5eeff" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="transparent"
                stroke="#006970"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 - (analysis.empathyScore / 100) * (2 * Math.PI * 34)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-primary">{analysis.empathyScore}%</div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-secondary tracking-wider mb-1">Empathy Insight</p>
            <p className="text-sm text-on-surface-variant">{analysis.insight}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
