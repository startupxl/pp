import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const ROLE_LETTERS = ["R", "A", "C", "I", ""];
const ROLE_DEFS = [
  { key: "R", label: "Responsible", desc: "Person who performs the work.", classes: "bg-primary" },
  { key: "A", label: "Accountable", desc: "Owner of the final result.", classes: "bg-secondary" },
  { key: "C", label: "Consulted", desc: "Active two-way communication.", classes: "bg-outline" },
  { key: "I", label: "Informed", desc: "Kept up to date on progress.", classes: "bg-outline-variant/60" },
];
const CELL_TEXT_CLASSES = {
  R: "text-primary font-bold",
  A: "text-secondary font-bold",
  C: "text-on-surface-variant font-semibold",
  I: "text-on-surface-variant",
  "": "text-outline-variant",
};

function analyzeRaci(people, tasks) {
  if (people.length === 0 || tasks.length === 0) {
    return {
      hasContent: false,
      ambiguityScore: 0,
      bottleneckMessage: "Add people and tasks to run a balance check.",
      loadByPerson: [],
    };
  }
  const total = tasks.length;
  let ambiguous = 0;
  const accountableCount = {};
  const activeCount = {};
  people.forEach((p) => {
    accountableCount[p.id] = 0;
    activeCount[p.id] = 0;
  });

  tasks.forEach((t) => {
    const values = Object.values(t.assignments || {});
    const aCount = values.filter((v) => v === "A").length;
    if (aCount !== 1) ambiguous += 1;
    people.forEach((p) => {
      const v = (t.assignments || {})[p.id];
      if (v === "A") accountableCount[p.id] += 1;
      if (v === "R" || v === "A") activeCount[p.id] += 1;
    });
  });

  const ambiguityScore = Math.round((ambiguous / total) * 100);
  const loadByPerson = people.map((p) => ({
    ...p,
    accountablePct: Math.round((accountableCount[p.id] / total) * 100),
    loadPct: Math.round((activeCount[p.id] / total) * 100),
  }));
  const bottleneck = [...loadByPerson].sort((a, b) => b.accountablePct - a.accountablePct)[0];

  const bottleneckMessage =
    bottleneck && bottleneck.accountablePct >= 50
      ? `${bottleneck.name} is Accountable for ${bottleneck.accountablePct}% of tasks. Consider delegating some ownership.`
      : "No single owner is overloaded — accountability looks well distributed.";

  return { hasContent: true, ambiguityScore, bottleneckMessage, loadByPerson };
}

