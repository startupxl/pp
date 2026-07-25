import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const CRITERIA = [
  { key: "valuable", label: "Valuable", hint: "Reduces costs or increases customer value." },
  { key: "unique", label: "Unique", hint: "Rare and difficult for rivals to replicate." },
  { key: "extendable", label: "Extendable", hint: "Applies to a wide variety of markets." },
];

function tierFor(c) {
  const score = [c.valuable, c.unique, c.extendable].filter(Boolean).length;
  if (score === 3) return { label: "Core Competency", tone: "core" };
  if (score === 2) return { label: "Strong Asset", tone: "strong" };
  return { label: "Developing", tone: "dev" };
}

const TONE_BADGE = {
  core: "bg-secondary-fixed text-on-secondary-fixed",
  strong: "bg-surface-container text-on-surface-variant",
  dev: "bg-surface-container text-on-surface-variant",
};

// Deterministic heuristic — no external LLM call, mirrors server/analysisEngine.js style.
function analyzeCompetencies(competencies) {
  if (competencies.length === 0) {
    return {
      hasContent: false,
      recommendation: "Add capabilities to the audit to get a strategic read on your moat.",
      risk: null,
      corePct: 0,
    };
  }
  const scored = competencies.map((c) => ({
    ...c,
    score: [c.valuable, c.unique, c.extendable].filter(Boolean).length,
  }));
  const core = scored.filter((c) => c.score === 3);
  const corePct = Math.round((core.length / scored.length) * 100);
  const strongest = [...scored].sort((a, b) => b.score - a.score)[0];

  let recommendation;
  if (core.length > 0) {
    const top = [...core].sort((a, b) => b.score - a.score)[0];
    recommendation = `"${top.name}" is a true core competency — valuable, unique, and extendable. Prioritize R&D and defensive investment (patents, exclusivity) here before diversifying.`;
  } else if (strongest.score === 2) {
    recommendation = `"${strongest.name}" is a strong asset but is missing one dimension. Closing that gap would turn it into a defensible core competency.`;
  } else {
    recommendation = "No entry yet scores on more than one dimension — focus on deepening your strongest capability rather than adding new ones.";
  }

  const developing = scored.filter((c) => c.score <= 1);
  const risk =
    developing.length > 0
      ? `${developing.length} ${developing.length === 1 ? "capability is" : "capabilities are"} still in the Developing tier — these won't hold up as a durable advantage yet.`
      : null;

  return { hasContent: true, recommendation, risk, corePct, strongest };
}

