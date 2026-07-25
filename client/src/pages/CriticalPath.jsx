import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

// Real Critical Path Method (CPM) calculation: forward pass (ES/EF), backward
// pass (LS/LF), and slack. Handles dependency cycles gracefully by falling
// back to 0 for any task that can't be resolved (rather than looping forever).
function computeCPM(tasks) {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const ES = {};
  const EF = {};
  const resolved = new Set();
  let changed = true;
  let guard = 0;

  while (resolved.size < tasks.length && changed && guard < tasks.length + 5) {
    changed = false;
    guard += 1;
    for (const t of tasks) {
      if (resolved.has(t.id)) continue;
      const deps = (t.dependencies || []).filter((d) => byId[d]);
      if (deps.every((d) => resolved.has(d))) {
        const es = deps.length ? Math.max(...deps.map((d) => EF[d])) : 0;
        ES[t.id] = es;
        EF[t.id] = es + Number(t.duration || 0);
        resolved.add(t.id);
        changed = true;
      }
    }
  }
  tasks.forEach((t) => {
    if (!resolved.has(t.id)) {
      ES[t.id] = 0;
      EF[t.id] = Number(t.duration || 0);
    }
  });

  const projectDuration = tasks.length ? Math.max(...tasks.map((t) => EF[t.id] || 0)) : 0;

  const successors = {};
  tasks.forEach((t) => {
    successors[t.id] = [];
  });
  tasks.forEach((t) => {
    (t.dependencies || []).forEach((d) => {
      if (successors[d]) successors[d].push(t.id);
    });
  });

  const LF = {};
  const LS = {};
  const resolved2 = new Set();
  changed = true;
  guard = 0;
  while (resolved2.size < tasks.length && changed && guard < tasks.length + 5) {
    changed = false;
    guard += 1;
    for (const t of tasks) {
      if (resolved2.has(t.id)) continue;
      const succs = successors[t.id];
      if (succs.every((s) => resolved2.has(s))) {
        const lf = succs.length ? Math.min(...succs.map((s) => LS[s])) : projectDuration;
        LF[t.id] = lf;
        LS[t.id] = lf - Number(t.duration || 0);
        resolved2.add(t.id);
        changed = true;
      }
    }
  }
  tasks.forEach((t) => {
    if (!resolved2.has(t.id)) {
      LF[t.id] = projectDuration;
      LS[t.id] = projectDuration - Number(t.duration || 0);
    }
  });

  const results = tasks
    .map((t) => {
      const slack = LS[t.id] - ES[t.id];
      return { ...t, es: ES[t.id], ef: EF[t.id], ls: LS[t.id], lf: LF[t.id], slack, critical: slack === 0 };
    })
    .sort((a, b) => a.es - b.es || a.ls - b.ls);

  const criticalCount = results.filter((r) => r.critical).length;
  const totalFloat = results.length ? Math.max(...results.map((r) => r.slack)) : 0;

  return { results, projectDuration, totalFloat, criticalCount, total: results.length };
}

function riskFor(task) {
  if (task.critical) return { label: "High", classes: "bg-error-container text-on-error-container" };
  if (task.slack <= 3) return { label: "Med", classes: "bg-surface-container-highest text-on-surface-variant" };
  return { label: "Low", classes: "bg-secondary-container text-on-secondary-container" };
}

