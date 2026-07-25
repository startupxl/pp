import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const PX_PER_DAY = 24;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(str) {
  const d = new Date(`${str}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function fmt(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function diffDays(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function computeTimeline(tasks) {
  if (tasks.length === 0) return { tasks: [], rangeStart: new Date(), totalDays: 30 };
  const starts = tasks.map((t) => toDate(t.start));
  const ends = tasks.map((t) => {
    const s = toDate(t.start);
    const e = new Date(s);
    e.setDate(e.getDate() + Number(t.duration || 0));
    return e;
  });
  const rangeStart = new Date(Math.min(...starts.map((d) => d.getTime())));
  const rangeEndRaw = new Date(Math.max(...ends.map((d) => d.getTime())));
  const totalDays = Math.max(14, diffDays(rangeStart, rangeEndRaw) + 3);

  const positioned = tasks.map((t) => {
    const start = toDate(t.start);
    const offsetDays = diffDays(rangeStart, start);
    return {
      ...t,
      left: offsetDays * PX_PER_DAY,
      width: Math.max(t.milestone ? 0 : 8, Number(t.duration || 0) * PX_PER_DAY),
    };
  });

  return { tasks: positioned, rangeStart, totalDays };
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newTask, setNewTask] = useState({ name: "", start: "", duration: 5, milestone: false });
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
        <div className="p-10 text-on-surface-variant">Loading project workspace…</div>
      </Layout>
    );
  }

  const tasks = doc.data?.tasks || [];

  function addTask() {
    if (!newTask.name.trim() || !newTask.start) return;
    updateData({
      tasks: [
        ...tasks,
        {
          id: `gt${Date.now()}`,
          name: newTask.name.trim(),
          start: newTask.start,
          duration: newTask.milestone ? 0 : Number(newTask.duration) || 1,
          progress: 0,
          milestone: newTask.milestone,
        },
      ],
    });
    setNewTask({ name: "", start: "", duration: 5, milestone: false });
  }

  function updateTask(tid, patch) {
    updateData({ tasks: tasks.map((t) => (t.id === tid ? { ...t, ...patch } : t)) });
  }

  function removeTask(tid) {
    updateData({ tasks: tasks.filter((t) => t.id !== tid) });
  }

  const timeline = computeTimeline(tasks);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = diffDays(timeline.rangeStart, today);
  const showTodayLine = todayOffset >= 0 && todayOffset <= timeline.totalDays;
  const avgProgress = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + Number(t.progress || 0), 0) / tasks.length)
    : 0;

  return (
    <Layout>
      <div className="max-w-[1700px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Project Workspace
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

        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="flex">
            {/* Task list */}
            <div className="w-[340px] shrink-0 border-r border-outline-variant">
              <div className="flex bg-surface-container-low text-xs uppercase text-on-surface-variant font-semibold py-3 px-4 border-b border-outline-variant">
                <div className="w-1/2">Task Name</div>
                <div className="w-1/4">Start</div>
                <div className="w-1/4">Dur</div>
              </div>
              <div className="max-h-[520px] overflow-y-auto divide-y divide-outline-variant/30">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center py-3 px-4 hover:bg-surface-container-low transition-colors group gap-1">
                    <div className="w-1/2 flex items-center gap-2 min-w-0">
                      {t.milestone ? (
                        <Icon name="diamond" filled className="text-secondary text-[14px] shrink-0" />
                      ) : (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${Number(t.progress || 0) >= 100 ? "bg-secondary" : "bg-primary/40"}`} />
                      )}
                      <span className="text-sm font-medium truncate">{t.name}</span>
                    </div>
                    <div className="w-1/4 text-xs text-on-surface-variant">{fmt(toDate(t.start))}</div>
                    <div className="w-1/4 text-xs text-on-surface-variant flex items-center justify-between">
                      {t.milestone ? "0d" : `${t.duration}d`}
                      <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                        <Icon name="close" className="text-[12px]" />
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-on-surface-variant p-4">No tasks yet.</p>
                )}
              </div>
              <div className="p-3 border-t border-outline-variant space-y-2 bg-surface-container-low/30">
                <input value={newTask.name} onChange={(e) => setNewTask((v) => ({ ...v, name: e.target.value }))} placeholder="Task name" className="w-full text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <div className="flex gap-2">
                  <input type="date" value={newTask.start} onChange={(e) => setNewTask((v) => ({ ...v, start: e.target.value }))} className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                  {!newTask.milestone && (
                    <input type="number" min="1" value={newTask.duration} onChange={(e) => setNewTask((v) => ({ ...v, duration: e.target.value }))} className="w-16 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <input type="checkbox" checked={newTask.milestone} onChange={(e) => setNewTask((v) => ({ ...v, milestone: e.target.checked }))} />
                  Milestone (no duration)
                </label>
                <button onClick={addTask} disabled={!newTask.name.trim() || !newTask.start} className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-secondary disabled:opacity-40 py-1.5">
                  <Icon name="add_circle" className="text-[16px]" />
                  Add Task
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-x-auto relative">
              <div
                className="relative"
                style={{
                  width: `${Math.max(600, timeline.totalDays * PX_PER_DAY)}px`,
                  minHeight: "520px",
                  backgroundImage:
                    "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
                  backgroundSize: `${PX_PER_DAY * 7}px 44px`,
                }}
              >
                {showTodayLine && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-error z-10"
                    style={{ left: `${todayOffset * PX_PER_DAY}px` }}
                  >
                    <span className="absolute top-0 left-1 bg-error text-white text-[9px] px-1 rounded whitespace-nowrap">
                      Today
                    </span>
                  </div>
                )}
                <div className="pt-3">
                  {timeline.tasks.map((t) => (
                    <div key={t.id} className="relative h-11 px-2">
                      {t.milestone ? (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-2 group"
                          style={{ left: `${t.left}px` }}
                        >
                          <div className="w-5 h-5 rotate-45 bg-secondary border-2 border-white shadow-lg" />
                          <span className="text-xs font-semibold text-primary whitespace-nowrap">{t.name}</span>
                        </div>
                      ) : (
                        <div
                          className={`absolute h-8 rounded-lg shadow-md flex items-center px-3 border transition-all ${
                            Number(t.progress || 0) >= 100
                              ? "bg-secondary border-secondary"
                              : "bg-primary-container border-primary"
                          }`}
                          style={{ left: `${t.left}px`, width: `${t.width}px` }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-white/25 rounded-l-lg"
                            style={{ width: `${Math.min(100, Number(t.progress || 0))}%` }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={t.progress || 0}
                            onChange={(e) => updateTask(t.id, { progress: Number(e.target.value) })}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            title="Drag to set progress"
                          />
                          <span className="text-white text-[11px] z-10 truncate pointer-events-none">
                            {t.progress || 0}% {t.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-outline-variant bg-white px-4 py-2.5 flex items-center justify-between text-xs text-on-surface-variant">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-secondary" /> Complete
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary-container" /> In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rotate-45 bg-secondary" /> Milestone
              </span>
            </div>
            <span>
              {tasks.length} task{tasks.length === 1 ? "" : "s"} • {avgProgress}% average progress
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
