import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function tierFor(pct) {
  if (pct >= 110) return { label: "Critical", classes: "bg-error-container text-error", barClasses: "bg-error" };
  if (pct >= 100) return { label: "High", classes: "bg-error-container text-error", barClasses: "bg-error" };
  if (pct >= 70) return { label: "Optimal", classes: "bg-secondary-container text-on-secondary-container", barClasses: "bg-secondary" };
  return { label: "Available", classes: "bg-surface-container-highest text-on-surface-variant", barClasses: "bg-secondary" };
}

function initials(name) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function analyzeCapacity(members) {
  if (members.length === 0) {
    return { avgUtilization: 0, overAllocated: [], insight: "Add team members to see capacity insights." };
  }
  const withPct = members.map((m) => ({
    ...m,
    pct: m.capacityHours > 0 ? Math.round((Number(m.allocatedHours) / Number(m.capacityHours)) * 100) : 0,
  }));
  const avgUtilization = Math.round(withPct.reduce((s, m) => s + m.pct, 0) / withPct.length);
  const overAllocated = withPct.filter((m) => m.pct > 100).sort((a, b) => b.pct - a.pct);
  const underAllocated = withPct.filter((m) => m.pct < 90).sort((a, b) => a.pct - b.pct);

  let insight = "Team capacity looks balanced.";
  if (overAllocated.length > 0 && underAllocated.length > 0) {
    const over = overAllocated[0];
    const under = underAllocated[0];
    const overHours = Number(over.allocatedHours) - Number(over.capacityHours);
    const underRoom = Number(under.capacityHours) - Number(under.allocatedHours);
    const moveHours = Math.max(1, Math.round(Math.min(overHours, underRoom)));
    insight = `Reassign ~${moveHours}h from ${over.name} (${over.pct}%) to ${under.name} (${under.pct}%) to balance load.`;
  } else if (overAllocated.length > 0) {
    insight = `${overAllocated[0].name} is over-allocated at ${overAllocated[0].pct}% with no one else free to absorb the overflow — consider hiring or descoping.`;
  }

  return { avgUtilization, overAllocated, withPct, insight };
}

