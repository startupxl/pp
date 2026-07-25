import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const DEFAULT_SKILLS = ["Coding", "Design", "Strategy", "Ops", "Growth", "Data"];
const LEVEL_LABELS = ["None", "Novice", "Competent", "Proficient", "Expert"];
const LEVEL_DOT_CLASSES = ["bg-transparent", "bg-outline-variant", "bg-secondary-container", "bg-secondary", "bg-primary"];

function initials(name) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function analyzeSkills(skills, members) {
  if (skills.length === 0 || members.length === 0) {
    return { velocity: 0, gaps: [], singlePoints: [] };
  }
  const perSkillAvg = skills.map((skill) => {
    const total = members.reduce((s, m) => s + Number(m.levels?.[skill] || 0), 0);
    return { skill, avg: total / members.length };
  });
  const velocity = Math.round(
    (perSkillAvg.reduce((s, x) => s + x.avg, 0) / (perSkillAvg.length * 4)) * 100
  );
  const gaps = perSkillAvg
    .filter((x) => x.avg < 2.5)
    .map((x) => ({ ...x, tier: x.avg < 2 ? "Critical" : "Moderate" }))
    .sort((a, b) => a.avg - b.avg);

  const singlePoints = skills.filter((skill) => {
    const experts = members.filter((m) => Number(m.levels?.[skill] || 0) >= 3);
    return experts.length === 1;
  });

  return { velocity, gaps, singlePoints, perSkillAvg };
}

