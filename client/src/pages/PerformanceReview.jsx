import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    employeeName: "",
    role: "",
    reviewCycle: "",
    manager: "",
    competencies: [
      { id: "execution", name: "Execution", rating: 4, notes: "" },
      { id: "culture", name: "Culture", rating: 4, notes: "" },
      { id: "strategy", name: "Strategy", rating: 3, notes: "" },
      { id: "growth", name: "Growth", rating: 4, notes: "" },
    ],
    okrs: [],
    developmentGoals: [],
    strengths: "",
    improvements: "",
    managerNotes: "",
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeReview(data) {
  const competencies = data.competencies || [];
  const okrs = data.okrs || [];
  const goals = data.developmentGoals || [];

  if (competencies.length === 0) {
    return { hasContent: false, summary: "Rate competencies and add OKRs to generate a review synthesis." };
  }

  const avgRating = competencies.reduce((s, c) => s + Number(c.rating || 0), 0) / competencies.length;
  const weakest = [...competencies].sort((a, b) => a.rating - b.rating)[0];
  const strongest = [...competencies].sort((a, b) => b.rating - a.rating)[0];
  const okrAvg = okrs.length ? okrs.reduce((s, o) => s + Number(o.progress || 0), 0) / okrs.length : null;
  const goalsDone = goals.filter((g) => g.done).length;

  let summary = `Overall rating averages ${avgRating.toFixed(1)}/5, led by "${strongest.name}".`;
  if (weakest.rating <= 3) {
    summary += ` "${weakest.name}" is the lowest scoring area (${weakest.rating}/5) — make this the focus of the next development cycle.`;
  }
  if (okrAvg !== null) {
    summary += ` OKR progress is tracking at ${Math.round(okrAvg)}%.`;
  }

  let tier;
  if (avgRating >= 4.5) tier = "Exceptional";
  else if (avgRating >= 3.8) tier = "Exceeds Expectations";
  else if (avgRating >= 3) tier = "Meets Expectations";
  else tier = "Needs Improvement";

  return {
    hasContent: true,
    summary,
    avgRating: Math.round(avgRating * 10) / 10,
    tier,
    okrAvg: okrAvg !== null ? Math.round(okrAvg) : null,
    goalsDone,
    goalsTotal: goals.length,
    weakest,
  };
}

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} type="button">
          <Icon
            name="star"
            filled={n <= value}
            className={`text-[20px] ${n <= value ? "text-secondary" : "text-outline-variant"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PerformanceReview() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newOkr, setNewOkr] = useState({ title: "", progress: 50 });
  const [newGoal, setNewGoal] = useState("");
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
        <div className="p-10 text-on-surface-variant">Loading performance review…</div>
      </Layout>
    );
  }

  const { employeeName, role, reviewCycle, manager, competencies, okrs, developmentGoals, strengths, improvements, managerNotes } = doc.data;
  const analysis = analyzeReview(doc.data);

  function setRating(cid, rating) {
    updateData({ competencies: competencies.map((c) => (c.id === cid ? { ...c, rating } : c)) });
  }

  function setNotes(cid, notes) {
    updateData({ competencies: competencies.map((c) => (c.id === cid ? { ...c, notes } : c)) });
  }

  function addOkr() {
    if (!newOkr.title.trim()) return;
    updateData({ okrs: [...okrs, { id: `okr${Date.now()}`, title: newOkr.title.trim(), progress: Number(newOkr.progress) }] });
    setNewOkr({ title: "", progress: 50 });
  }

  function removeOkr(oid) {
    updateData({ okrs: okrs.filter((o) => o.id !== oid) });
  }

  function addGoal() {
    if (!newGoal.trim()) return;
    updateData({ developmentGoals: [...developmentGoals, { id: `g${Date.now()}`, title: newGoal.trim(), done: false }] });
    setNewGoal("");
  }

  function toggleGoal(gid) {
    updateData({ developmentGoals: developmentGoals.map((g) => (g.id === gid ? { ...g, done: !g.done } : g)) });
  }

  function removeGoal(gid) {
    updateData({ developmentGoals: developmentGoals.filter((g) => g.id !== gid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Performance Review</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            value={employeeName}
            onChange={(e) => updateData({ employeeName: e.target.value })}
            placeholder="Employee name"
            className="text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
          />
          <input
            value={role}
            onChange={(e) => updateData({ role: e.target.value })}
            placeholder="Role / title"
            className="text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
          />
          <input
            value={reviewCycle}
            onChange={(e) => updateData({ reviewCycle: e.target.value })}
            placeholder="Review cycle (e.g. Q3 2026)"
            className="text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
          />
          <input
            value={manager}
            onChange={(e) => updateData({ manager: e.target.value })}
            placeholder="Manager"
            className="text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Competency ratings */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-6">Core Competency Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {competencies.map((c) => (
                  <div key={c.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-sm">{c.name}</label>
                      <Stars value={c.rating} onChange={(v) => setRating(c.id, v)} />
                    </div>
                    <textarea
                      value={c.notes}
                      onChange={(e) => setNotes(c.id, e.target.value)}
                      placeholder="Specific examples…"
                      rows={2}
                      className="w-full text-sm border border-outline-variant rounded-lg p-2 outline-none focus:border-secondary resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* OKR progress */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-5">OKR Progress</h3>
              <div className="space-y-4 mb-4">
                {okrs.map((o) => (
                  <div key={o.id} className="group">
                    <div className="flex justify-between mb-1 text-sm">
                      <span>{o.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-semibold">{o.progress}%</span>
                        <button onClick={() => removeOkr(o.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${o.progress}%` }} />
                    </div>
                  </div>
                ))}
                {okrs.length === 0 && <p className="text-sm text-on-surface-variant">No OKRs added yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={newOkr.title}
                  onChange={(e) => setNewOkr((v) => ({ ...v, title: e.target.value }))}
                  placeholder="OKR title"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newOkr.progress}
                  onChange={(e) => setNewOkr((v) => ({ ...v, progress: e.target.value }))}
                  className="w-20 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <button onClick={addOkr} className="px-4 py-2 bg-secondary text-white rounded-md text-sm font-semibold">
                  Add
                </button>
              </div>
            </div>

            {/* Development goals */}
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-5">Development Goals</h3>
              <ul className="space-y-3 mb-4">
                {developmentGoals.map((g) => (
                  <li key={g.id} className="flex items-start gap-3 group">
                    <button onClick={() => toggleGoal(g.id)}>
                      <Icon
                        name={g.done ? "check_circle" : "radio_button_unchecked"}
                        filled={g.done}
                        className={g.done ? "text-secondary text-[20px]" : "text-outline-variant text-[20px]"}
                      />
                    </button>
                    <span className={`flex-1 text-sm ${g.done ? "line-through text-on-surface-variant" : ""}`}>{g.title}</span>
                    <button onClick={() => removeGoal(g.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </li>
                ))}
                {developmentGoals.length === 0 && <p className="text-sm text-on-surface-variant">No goals added yet.</p>}
              </ul>
              <div className="flex gap-2">
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="Add a development goal + Enter"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <button onClick={addGoal} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">
                  Add
                </button>
              </div>
            </div>

            {/* Manager's private notes */}
            <div className="bg-surface-container-low rounded-xl p-8 border border-dashed border-outline-variant">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="lock" filled className="text-primary" />
                <h3 className="text-lg font-bold text-primary">Manager's Private Notes</h3>
              </div>
              <textarea
                value={managerNotes}
                onChange={(e) => updateData({ managerNotes: e.target.value })}
                placeholder="Private notes visible only to the manager…"
                rows={4}
                className="w-full bg-white border border-outline-variant rounded-lg p-3 text-sm resize-none outline-none focus:border-secondary mb-4"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-primary block mb-2">Key Strengths</label>
                  <textarea
                    value={strengths}
                    onChange={(e) => updateData({ strengths: e.target.value })}
                    rows={2}
                    className="w-full bg-white border border-outline-variant rounded-lg p-3 text-sm resize-none outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-primary block mb-2">Areas for Improvement</label>
                  <textarea
                    value={improvements}
                    onChange={(e) => updateData({ improvements: e.target.value })}
                    rows={2}
                    className="w-full bg-white border border-outline-variant rounded-lg p-3 text-sm resize-none outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">AI Insight Engine</h3>
            </div>
            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-4">
              <p className="text-sm text-on-surface">{analysis.summary}</p>
            </div>
            {analysis.hasContent && (
              <>
                <div className="p-3 bg-primary text-white rounded-xl mb-3 text-center">
                  <p className="text-xs opacity-70 uppercase mb-1">Overall Tier</p>
                  <p className="font-bold text-lg">{analysis.tier}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-container-low rounded-lg text-center">
                    <p className="text-xs text-on-surface-variant">Avg Rating</p>
                    <p className="font-bold text-primary">{analysis.avgRating}/5</p>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg text-center">
                    <p className="text-xs text-on-surface-variant">Goals Done</p>
                    <p className="font-bold text-primary">
                      {analysis.goalsDone}/{analysis.goalsTotal}
                    </p>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