export default function CriticalPath() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newTask, setNewTask] = useState({ name: "", duration: 1, dependencies: [] });
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
        <div className="p-10 text-on-surface-variant">Loading critical path workshop…</div>
      </Layout>
    );
  }

  const tasks = doc.data?.tasks || [];
  const cpm = computeCPM(tasks);

  function addTask() {
    if (!newTask.name.trim()) return;
    updateData({
      tasks: [
        ...tasks,
        {
          id: `ct${Date.now()}`,
          name: newTask.name.trim(),
          duration: Number(newTask.duration) || 1,
          dependencies: [...newTask.dependencies],
        },
      ],
    });
    setNewTask({ name: "", duration: 1, dependencies: [] });
  }

  function removeTask(tid) {
    updateData({
      tasks: tasks
        .filter((t) => t.id !== tid)
        .map((t) => ({ ...t, dependencies: (t.dependencies || []).filter((d) => d !== tid) })),
    });
  }

  function toggleDep(tid) {
    setNewTask((v) => ({
      ...v,
      dependencies: v.dependencies.includes(tid)
        ? v.dependencies.filter((d) => d !== tid)
        : [...v.dependencies, tid],
    }));
  }

  const bottleneck = cpm.results.filter((r) => r.critical).sort((a, b) => b.duration - a.duration)[0];
  const bottleneckProbability = cpm.total ? Math.round((cpm.criticalCount / cpm.total) * 100) : 0;
  const insight = bottleneck
    ? `Your Critical Path is sensitive to "${bottleneck.name}" (${bottleneck.duration}d, 0 slack). Delays here push the entire ${cpm.projectDuration}-day project out.`
    : "Add tasks and dependencies to compute the critical path.";

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Critical Path Analysis Workshop
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
            <p className="text-xs uppercase text-on-surface-variant mb-1">Project Duration</p>
            <p className="text-2xl font-bold text-primary">{cpm.projectDuration} Days</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
            <p className="text-xs uppercase text-on-surface-variant mb-1">Total Float</p>
            <p className="text-2xl font-bold text-secondary">{cpm.totalFloat} Days</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
            <p className="text-xs uppercase text-on-surface-variant mb-1">Critical Tasks</p>
            <p className="text-2xl font-bold text-error">
              {cpm.criticalCount}/{cpm.total}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border-2 border-primary shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shrink-0">
              <Icon name="trending_up" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Analysis Status</p>
              <p className="text-xs text-on-surface-variant leading-tight">
                {cpm.total ? "Path Computed" : "Awaiting Tasks"}
              </p>
            </div>
          </div>
        </div>

        {/* Node chain */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6 overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max pb-2">
            {cpm.results.map((r, i) => (
              <div key={r.id} className="flex items-center gap-6">
                <div
                  className={`w-40 rounded-xl overflow-hidden shrink-0 shadow-sm ${
                    r.critical ? "border-2 border-primary" : "border border-outline-variant"
                  }`}
                >
                  <div className={`px-3 py-1.5 flex justify-between items-center ${r.critical ? "bg-primary" : "bg-surface-container-highest"}`}>
                    <span className={`text-xs font-semibold truncate ${r.critical ? "text-white" : "text-on-surface"}`}>
                      {i + 1}. {r.name}
                    </span>
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-surface p-1 rounded">
                      <p className="text-[9px] text-on-surface-variant font-bold uppercase">ES</p>
                      <p className="text-xs font-bold text-primary">{r.es}</p>
                    </div>
                    <div className="bg-surface p-1 rounded">
                      <p className="text-[9px] text-on-surface-variant font-bold uppercase">LS</p>
                      <p className="text-xs font-bold text-primary">{r.ls}</p>
                    </div>
                    <div className={`col-span-2 p-1 rounded ${r.critical ? "bg-secondary/10" : "bg-secondary-container/30"}`}>
                      <p className="text-[9px] text-secondary font-bold uppercase">Slack: {r.slack}</p>
                    </div>
                  </div>
                </div>
                {i < cpm.results.length - 1 && (
                  <Icon name="arrow_forward" className="text-outline-variant shrink-0" />
                )}
              </div>
            ))}
            {cpm.results.length === 0 && (
              <p className="text-sm text-on-surface-variant">No tasks yet — add one below.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-outline-variant p-6 shadow-sm">
            <h3 className="text-lg font-bold text-primary mb-4">Path Analysis Log</h3>
            <table className="w-full mb-4">
              <thead>
                <tr className="text-left text-xs uppercase text-on-surface-variant border-b border-outline-variant">
                  <th className="pb-3">Task Name</th>
                  <th className="pb-3 text-center">Duration</th>
                  <th className="pb-3 text-center">Slack</th>
                  <th className="pb-3 text-right">Risk</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {cpm.results.map((r) => {
                  const risk = riskFor(r);
                  return (
                    <tr key={r.id} className="border-b border-outline-variant/30 group">
                      <td className="py-3 text-sm font-medium">{r.name}</td>
                      <td className="py-3 text-center text-sm">{r.duration}d</td>
                      <td className={`py-3 text-center text-sm font-bold ${r.critical ? "text-error" : "text-secondary"}`}>
                        {r.slack}d
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${risk.classes}`}>
                          {risk.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => removeTask(r.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {cpm.results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-on-surface-variant">
                      No tasks yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-t border-outline-variant pt-4 space-y-2">
              <div className="flex gap-2">
                <input
                  value={newTask.name}
                  onChange={(e) => setNewTask((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Task name"
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <input
                  type="number"
                  min="1"
                  value={newTask.duration}
                  onChange={(e) => setNewTask((v) => ({ ...v, duration: e.target.value }))}
                  placeholder="Days"
                  className="w-24 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <button
                  onClick={addTask}
                  disabled={!newTask.name.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-40"
                >
                  Add Task
                </button>
              </div>
              {tasks.length > 0 && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Depends on:</p>
                  <div className="flex flex-wrap gap-2">
                    {tasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleDep(t.id)}
                        className={`text-xs px-3 py-1 rounded-full border ${
                          newTask.dependencies.includes(t.id)
                            ? "bg-primary text-white border-primary"
                            : "bg-surface-container text-on-surface-variant border-outline-variant"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-primary text-white rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold mb-4">Workshop Insights</h3>
            <p className="text-sm text-white/80 mb-6">{insight}</p>
            <div className="mt-auto space-y-4">
              <div className="bg-white/10 p-4 rounded-lg border border-white/20">
                <p className="text-xs uppercase text-white/60">Critical Path Share</p>
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-secondary h-full" style={{ width: `${bottleneckProbability}%` }} />
                </div>
                <p className="text-right text-sm mt-1">{bottleneckProbability}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