export default function SkillMatrix() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newMember, setNewMember] = useState({ name: "", role: "" });
  const [newSkill, setNewSkill] = useState("");
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
        <div className="p-10 text-on-surface-variant">Loading skill matrix…</div>
      </Layout>
    );
  }

  const skills = doc.data?.skills?.length ? doc.data.skills : DEFAULT_SKILLS;
  const members = doc.data?.members || [];
  const analysis = analyzeSkills(skills, members);

  function cycleLevel(mid, skill) {
    const member = members.find((m) => m.id === mid);
    const current = Number(member?.levels?.[skill] || 0);
    const next = (current + 1) % 5;
    updateData({
      members: members.map((m) =>
        m.id === mid ? { ...m, levels: { ...m.levels, [skill]: next } } : m
      ),
    });
  }

  function addMember() {
    if (!newMember.name.trim()) return;
    updateData({
      members: [...members, { id: `sm${Date.now()}`, name: newMember.name.trim(), role: newMember.role.trim(), levels: {} }],
    });
    setNewMember({ name: "", role: "" });
  }

  function removeMember(mid) {
    updateData({ members: members.filter((m) => m.id !== mid) });
  }

  function addSkill() {
    if (!newSkill.trim() || skills.includes(newSkill.trim())) return;
    updateData({ skills: [...skills, newSkill.trim()] });
    setNewSkill("");
  }

  function removeSkill(skill) {
    updateData({
      skills: skills.filter((s) => s !== skill),
      members: members.map((m) => {
        const { [skill]: _drop, ...rest } = m.levels || {};
        return { ...m, levels: rest };
      }),
    });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Skill Matrix Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="flex justify-between items-end mb-4 flex-wrap gap-3">
          <p className="text-on-surface-variant max-w-2xl">
            Click a cell to cycle proficiency: None → Novice → Competent → Proficient → Expert.
          </p>
          <div className="flex gap-3 text-xs">
            {LEVEL_LABELS.slice(1).map((label, i) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${LEVEL_DOT_CLASSES[i + 1]}`} /> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="p-4 font-semibold text-primary w-56">Team Member</th>
                      {skills.map((skill) => (
                        <th key={skill} className="p-4 font-semibold text-primary group">
                          <div className="flex items-center gap-1">
                            {skill}
                            <button onClick={() => removeSkill(skill)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                              <Icon name="close" className="text-[12px]" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs shrink-0">
                              {initials(m.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-primary truncate">{m.name}</p>
                              <p className="text-xs text-on-surface-variant truncate">{m.role}</p>
                            </div>
                            <button onClick={() => removeMember(m.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error ml-auto">
                              <Icon name="close" className="text-[14px]" />
                            </button>
                          </div>
                        </td>
                        {skills.map((skill) => {
                          const level = Number(m.levels?.[skill] || 0);
                          return (
                            <td key={skill} className="p-4">
                              <button
                                onClick={() => cycleLevel(m.id, skill)}
                                className="flex gap-1 items-center"
                                title={LEVEL_LABELS[level]}
                              >
                                {level === 0 ? (
                                  <span className="w-2 h-2 rounded-full border border-outline-variant" />
                                ) : (
                                  Array.from({ length: level }).map((_, i) => (
                                    <span key={i} className={`w-2 h-2 rounded-full ${LEVEL_DOT_CLASSES[level]}`} />
                                  ))
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={skills.length + 1} className="p-8 text-center text-sm text-on-surface-variant">
                          No team members yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-outline-variant bg-surface-container-low/30 flex gap-2 flex-wrap">
                <input value={newMember.name} onChange={(e) => setNewMember((v) => ({ ...v, name: e.target.value }))} placeholder="Name" className="flex-1 min-w-[140px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
                <input value={newMember.role} onChange={(e) => setNewMember((v) => ({ ...v, role: e.target.value }))} placeholder="Role" className="flex-1 min-w-[140px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
                <button onClick={addMember} disabled={!newMember.name.trim()} className="px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-40">Add Member</button>
                <div className="w-px bg-outline-variant mx-1" />
                <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="New skill column" className="flex-1 min-w-[140px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary" />
                <button onClick={addSkill} disabled={!newSkill.trim()} className="px-4 py-2 bg-secondary text-white rounded-md text-sm disabled:opacity-40">Add Skill</button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-primary text-white rounded-2xl p-6">
                <h4 className="text-sm opacity-80">Team Velocity</h4>
                <p className="text-3xl font-bold mt-2">{analysis.velocity}%</p>
                <div className="w-full bg-white/20 h-2 rounded-full mt-4">
                  <div className="bg-secondary-fixed h-full rounded-full" style={{ width: `${analysis.velocity}%` }} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
                <h4 className="text-sm text-on-surface-variant">Skill Gaps</h4>
                <p className="text-3xl font-bold mt-2 text-primary">{analysis.gaps?.length || 0}</p>
                <p className="text-xs text-on-surface-variant mt-4">Skills below 2.5/4.0 average</p>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
                <h4 className="text-sm text-on-surface-variant">Risk Factors</h4>
                <p className={`text-3xl font-bold mt-2 ${analysis.singlePoints?.length ? "text-error" : "text-secondary"}`}>
                  {analysis.singlePoints?.length ? analysis.singlePoints.length : "None"}
                </p>
                <p className="text-xs text-on-surface-variant mt-4">
                  {analysis.singlePoints?.length
                    ? `${analysis.singlePoints.join(", ")}: single-point-of-failure`
                    : "No single-point-of-failure skills"}
                </p>
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="warning" className="text-secondary" />
                <h3 className="text-lg font-bold text-primary">Skill Gaps</h3>
              </div>
              <div className="space-y-3">
                {(analysis.gaps || []).map((g) => (
                  <div key={g.skill} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
                    <p className="font-semibold text-primary text-sm">{g.skill}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Team proficiency: {g.avg.toFixed(1)}/4.0
                    </p>
                    <span className={`text-xs font-bold mt-2 inline-block ${g.tier === "Critical" ? "text-error" : "text-on-tertiary-container"}`}>
                      {g.tier}
                    </span>
                  </div>
                ))}
                {(!analysis.gaps || analysis.gaps.length === 0) && (
                  <p className="text-sm text-on-surface-variant">No significant skill gaps detected.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
