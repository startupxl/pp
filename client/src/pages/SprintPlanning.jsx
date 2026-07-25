import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const PRIORITY_ICON = { high: "priority_high", low: "low_priority", none: "drag_handle" };
const PRIORITY_COLOR = { high: "text-error", low: "text-secondary", none: "text-on-surface-variant" };

function healthFor(committed, capacity) {
  if (capacity <= 0) return { label: "No Capacity Set", classes: "text-on-surface-variant" };
  const pct = (committed / capacity) * 100;
  if (committed === 0) return { label: "Not Started", classes: "text-on-surface-variant" };
  if (pct > 100) return { label: "Overloaded", classes: "text-error" };
  if (pct >= 85) return { label: "Balanced", classes: "text-secondary" };
  if (pct >= 50) return { label: "Light", classes: "text-primary" };
  return { label: "Underutilized", classes: "text-on-surface-variant" };
}

export default function SprintPlanning() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newTask, setNewTask] = useState({ key: "", title: "", points: 1, assignee: "", priority: "none" });
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
        <div className="p-10 text-on-surface-variant">Loading sprint planning board…</div>
      </Layout>
    );
  }

  const sprintGoal = doc.data?.sprintGoal || "";
  const capacity = doc.data?.capacity ?? 60;
  const backlog = doc.data?.backlog || [];
  const sprint = doc.data?.sprint || [];
  const committed = sprint.reduce((s, t) => s + Number(t.points || 0), 0);
  const health = healthFor(committed, capacity);
  const utilizationPct = capacity > 0 ? Math.min(100, Math.round((committed / capacity) * 100)) : 0;

  function addTask() {
    if (!newTask.title.trim()) return;
    updateData({
      backlog: [
        ...backlog,
        { id: `t${Date.now()}`, key: newTask.key.trim() || "TASK", title: newTask.title.trim(), points: Number(newTask.points) || 1, assignee: newTask.assignee.trim(), priority: newTask.priority },
      ],
    });
    setNewTask({ key: "", title: "", points: 1, assignee: "", priority: "none" });
  }

  function moveTask(taskId, from, to) {
    const source = from === "backlog" ? backlog : sprint;
    const task = source.find((t) => t.id === taskId);
    if (!task) return;
    if (from === "backlog") {
      updateData({
        backlog: backlog.filter((t) => t.id !== taskId),
        sprint: [...sprint, task],
      });
    } else {
      updateData({
        sprint: sprint.filter((t) => t.id !== taskId),
        backlog: [...backlog, task],
      });
    }
  }

  function removeTask(taskId, from) {
    if (from === "backlog") updateData({ backlog: backlog.filter((t) => t.id !== taskId) });
    else updateData({ sprint: sprint.filter((t) => t.id !== taskId) });
  }

  function TaskCard({ task, from }) {
    return (
      <div className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm hover:border-secondary transition-all group">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-surface-container-highest text-primary px-2 py-1 rounded text-xs font-semibold">
            {task.key}
          </span>
          <Icon name={PRIORITY_ICON[task.priority] || "drag_handle"} className={`text-[18px] ${PRIORITY_COLOR[task.priority] || ""}`} />
        </div>
        <h4 className="text-sm font-semibold text-primary mb-3 leading-tight">{task.title}</h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">{task.assignee || "Unassigned"}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-semibold">
              <Icon name="bolt" className="text-[14px]" />
              {task.points}
            </span>
            <button
              onClick={() => moveTask(task.id, from, from === "backlog" ? "sprint" : "backlog")}
              className="text-on-surface-variant hover:text-secondary"
              title={from === "backlog" ? "Move to sprint" : "Move to backlog"}
            >
              <Icon name={from === "backlog" ? "arrow_forward" : "arrow_back"} className="text-[16px]" />
            </button>
            <button
              onClick={() => removeTask(task.id, from)}
              className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Sprint Planning Workshop
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-xs font-semibold">
                Sprint Goal
              </span>
            </div>
            <textarea
              value={sprintGoal}
              onChange={(e) => updateData({ sprintGoal: e.target.value })}
              placeholder="What is the goal of this sprint?"
              rows={2}
              className="w-full text-lg font-semibold border-none outline-none bg-transparent resize-none placeholder:text-outline-variant/50"
            />
          </div>
          <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Team Capacity
              </h3>
              <div className="flex items-center gap-1 text-lg font-bold text-primary">
                {committed} /
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => updateData({ capacity: Number(e.target.value) })}
                  className="w-14 border-b border-outline-variant outline-none text-lg font-bold"
                />
                pts
              </div>
            </div>
            <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${utilizationPct > 100 ? "bg-error" : "bg-secondary"}`}
                style={{ width: `${Math.min(100, utilizationPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Utilization</span>
              <span className={`font-bold ${health.classes}`}>{health.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-primary">Product Backlog</h3>
                <span className="bg-surface-container-highest text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {backlog.length}
                </span>
              </div>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {backlog.map((t) => (
                <TaskCard key={t.id} task={t} from="backlog" />
              ))}
              {backlog.length === 0 && (
                <p className="text-sm text-on-surface-variant px-1">Backlog is empty.</p>
              )}
            </div>
            <div className="bg-surface-container/30 border-2 border-dashed border-outline-variant/40 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input value={newTask.key} onChange={(e) => setNewTask((v) => ({ ...v, key: e.target.value }))} placeholder="Key" className="w-20 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <input value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} placeholder="Task title" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              </div>
              <div className="flex gap-2">
                <input type="number" value={newTask.points} onChange={(e) => setNewTask((v) => ({ ...v, points: e.target.value }))} placeholder="Pts" className="w-16 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <input value={newTask.assignee} onChange={(e) => setNewTask((v) => ({ ...v, assignee: e.target.value }))} placeholder="Assignee" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <select value={newTask.priority} onChange={(e) => setNewTask((v) => ({ ...v, priority: e.target.value }))} className="text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary">
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button onClick={addTask} disabled={!newTask.title.trim()} className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-secondary disabled:opacity-40 py-1.5">
                <Icon name="add_circle" className="text-[16px]" />
                Add to Backlog
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-primary">Sprint Backlog</h3>
                <span className="bg-primary text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {sprint.length}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">Total: {committed} pts</span>
            </div>
            <div className="bg-secondary/5 border-2 border-dashed border-secondary/20 rounded-2xl p-4 space-y-3 max-h-[560px] overflow-y-auto">
              {sprint.map((t) => (
                <TaskCard key={t.id} task={t} from="sprint" />
              ))}
              {sprint.length === 0 && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-on-surface-variant gap-2 opacity-60">
                  <Icon name="move_to_inbox" className="text-[32px]" />
                  <p className="text-xs">Move tasks here to include in the sprint</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