export default function CoreCompetency() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newItem, setNewItem] = useState({ name: "", description: "" });
  const [newTag, setNewTag] = useState("");
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

  const competencies = doc?.data?.competencies || [];
  const notes = doc?.data?.notes || "";
  const tags = doc?.data?.tags || [];

  function toggleCriterion(cid, key) {
    updateData({
      competencies: competencies.map((c) => (c.id === cid ? { ...c, [key]: !c[key] } : c)),
    });
  }

  function addCompetency() {
    if (!newItem.name.trim()) return;
    updateData({
      competencies: [
        ...competencies,
        {
          id: `cap${Date.now()}`,
          name: newItem.name.trim(),
          description: newItem.description.trim(),
          valuable: false,
          unique: false,
          extendable: false,
        },
      ],
    });
    setNewItem({ name: "", description: "" });
  }

  function removeCompetency(cid) {
    updateData({ competencies: competencies.filter((c) => c.id !== cid) });
  }

  function addTag() {
    if (!newTag.trim()) return;
    updateData({ tags: [...tags, newTag.trim()] });
    setNewTag("");
  }

  function removeTag(t) {
    updateData({ tags: tags.filter((x) => x !== t) });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading competency audit…</div>
      </Layout>
    );
  }

  const analysis = analyzeCompetencies(competencies);
  const counts = CRITERIA.reduce((acc, crit) => {
    acc[crit.key] = competencies.filter((c) => c[crit.key]).length;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Core Competency Auditor
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

        <p className="text-on-surface-variant max-w-2xl mb-8">
          Identify and refine the unique strengths that form your competitive advantage. True core
          competencies are valuable, unique, and extendable across multiple markets.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Strategic Intersection */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-primary">Strategic Intersection</h3>
                  <p className="text-xs text-on-surface-variant">
                    Live count of capabilities meeting each criterion
                  </p>
                </div>
                <Icon name="analytics" className="text-secondary" />
              </div>
              <div className="flex items-center justify-center py-6">
                <svg viewBox="0 0 400 300" className="w-full max-w-[420px]">
                  <circle cx="180" cy="120" r="100" fill="#006970" fillOpacity="0.15" stroke="#006970" strokeWidth="1" />
                  <text x="180" y="45" textAnchor="middle" className="fill-secondary font-bold" style={{ fontSize: 13 }}>
                    VALUABLE ({counts.valuable})
                  </text>
                  <circle cx="130" cy="200" r="100" fill="#041627" fillOpacity="0.15" stroke="#041627" strokeWidth="1" />
                  <text x="75" y="255" textAnchor="middle" className="fill-primary font-bold" style={{ fontSize: 13 }}>
                    UNIQUE ({counts.unique})
                  </text>
                  <circle cx="230" cy="200" r="100" fill="#4f6073" fillOpacity="0.15" stroke="#4f6073" strokeWidth="1" />
                  <text x="285" y="255" textAnchor="middle" style={{ fontSize: 13, fill: "#4f6073", fontWeight: "bold" }}>
                    EXTENDABLE ({counts.extendable})
                  </text>
                  <rect x="140" y="150" width="80" height="34" rx="17" fill="#FFFFFF" />
                  <text x="180" y="171" textAnchor="middle" className="fill-primary font-bold" style={{ fontSize: 11 }}>
                    CORE EDGE
                  </text>
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-outline-variant/50">
                {CRITERIA.map((c) => (
                  <div key={c.key} className="text-center">
                    <p className="text-xs uppercase text-on-surface-variant mb-1">{c.label}</p>
                    <p className="text-sm">{c.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities Audit */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-5">Capabilities Audit</h3>
              <div className="space-y-4">
                {competencies.map((c) => {
                  const tier = tierFor(c);
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-outline-variant hover:border-secondary/40 transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-tight ${TONE_BADGE[tier.tone]}`}
                        >
                          {tier.label}
                        </span>
                        <button
                          onClick={() => removeCompetency(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                        >
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-primary mb-1">{c.name}</h4>
                      {c.description && (
                        <p className="text-sm text-on-surface-variant mb-3">{c.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {CRITERIA.map((crit) => (
                          <button
                            key={crit.key}
                            onClick={() => toggleCriterion(c.id, crit.key)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                              c[crit.key]
                                ? "bg-secondary text-white border-secondary"
                                : "bg-surface-container text-on-surface-variant border-outline-variant"
                            }`}
                          >
                            {crit.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {competencies.length === 0 && (
                  <p className="text-sm text-on-surface-variant">
                    No capabilities added yet — add your first below.
                  </p>
                )}
              </div>
              <div className="mt-5 space-y-2">
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Capability name (e.g. Proprietary ML pipeline)"
                  className="w-full text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <input
                  value={newItem.description}
                  onChange={(e) => setNewItem((v) => ({ ...v, description: e.target.value }))}
                  placeholder="Short description (optional)"
                  className="w-full text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <button
                  onClick={addCompetency}
                  disabled={!newItem.name.trim()}
                  className="w-full border-2 border-dashed border-outline-variant rounded-xl py-3 text-sm font-semibold text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Icon name="add_circle" className="text-[18px]" />
                  Add Capability to Audit
                </button>
              </div>
            </div>

            {/* Strategic Sandbox */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="edit_note" className="text-on-surface-variant" />
                <h3 className="text-lg font-bold text-primary">Strategic Sandbox</h3>
              </div>
              <textarea
                value={notes}
                onChange={(e) => updateData({ notes: e.target.value })}
                placeholder="Synthesize your audit findings here. How will these core competencies define your 3-year roadmap?"
                className="w-full h-32 bg-surface-container-low border-none rounded-xl p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40"
              />
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1.5 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-xs flex items-center gap-1"
                  >
                    <Icon name="tag" className="text-[14px]" />
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-error">
                      <Icon name="close" className="text-[12px]" />
                    </button>
                  </span>
                ))}
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag + Enter"
                  className="text-xs border border-outline-variant rounded-full px-3 py-1.5 outline-none focus:border-secondary w-36"
                />
              </div>
            </div>
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                AI Insights
              </h3>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-4">
              <p className="text-xs font-bold text-secondary mb-1">STRATEGIC RECOMMENDATION</p>
              <p className="text-sm text-on-surface">{analysis.recommendation}</p>
            </div>

            {analysis.risk && (
              <div className="p-4 bg-error-container/30 rounded-xl border border-error/20 mb-4">
                <p className="text-xs font-bold text-error mb-1">COMPETITIVE RISK</p>
                <p className="text-sm text-on-surface">{analysis.risk}</p>
              </div>
            )}

            <div className="pt-4 border-t border-outline-variant">
              <div className="flex justify-between items-center text-xs uppercase text-on-surface-variant mb-1">
                <span>Core Competency Rate</span>
                <span className="text-secondary font-bold">{analysis.corePct}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full transition-all duration-500"
                  style={{ width: `${analysis.corePct}%` }}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                {competencies.length} capabilit{competencies.length === 1 ? "y" : "ies"} audited
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
