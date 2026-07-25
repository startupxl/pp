import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const JOHARI_META = {
  open: {
    label: "Open Area",
    hint: "Known to self and others.",
    dot: "bg-secondary",
    chip: "bg-secondary-fixed text-on-secondary-fixed",
  },
  blind: {
    label: "Blind Spot",
    hint: "Known to others, not to self.",
    dot: "bg-error",
    chip: "bg-error-container text-on-error-container",
  },
  hidden: {
    label: "Hidden Area",
    hint: "Known to self, not to others.",
    dot: "bg-primary",
    chip: "bg-primary-container text-white",
  },
};

function defaultData() {
  return {
    competencies: [
      { id: "c1", name: "Strategic Vision", score: 4 },
      { id: "c2", name: "Operational Excellence", score: 4 },
      { id: "c3", name: "Emotional Intelligence", score: 3 },
      { id: "c4", name: "Team Development", score: 3 },
    ],
    johari: { open: [], blind: [], hidden: [] },
    keepDoing: [],
    startDoing: [],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeFeedback(data) {
  const competencies = data.competencies || [];
  if (competencies.length === 0) {
    return {
      hasContent: false,
      summary: "Add competency scores and quadrant notes to generate a read on blind spots.",
      avg: 0,
      weakest: null,
      blindSpotCount: 0,
    };
  }
  const avg = competencies.reduce((s, c) => s + Number(c.score || 0), 0) / competencies.length;
  const weakest = [...competencies].sort((a, b) => a.score - b.score)[0];
  const blindSpotCount = (data.johari?.blind || []).length;
  const keepCount = (data.keepDoing || []).length;
  const startCount = (data.startDoing || []).length;

  let summary;
  if (blindSpotCount >= 2) {
    summary = `${blindSpotCount} blind-spot themes were flagged — these are risks the respondents see that you likely don't. Address these before your next 1:1 cycle.`;
  } else if (weakest && weakest.score <= 3) {
    summary = `"${weakest.name}" is the lowest-rated competency (${weakest.score}/5). Pair it with a "Start Doing" action to close the gap.`;
  } else {
    summary = "Scores are consistently strong and no major blind spots were flagged — focus development on stretch goals rather than gap-closing.";
  }

  const balance =
    startCount > keepCount
      ? "More growth areas than reinforced strengths were raised — expect this cycle to feel like a stretch review."
      : "Feedback skews toward reinforcing existing strengths — good sign for retention, but watch for complacency.";

  return { hasContent: true, summary, avg: Math.round(avg * 10) / 10, weakest, blindSpotCount, balance };
}

export default function ThreeSixtyFeedback() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newJohari, setNewJohari] = useState({ open: "", blind: "", hidden: "" });
  const [newKeep, setNewKeep] = useState({ text: "", source: "" });
  const [newStart, setNewStart] = useState({ text: "", priority: "Medium" });
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
        <div className="p-10 text-on-surface-variant">Loading 360° feedback workshop…</div>
      </Layout>
    );
  }

  const { competencies, johari, keepDoing, startDoing } = doc.data;
  const analysis = analyzeFeedback(doc.data);

  function setScore(cid, score) {
    updateData({ competencies: competencies.map((c) => (c.id === cid ? { ...c, score } : c)) });
  }

  function addJohariItem(key) {
    const text = newJohari[key].trim();
    if (!text) return;
    updateData({ johari: { ...johari, [key]: [...(johari[key] || []), text] } });
    setNewJohari((v) => ({ ...v, [key]: "" }));
  }

  function removeJohariItem(key, idx) {
    updateData({ johari: { ...johari, [key]: johari[key].filter((_, i) => i !== idx) } });
  }

  function addKeep() {
    if (!newKeep.text.trim()) return;
    updateData({
      keepDoing: [...keepDoing, { id: `k${Date.now()}`, text: newKeep.text.trim(), source: newKeep.source.trim() || "Peer" }],
    });
    setNewKeep({ text: "", source: "" });
  }

  function removeKeep(kid) {
    updateData({ keepDoing: keepDoing.filter((k) => k.id !== kid) });
  }

  function addStart() {
    if (!newStart.text.trim()) return;
    updateData({
      startDoing: [...startDoing, { id: `s${Date.now()}`, text: newStart.text.trim(), priority: newStart.priority }],
    });
    setNewStart({ text: "", priority: "Medium" });
  }

  function removeStart(sid) {
    updateData({ startDoing: startDoing.filter((s) => s.id !== sid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              360-Degree Feedback Workshop
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
          Map self vs. external perception with the Johari Window, rate core competencies, and
          capture qualitative "keep doing" / "start doing" feedback.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Johari Window */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant">
                <h3 className="text-lg font-bold text-primary">Johari Window Analysis</h3>
                <p className="text-sm text-on-surface-variant">Self vs. external perception mapping</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                {["open", "blind", "hidden"].map((key) => {
                  const meta = JOHARI_META[key];
                  return (
                    <div key={key} className="border border-outline-variant rounded-lg p-4">
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </h4>
                      <p className="text-xs text-on-surface-variant mb-3">{meta.hint}</p>
                      <div className="flex flex-wrap gap-2 mb-3 min-h-[24px]">
                        {(johari[key] || []).map((item, idx) => (
                          <span key={idx} className={`px-2 py-1 text-xs rounded ${meta.chip} flex items-center gap-1`}>
                            {item}
                            <button onClick={() => removeJohariItem(key, idx)} className="hover:opacity-70">
                              <Icon name="close" className="text-[12px]" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        value={newJohari[key]}
                        onChange={(e) => setNewJohari((v) => ({ ...v, [key]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addJohariItem(key)}
                        placeholder="Add trait + Enter"
                        className="w-full text-xs border border-outline-variant rounded px-2 py-1.5 outline-none focus:border-secondary"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competency Scores */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-6">Competency Score</h3>
              <div className="space-y-6">
                {competencies.map((c) => (
                  <div key={c.id}>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-secondary font-semibold">{c.score.toFixed(1)}/5.0</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={c.score}
                      onChange={(e) => setScore(c.id, Number(e.target.value))}
                      className="w-full accent-secondary"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Keep Doing / Start Doing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="check_circle" className="text-secondary" filled />
                  <h3 className="font-bold text-primary">Keep Doing</h3>
                </div>
                <div className="space-y-3 mb-4">
                  {keepDoing.map((k) => (
                    <div key={k.id} className="p-3 rounded-lg border-l-4 border-secondary bg-surface-container-low group">
                      <p className="text-sm italic mb-1">"{k.text}"</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant">{k.source}</span>
                        <button onClick={() => removeKeep(k.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {keepDoing.length === 0 && <p className="text-sm text-on-surface-variant">No entries yet.</p>}
                </div>
                <textarea
                  value={newKeep.text}
                  onChange={(e) => setNewKeep((v) => ({ ...v, text: e.target.value }))}
                  placeholder="Quote or feedback to reinforce…"
                  className="w-full text-sm border border-outline-variant rounded-md p-2 outline-none focus:border-secondary resize-none mb-2"
                  rows={2}
                />
                <div className="flex gap-2">
                  <input
                    value={newKeep.source}
                    onChange={(e) => setNewKeep((v) => ({ ...v, source: e.target.value }))}
                    placeholder="Source (e.g. Peer)"
                    className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
                  />
                  <button onClick={addKeep} className="px-3 py-1.5 bg-secondary text-white rounded-md text-xs font-semibold">
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="rocket_launch" className="text-primary" />
                  <h3 className="font-bold text-primary">Start Doing</h3>
                </div>
                <div className="space-y-3 mb-4">
                  {startDoing.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg border-l-4 border-primary bg-surface-container-low group">
                      <p className="text-sm italic mb-1">"{s.text}"</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-0.5 bg-surface-container rounded">{s.priority}</span>
                        <button onClick={() => removeStart(s.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {startDoing.length === 0 && <p className="text-sm text-on-surface-variant">No entries yet.</p>}
                </div>
                <textarea
                  value={newStart.text}
                  onChange={(e) => setNewStart((v) => ({ ...v, text: e.target.value }))}
                  placeholder="Growth suggestion…"
                  className="w-full text-sm border border-outline-variant rounded-md p-2 outline-none focus:border-secondary resize-none mb-2"
                  rows={2}
                />
                <div className="flex gap-2">
                  <select
                    value={newStart.priority}
                    onChange={(e) => setNewStart((v) => ({ ...v, priority: e.target.value }))}
                    className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
                  >
                    <option>High Priority</option>
                    <option>Medium</option>
                    <option>Well-being</option>
                    <option>Growth Opportunity</option>
                  </select>
                  <button onClick={addStart} className="px-3 py-1.5 bg-primary text-white rounded-md text-xs font-semibold">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">AI Insights Summary</h3>
            </div>
            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-4">
              <p className="text-sm text-on-surface">{analysis.summary}</p>
            </div>
            {analysis.hasContent && (
              <>
                <div className="pt-4 border-t border-outline-variant mb-4">
                  <div className="flex justify-between items-center text-xs uppercase text-on-surface-variant mb-1">
                    <span>Average Score</span>
                    <span className="text-secondary font-bold">{analysis.avg}/5.0</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full transition-all duration-500" style={{ width: `${(analysis.avg / 5) * 100}%` }} />
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant">{analysis.balance}</p>
              </>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
