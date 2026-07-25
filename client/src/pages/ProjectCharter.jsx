import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const STATUS_OPTIONS = ["Completed", "In Progress", "Pending", "Planned"];
const STATUS_CLASSES = {
  Completed: "bg-secondary/10 text-secondary",
  "In Progress": "bg-surface-container-highest text-on-surface-variant",
  Pending: "bg-surface-container text-on-surface-variant",
  Planned: "bg-surface-container text-on-surface-variant",
};

function computeCompletion(data) {
  const purposeScore = (data.purpose || "").trim() ? 100 : 0;
  const objectivesScore = (data.objectives || []).length > 0 ? 100 : 0;
  const milestones = data.milestones || [];
  const milestonesScore = milestones.length
    ? Math.round((milestones.filter((m) => m.status === "Completed").length / milestones.length) * 100)
    : 0;
  const criteria = data.successCriteria || [];
  const criteriaScore = criteria.length
    ? Math.round((criteria.filter((c) => c.done).length / criteria.length) * 100)
    : 0;
  const risksScore = (data.risks || []).length > 0 ? 100 : 0;
  const requirementsScore = (data.requirements || []).length > 0 ? 100 : 0;
  const overall = Math.round(
    (purposeScore + objectivesScore + milestonesScore + criteriaScore + risksScore + requirementsScore) / 6
  );
  return overall;
}