export default function Raci() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newPerson, setNewPerson] = useState({ name: "", role: "" });
  const [newTask, setNewTask] = useState("");
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
        <div className="p-10 text-on-surface-variant">Loading RACI matrix…</div>
      </Layout>
    );
  }

  const people = doc.data?.people || [];
  const tasks = doc.data?.tasks || [];

  function addPerson() {
    if (!newPerson.name.trim()) return;
    updateData({
      people: [...people, { id: `p${Date.now()}`, name: newPerson.name.trim(), role: newPerson.role.trim() }],
    });
    setNewPerson({ name: "", role: "" });
  }
  function removePerson(pid) {
    updateData({
      people: people.filter((p) => p.id !== pid),
      tasks: tasks.map((t) => {
        const { [pid]: _drop, ...rest } = t.assignments || {};
        return { ...t, assignments: rest };
      }),
    });
  }
  function addTask() {
    if (!newTask.trim()) return;
    updateData({ tasks: [...tasks, { id: `t${Date.now()}`, name: newTask.trim(), assignments: {} }] });
    setNewTask("");
  }
  function removeTask(tid) {
    updateData({ tasks: tasks.filter((t) => t.id !== tid) });
  }
  function setAssignment(tid, pid, value) {
    updateData({
      tasks: tasks.map((t) =>
        t.id === tid ? { ...t, assignments: { ...t.assignments, [pid]: value } } : t
      ),
    });
  }
  function cycleAssignment(tid, pid) {
    const current = (tasks.find((t) => t.id === tid)?.assignments || {})[pid] || "";
    const idx = ROLE_LETTERS.indexOf(current);
    const next = ROLE_LETTERS[(idx + 1) % ROLE_LETTERS.length];
    setAssignment(tid, pid, next);
  }

  const analysis = analyzeRaci(people, tasks);

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              RACI Matrix Workshop
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
          Clarify roles and responsibilities across your cross-functional team to eliminate ambiguity
          and streamline execution.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="p-4 text-left w-[260px] border-r border-outline-variant/30 sticky left-0 bg-surface-container-low z-10">
                      <span className="text-xs uppercase text-on-surface-variant tracking-wider">
                        Tasks &amp; Deliverables
                      </span>
                    </th>
                    {people.map((p) => (
                      <th key={p.id} className="p-3 min-w-[130px] text-center group">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-primary text-sm">{p.name}</span>
                          <span className="text-[10px] uppercase text-on-surface-variant">{p.role}</span>
                          <button
                            onClick={() => removePerson(p.id)}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                          >
                            <Icon name="close" className="text-[12px]" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="p-3 min-w-[160px]">
                      <div className="flex gap-1">
                        <input
                          value={newPerson.name}
                          onChange={(e) => setNewPerson((v) => ({ ...v, name: e.target.value }))}
                          placeholder="Name"
                          className="w-full text-xs border border-outline-variant rounded px-2 py-1 outline-none focus:border-secondary"
                        />
                      </div>
                      <div className="flex gap-1 mt-1">
                        <input
                          value={newPerson.role}
                          onChange={(e) => setNewPerson((v) => ({ ...v, role: e.target.value }))}
                          placeholder="Role"
                          className="w-full text-xs border border-outline-variant rounded px-2 py-1 outline-none focus:border-secondary"
                        />
                        <button
                          onClick={addPerson}
                          disabled={!newPerson.name.trim()}
                          className="px-2 bg-primary text-white rounded text-xs disabled:opacity-40"
                        >
                          <Icon name="add" className="text-[14px]" />
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {tasks.map((t) => (
                    <tr key={t.id} className="group hover:bg-surface-container-low/50">
                      <td className="p-3 border-r border-outline-variant/30 sticky left-0 bg-white group-hover:bg-surface-container-low/50">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            value={t.name}
                            onChange={(e) =>
                              updateData({
                                tasks: tasks.map((x) =>
                                  x.id === t.id ? { ...x, name: e.target.value } : x
                                ),
                              })
                            }
                            className="text-sm bg-transparent outline-none flex-1"
                          />
                          <button
                            onClick={() => removeTask(t.id)}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                          >
                            <Icon name="close" className="text-[14px]" />
                          </button>
                        </div>
                      </td>
                      {people.map((p) => {
                        const val = (t.assignments || {})[p.id] || "";
                        return (
                          <td key={p.id} className="p-2 text-center">
                            <button
                              onClick={() => cycleAssignment(t.id, p.id)}
                              className={`w-full py-1 rounded ${CELL_TEXT_CLASSES[val]} hover:bg-surface-container-low transition-colors`}
                              title="Click to cycle R / A / C / I"
                            >
                              {val || "–"}
                            </button>
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={people.length + 2} className="p-8 text-center text-sm text-on-surface-variant">
                        No tasks yet — add one below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-container-low/30 flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="New task or deliverable"
                className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
              />
              <button
                onClick={addTask}
                disabled={!newTask.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-40"
              >
                <Icon name="add_task" className="text-[16px]" />
                Add Task
              </button>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="info" className="text-secondary" />
                Role Definitions
              </h4>
              <ul className="space-y-3">
                {ROLE_DEFS.map((r) => (
                  <li key={r.key} className="flex gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${r.classes}`}>
                      <span className="font-bold text-white text-sm">{r.key}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{r.label}</p>
                      <p className="text-xs text-on-surface-variant">{r.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface-container border border-secondary/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="bolt" filled className="text-secondary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Balance Check
                </h4>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-white mb-3">
                <p className="text-sm text-on-surface">{analysis.bottleneckMessage}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-white">
                <p className="text-xs uppercase text-on-surface-variant mb-1">Ambiguity Score</p>
                <p className="text-2xl font-bold text-primary">{analysis.ambiguityScore}/100</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  % of tasks without exactly one Accountable owner
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                Load Distribution
              </h4>
              <div className="space-y-3">
                {analysis.loadByPerson.map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{p.name}</span>
                      <span>{p.loadPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.loadPct >= 80 ? "bg-error" : "bg-secondary"}`}
                        style={{ width: `${p.loadPct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {analysis.loadByPerson.length === 0 && (
                  <p className="text-sm text-on-surface-variant">Add people to see load distribution.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
