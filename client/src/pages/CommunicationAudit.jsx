import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    scores: { clarity: 80, tone: 75, conciseness: 60 },
    redundantTerms: [],
    rewrites: [],
  };
}

const SCORE_META = {
  clarity: { label: "Clarity", hint: "Reading ease & structure" },
  tone: { label: "Tone Consistency", hint: "Sentiment & voice drift" },
  conciseness: { label: "Conciseness", hint: "Passive voice & filler density" },
};

// Deterministic heuristic — no external LLM call.
function analyzeAudit(data) {
  const scores = data.scores || {};
  const values = Object.values(scores).map(Number);
  if (values.length === 0) {
    return { hasContent: false, summary: "Score clarity, tone, and conciseness to generate an audit read." };
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const entries = Object.entries(scores);
  const weakest = entries.sort((a, b) => a[1] - b[1])[0];
  const weakestLabel = SCORE_META[weakest[0]]?.label || weakest[0];

  const rewrites = data.rewrites || [];
  const applied = rewrites.filter((r) => r.applied).length;
  const topTerm = [...(data.redundantTerms || [])].sort((a, b) => b.count - a.count)[0];

  let summary = `Overall content integrity averages ${Math.round(avg)}/100, with "${weakestLabel}" as the weakest dimension (${weakest[1]}/100).`;
  if (topTerm) {
    summary += ` "${topTerm.term}" is the top redundant phrase, appearing ${topTerm.count} times.`;
  }
  if (rewrites.length > 0) {
    summary += ` ${applied}/${rewrites.length} suggested rewrites have been applied.`;
  }

  return { hasContent: true, summary, avg: Math.round(avg), weakestLabel, applied, totalRewrites: rewrites.length, topTerm };
}

export default function CommunicationAudit() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newTerm, setNewTerm] = useState({ term: "", count: 1 });
  const [newRewrite, setNewRewrite] = useState({ original: "", rewrite: "" });
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
        <div className="p-10 text-on-surface-variant">Loading communication audit…</div>
      </Layout>
    );
  }

  const { scores, redundantTerms, rewrites } = doc.data;
  const analysis = analyzeAudit(doc.data);

  function setScore(key, value) {
    updateData({ scores: { ...scores, [key]: Number(value) } });
  }

  function addTerm() {
    if (!newTerm.term.trim()) return;
    updateData({
      redundantTerms: [...redundantTerms, { id: `t${Date.now()}`, term: newTerm.term.trim(), count: Number(newTerm.count) }],
    });
    setNewTerm({ term: "", count: 1 });
  }

  function removeTerm(tid) {
    updateData({ redundantTerms: redundantTerms.filter((t) => t.id !== tid) });
  }

  function addRewrite() {
    if (!newRewrite.original.trim() || !newRewrite.rewrite.trim()) return;
    updateData({
      rewrites: [...rewrites, { id: `r${Date.now()}`, original: newRewrite.original.trim(), rewrite: newRewrite.rewrite.trim(), applied: false }],
    });
    setNewRewrite({ original: "", rewrite: "" });
  }

  function toggleRewrite(rid) {
    updateData({ rewrites: rewrites.map((r) => (r.id === rid ? { ...r, applied: !r.applied } : r)) });
  }

  function removeRewrite(rid) {
    updateData({ rewrites: rewrites.filter((r) => r.id !== rid) });
  }

  const maxCount = Math.max(1, ...redundantTerms.map((t) => t.count));

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Communication Audit Dashboard</div>
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
          Audit content integrity across channels — track clarity, tone, and conciseness, and turn
          verbose drafts into tight rewrites.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Scoring vectors */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-6">Scoring Vectors</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(SCORE_META).map(([key, meta]) => (
                  <div key={key} className="p-5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="transparent" stroke="#e5eeff" strokeWidth="7" />
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          fill="transparent"
                          stroke="#006970"
                          strokeWidth="7"
                          strokeDasharray={2 * Math.PI * 34}
                          strokeDashoffset={2 * Math.PI * 34 - (scores[key] / 100) * (2 * Math.PI * 34)}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 0.4s" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-primary">
                        {scores[key]}
                      </div>
                    </div>
                    <p className="font-medium text-sm mb-1">{meta.label}</p>
                    <p className="text-xs text-on-surface-variant mb-3">{meta.hint}</p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores[key]}
                      onChange={(e) => setScore(key, e.target.value)}
                      className="w-full accent-secondary"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Redundancy tracker */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-2">Redundancy Tracker</h3>
              <p className="text-xs text-on-surface-variant mb-5">Terms overused across channels</p>
              <div className="space-y-3 mb-4">
                {redundantTerms.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 group">
                    <span className="text-sm w-40 truncate">{t.term}</span>
                    <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full"
                        style={{ width: `${(t.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant w-16 text-right">{t.count}x</span>
                    <button onClick={() => removeTerm(t.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                ))}
                {redundantTerms.length === 0 && <p className="text-sm text-on-surface-variant">No redundant terms tracked yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTerm.term}
                  onChange={(e) => setNewTerm((v) => ({ ...v, term: e.target.value }))}
                  placeholder="Phrase (e.g. 'Synergy Framework')"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <input
                  type="number"
                  min="1"
                  value={newTerm.count}
                  onChange={(e) => setNewTerm((v) => ({ ...v, count: e.target.value }))}
                  className="w-20 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <button onClick={addTerm} className="px-4 py-2 bg-secondary text-white rounded-md text-sm font-semibold">
                  Add
                </button>
              </div>
            </div>

            {/* Actionable rewrites */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant">
                <h3 className="text-lg font-bold text-primary">Actionable Rewrites</h3>
                <p className="text-sm text-on-surface-variant">Tighten verbose drafts into direct copy.</p>
              </div>
              <div className="divide-y divide-outline-variant/30">
                {rewrites.map((r) => (
                  <div key={r.id} className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-center">
                    <p className="text-sm italic text-on-surface-variant">"{r.original}"</p>
                    <Icon name="trending_flat" className="text-secondary opacity-50 hidden md:block" />
                    <p className="text-sm font-medium text-primary">"{r.rewrite}"</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRewrite(r.id)}
                        className={`p-2 rounded-full ${r.applied ? "bg-green-600" : "bg-secondary"} text-white`}
                      >
                        <Icon name={r.applied ? "done_all" : "check"} className="text-[16px]" />
                      </button>
                      <button onClick={() => removeRewrite(r.id)} className="p-2 text-on-surface-variant hover:text-error">
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                ))}
                {rewrites.length === 0 && <p className="p-6 text-sm text-on-surface-variant">No rewrites suggested yet.</p>}
              </div>
              <div className="p-6 bg-surface-container-lowest grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea
                  value={newRewrite.original}
                  onChange={(e) => setNewRewrite((v) => ({ ...v, original: e.target.value }))}
                  placeholder="Original verbose draft…"
                  rows={2}
                  className="text-sm border border-outline-variant rounded-md p-2 outline-none focus:border-secondary resize-none"
                />
                <textarea
                  value={newRewrite.rewrite}
                  onChange={(e) => setNewRewrite((v) => ({ ...v, rewrite: e.target.value }))}
                  placeholder="Tightened rewrite…"
                  rows={2}
                  className="text-sm border border-outline-variant rounded-md p-2 outline-none focus:border-secondary resize-none"
                />
                <button onClick={addRewrite} className="md:col-span-2 py-2 bg-primary text-white rounded-md text-sm font-semibold">
                  Add Rewrite
                </button>
              </div>
            </div>
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Insight Engine</h3>
            </div>
            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-4">
              <p className="text-sm text-on-surface">{analysis.summary}</p>
            </div>
            {analysis.hasContent && (
              <div className="pt-4 border-t border-outline-variant">
                <div className="flex justify-between items-center text-xs uppercase text-on-surface-variant mb-1">
                  <span>Overall Integrity</span>
                  <span className="text-secondary font-bold">{analysis.avg}/100</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full transition-all duration-500" style={{ width: `${analysis.avg}%` }} />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