export default function ProjectCharter() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newObjective, setNewObjective] = useState({ label: "", value: "", description: "" });
  const [newMilestone, setNewMilestone] = useState({ name: "", date: "", status: "Planned" });
  const [newCriterion, setNewCriterion] = useState("");
  const [newRisk, setNewRisk] = useState({ title: "", description: "" });
  const [newRequirement, setNewRequirement] = useState("");
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

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading project charter…</div>
      </Layout>
    );
  }

  const data = doc.data || {};
  const objectives = data.objectives || [];
  const milestones = data.milestones || [];
  const successCriteria = data.successCriteria || [];
  const risks = data.risks || [];
  const requirements = data.requirements || [];
  const completion = computeCompletion(data);

  function addObjective() {
    if (!newObjective.label.trim()) return;
    updateData({ objectives: [...objectives, { id: `obj${Date.now()}`, ...newObjective }] });
    setNewObjective({ label: "", value: "", description: "" });
  }
  function removeObjective(oid) {
    updateData({ objectives: objectives.filter((o) => o.id !== oid) });
  }
  function addMilestone() {
    if (!newMilestone.name.trim()) return;
    updateData({ milestones: [...milestones, { id: `mile${Date.now()}`, ...newMilestone }] });
    setNewMilestone({ name: "", date: "", status: "Planned" });
  }
  function updateMilestoneStatus(mid, status) {
    updateData({ milestones: milestones.map((m) => (m.id === mid ? { ...m, status } : m)) });
  }
  function removeMilestone(mid) {
    updateData({ milestones: milestones.filter((m) => m.id !== mid) });
  }
  function addCriterion() {
    if (!newCriterion.trim()) return;
    updateData({
      successCriteria: [...successCriteria, { id: `sc${Date.now()}`, text: newCriterion.trim(), done: false }],
    });
    setNewCriterion("");
  }
  function toggleCriterion(cid) {
    updateData({
      successCriteria: successCriteria.map((c) => (c.id === cid ? { ...c, done: !c.done } : c)),
    });
  }
  function removeCriterion(cid) {
    updateData({ successCriteria: successCriteria.filter((c) => c.id !== cid) });
  }
  function addRisk() {
    if (!newRisk.title.trim()) return;
    updateData({ risks: [...risks, { id: `risk${Date.now()}`, ...newRisk }] });
    setNewRisk({ title: "", description: "" });
  }
  function removeRisk(rid) {
    updateData({ risks: risks.filter((r) => r.id !== rid) });
  }
  function addRequirement() {
    if (!newRequirement.trim()) return;
    updateData({ requirements: [...requirements, { id: `req${Date.now()}`, text: newRequirement.trim() }] });
    setNewRequirement("");
  }
  function removeRequirement(rid) {
    updateData({ requirements: requirements.filter((r) => r.id !== rid) });
  }

  return (
    <Layout>
      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-secondary mb-1">
              <Icon name="description" className="text-[16px]" />
              Project Charter Workshop
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* Purpose */}
            <section className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary flex items-center gap-3 mb-4">
                <Icon name="target" className="p-2 bg-secondary/10 text-secondary rounded-lg" />
                Project Purpose
              </h3>
              <textarea
                value={data.purpose || ""}
                onChange={(e) => updateData({ purpose: e.target.value })}
                placeholder="Why does this project exist? What problem is it solving?"
                className="w-full h-28 bg-surface-container-low border-none rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </section>

            {/* Measurable Objectives */}
            <section className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary flex items-center gap-3 mb-5">
                <Icon name="trending_up" className="p-2 bg-secondary/10 text-secondary rounded-lg" />
                Measurable Objectives
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {objectives.map((o) => (
                  <div key={o.id} className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/50 relative group">
                    <button
                      onClick={() => removeObjective(o.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                    >
                      <Icon name="close" className="text-[14px]" />
                    </button>
                    <span className="text-xs text-secondary block mb-1">{o.label}</span>
                    <div className="text-2xl font-bold text-primary mb-1">{o.value}</div>
                    <p className="text-xs text-on-surface-variant">{o.description}</p>
                  </div>
                ))}
                {objectives.length === 0 && (
                  <p className="text-sm text-on-surface-variant md:col-span-3">
                    No objectives yet — add one below.
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input value={newObjective.label} onChange={(e) => setNewObjective((v) => ({ ...v, label: e.target.value }))} placeholder="Label (e.g. Efficiency)" className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary flex-1 min-w-[120px]" />
                <input value={newObjective.value} onChange={(e) => setNewObjective((v) => ({ ...v, value: e.target.value }))} placeholder="Value (e.g. 35%)" className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary w-28" />
                <input value={newObjective.description} onChange={(e) => setNewObjective((v) => ({ ...v, description: e.target.value }))} placeholder="Description" className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary flex-1 min-w-[160px]" />
                <button onClick={addObjective} disabled={!newObjective.label.trim()} className="px-3 py-1.5 bg-primary text-white rounded-md text-sm disabled:opacity-40">Add</button>
              </div>
            </section>

            {/* Milestone Schedule */}
            <section className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h3 className="text-lg font-bold text-primary flex items-center gap-3 mb-5">
                <Icon name="calendar_today" className="p-2 bg-secondary/10 text-secondary rounded-lg" />
                Milestone Schedule
              </h3>
              <table className="w-full mb-4">
                <thead>
                  <tr className="text-left text-xs uppercase text-on-surface-variant border-b border-outline-variant">
                    <th className="pb-3 font-semibold">Milestone</th>
                    <th className="pb-3 font-semibold">Target Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m.id} className="border-b border-outline-variant/30 group">
                      <td className="py-3 text-sm">{m.name}</td>
                      <td className="py-3 text-sm font-mono text-on-surface-variant">{m.date}</td>
                      <td className="py-3">
                        <select
                          value={m.status}
                          onChange={(e) => updateMilestoneStatus(m.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-none outline-none ${STATUS_CLASSES[m.status]}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => removeMilestone(m.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {milestones.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-sm text-on-surface-variant text-center">No milestones scheduled yet.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="flex gap-2 flex-wrap">
                <input value={newMilestone.name} onChange={(e) => setNewMilestone((v) => ({ ...v, name: e.target.value }))} placeholder="Milestone name" className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary flex-1 min-w-[160px]" />
                <input value={newMilestone.date} onChange={(e) => setNewMilestone((v) => ({ ...v, date: e.target.value }))} placeholder="Target date" className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary w-40" />
                <select value={newMilestone.status} onChange={(e) => setNewMilestone((v) => ({ ...v, status: e.target.value }))} className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary">
                  {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                <button onClick={addMilestone} disabled={!newMilestone.name.trim()} className="px-3 py-1.5 bg-primary text-white rounded-md text-sm disabled:opacity-40">Add</button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Success Criteria */}
            <section className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Success Criteria</h3>
              <ul className="space-y-3 mb-3">
                {successCriteria.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 group cursor-pointer" onClick={() => toggleCriterion(c.id)}>
                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${c.done ? "bg-secondary border-secondary" : "border-outline-variant"}`}>
                      {c.done && <Icon name="check" filled className="text-white text-[16px]" />}
                    </div>
                    <span className="text-sm flex-1">{c.text}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeCriterion(c.id); }} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </li>
                ))}
                {successCriteria.length === 0 && <p className="text-sm text-on-surface-variant">No criteria yet.</p>}
              </ul>
              <div className="flex gap-2">
                <input value={newCriterion} onChange={(e) => setNewCriterion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCriterion()} placeholder="Add success criterion" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <button onClick={addCriterion} disabled={!newCriterion.trim()} className="px-3 py-1.5 bg-primary text-white rounded-md text-sm disabled:opacity-40"><Icon name="add" className="text-[16px]" /></button>
              </div>
            </section>

            {/* Key Risks */}
            <section className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Key Risks</h3>
              <div className="space-y-3 mb-3">
                {risks.map((r) => (
                  <div key={r.id} className="flex gap-3 group">
                    <div className="w-1 bg-error rounded-full shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-primary">{r.title}</h4>
                      <p className="text-xs text-on-surface-variant">{r.description}</p>
                    </div>
                    <button onClick={() => removeRisk(r.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                ))}
                {risks.length === 0 && <p className="text-sm text-on-surface-variant">No risks logged yet.</p>}
              </div>
              <div className="space-y-2">
                <input value={newRisk.title} onChange={(e) => setNewRisk((v) => ({ ...v, title: e.target.value }))} placeholder="Risk title" className="w-full text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <div className="flex gap-2">
                  <input value={newRisk.description} onChange={(e) => setNewRisk((v) => ({ ...v, description: e.target.value }))} placeholder="Description" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                  <button onClick={addRisk} disabled={!newRisk.title.trim()} className="px-3 py-1.5 bg-primary text-white rounded-md text-sm disabled:opacity-40"><Icon name="add" className="text-[16px]" /></button>
                </div>
              </div>
            </section>

            {/* High-Level Requirements */}
            <section className="bg-primary text-white rounded-xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-4">High-Level Requirements</h3>
              <div className="space-y-2 mb-3">
                {requirements.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 group">
                    <Icon name="check_circle" className="text-secondary-fixed" />
                    <span className="text-sm flex-1">{r.text}</span>
                    <button onClick={() => removeRequirement(r.id)} className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-white">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                ))}
                {requirements.length === 0 && <p className="text-sm text-white/60">No requirements yet.</p>}
              </div>
              <div className="flex gap-2">
                <input value={newRequirement} onChange={(e) => setNewRequirement(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRequirement()} placeholder="Add requirement" className="flex-1 text-sm bg-white/10 border border-white/20 rounded-md px-2 py-1.5 outline-none placeholder:text-white/40" />
                <button onClick={addRequirement} disabled={!newRequirement.trim()} className="px-3 py-1.5 bg-secondary-fixed text-on-secondary-fixed rounded-md text-sm disabled:opacity-40"><Icon name="add" className="text-[16px]" /></button>
              </div>
            </section>

            {/* Completion */}
            <section className="bg-surface-container-highest rounded-xl p-6 text-center border border-outline-variant/50">
              <div className="text-3xl font-bold text-primary mb-1">{completion}%</div>
              <p className="text-xs text-on-surface-variant mb-3">Charter Completion</p>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