export default function CapacityPlanning() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newMember, setNewMember] = useState({ name: "", role: "", capacityHours: 40, allocatedHours: 0 });
  const [newProject, setNewProject] = useState({ name: "", totalHours: "", allocatedHours: "" });
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
        <div className="p-10 text-on-surface-variant">Loading capacity plan…</div>
      </Layout>
    );
  }

  const members = doc.data?.members || [];
  const projects = doc.data?.projects || [];
  const analysis = analyzeCapacity(members);

  function addMember() {
    if (!newMember.name.trim()) return;
    updateData({
      members: [
        ...members,
        {
          id: `m${Date.now()}`,
          name: newMember.name.trim(),
          role: newMember.role.trim(),
          capacityHours: Number(newMember.capacityHours) || 40,
          allocatedHours: Number(newMember.allocatedHours) || 0,
        },
      ],
    });
    setNewMember({ name: "", role: "", capacityHours: 40, allocatedHours: 0 });
  }

  function updateMember(mid, patch) {
    updateData({ members: members.map((m) => (m.id === mid ? { ...m, ...patch } : m)) });
  }

  function removeMember(mid) {
    updateData({ members: members.filter((m) => m.id !== mid) });
  }

  function addProject() {
    if (!newProject.name.trim()) return;
    updateData({
      projects: [
        ...projects,
        {
          id: `p${Date.now()}`,
          name: newProject.name.trim(),
          totalHours: Number(newProject.totalHours) || 0,
          allocatedHours: Number(newProject.allocatedHours) || 0,
        },
      ],
    });
    setNewProject({ name: "", totalHours: "", allocatedHours: "" });
  }

  function removeProject(pid) {
    updateData({ projects: projects.filter((p) => p.id !== pid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Capacity Planning</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-4 bg-error-container/20 border border-error/20 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-error flex items-center gap-2 mb-1">
              <Icon name="warning" />
              Over-allocated
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              {analysis.overAllocated.length} member{analysis.overAllocated.length === 1 ? "" : "s"} above 100% capacity.
            </p>
            <div className="space-y-2">
              {analysis.overAllocated.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-error/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error font-bold text-xs">
                      {initials(m.name)}
                    </div>
                    <span className="text-sm">{m.name}</span>
                  </div>
                  <span className="text-error font-bold text-sm">{m.pct}%</span>
                </div>
              ))}
              {analysis.overAllocated.length === 0 && (
                <p className="text-sm text-on-surface-variant">No one is over-allocated.</p>
              )}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <div className="text-xs uppercase text-on-surface-variant">Total Bandwidth</div>
              <div className="text-3xl font-bold text-primary mt-2">{analysis.avgUtilization}%</div>
              <p className="text-xs text-on-surface-variant mt-1">Average across {members.length} member{members.length === 1 ? "" : "s"}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <div className="text-xs uppercase text-on-surface-variant">Active Projects</div>
              <div className="text-3xl font-bold text-primary mt-2">{projects.length}</div>
              <p className="text-xs text-on-surface-variant mt-1">Tracked in this plan</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
              <div className="text-xs uppercase text-on-surface-variant">Over Capacity</div>
              <div className="text-3xl font-bold text-secondary mt-2">{analysis.overAllocated.length}</div>
              <p className="text-xs text-on-surface-variant mt-1">Need rebalancing</p>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-outline-variant p-8 mb-6">
          <h3 className="text-lg font-bold text-primary mb-6">Weekly Bandwidth</h3>
          <div className="space-y-5">
            {(analysis.withPct || []).map((m) => {
              const tier = tierFor(m.pct);
              return (
                <div key={m.id} className="grid grid-cols-12 gap-4 items-center group">
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs shrink-0">
                      {initials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary truncate">{m.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{m.role}</p>
                    </div>
                  </div>
                  <div className="col-span-6">
                    <div className="h-4 bg-surface-container-high rounded-full overflow-hidden">
                      <div className={`h-full ${tier.barClasses}`} style={{ width: `${Math.min(100, m.pct)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-on-surface-variant">
                      <span>Allocated: {m.allocatedHours}h</span>
                      <span>Capacity: {m.capacityHours}h</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${tier.classes}`}>
                      {m.pct}% {tier.label}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <input
                      type="number"
                      value={m.allocatedHours}
                      onChange={(e) => updateMember(m.id, { allocatedHours: Number(e.target.value) })}
                      className="w-12 text-xs border border-outline-variant rounded px-1 py-1 outline-none focus:border-secondary"
                      title="Allocated hours"
                    />
                    <button onClick={() => removeMember(m.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                </div>
              );
            })}
            {members.length === 0 && <p className="text-sm text-on-surface-variant">No team members yet.</p>}
          </div>
          <div className="mt-6 pt-4 border-t border-outline-variant flex flex-wrap gap-2">
            <input value={newMember.name} onChange={(e) => setNewMember((v) => ({ ...v, name: e.target.value }))} placeholder="Name" className="flex-1 min-w-[120px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
            <input value={newMember.role} onChange={(e) => setNewMember((v) => ({ ...v, role: e.target.value }))} placeholder="Role" className="flex-1 min-w-[140px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
            <input type="number" value={newMember.capacityHours} onChange={(e) => setNewMember((v) => ({ ...v, capacityHours: e.target.value }))} placeholder="Capacity h" className="w-28 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
            <input type="number" value={newMember.allocatedHours} onChange={(e) => setNewMember((v) => ({ ...v, allocatedHours: e.target.value }))} placeholder="Allocated h" className="w-28 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
            <button onClick={addMember} disabled={!newMember.name.trim()} className="px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-40">Add Member</button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-outline-variant p-8">
            <h3 className="text-lg font-bold text-primary mb-6">Project Allocation</h3>
            <div className="space-y-5 mb-4">
              {projects.map((p) => {
                const pct = p.totalHours > 0 ? Math.min(100, Math.round((p.allocatedHours / p.totalHours) * 100)) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      <Icon name="rocket_launch" className="text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-primary">{p.name}</span>
                        <span className="text-xs text-on-surface-variant">{p.allocatedHours}h / {p.totalHours}h total</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-high rounded-full">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button onClick={() => removeProject(p.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                );
              })}
              {projects.length === 0 && <p className="text-sm text-on-surface-variant">No projects tracked yet.</p>}
            </div>
            <div className="flex gap-2">
              <input value={newProject.name} onChange={(e) => setNewProject((v) => ({ ...v, name: e.target.value }))} placeholder="Project name" className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
              <input type="number" value={newProject.totalHours} onChange={(e) => setNewProject((v) => ({ ...v, totalHours: e.target.value }))} placeholder="Total h" className="w-24 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
              <input type="number" value={newProject.allocatedHours} onChange={(e) => setNewProject((v) => ({ ...v, allocatedHours: e.target.value }))} placeholder="Used h" className="w-24 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
              <button onClick={addProject} disabled={!newProject.name.trim()} className="px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-40">Add</button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-primary-container text-white rounded-xl p-8 relative overflow-hidden">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Icon name="auto_awesome" className="text-secondary" filled />
              Smart Suggestions
            </h3>
            <p className="text-sm text-white/70 mb-6">Based on current capacity allocation.</p>
            <div className="p-4 bg-white/10 rounded-lg border border-white/10">
              <p className="text-sm">{analysis.insight}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
