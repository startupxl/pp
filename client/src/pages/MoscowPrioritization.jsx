import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const COLUMNS = [
  { key: "must", label: "Must Have", tag: "CRITICAL", color: "bg-error", tagClass: "bg-error-container text-on-error-container" },
  { key: "should", label: "Should Have", tag: "HIGH", color: "bg-secondary", tagClass: "bg-secondary-container text-on-secondary-container" },
  { key: "could", label: "Could Have", tag: "DESIRABLE", color: "bg-on-primary-container", tagClass: "bg-surface-container-high text-on-surface-variant" },
  { key: "wont", label: "Won't Have", tag: "FUTURE", color: "bg-outline", tagClass: "bg-surface-dim text-on-surface-variant" },
];

function defaultData() {
  return {
    tasks: [
      { id: "t1", column: "must", category: "Engineering", title: "Core Authentication API", hours: 120 },
      { id: "t2", column: "must", category: "Product", title: "Data Encryption Layer", hours: 45 },
      { id: "t3", column: "should", category: "UX Design", title: "Dark Mode Interface", hours: 32 },
      { id: "t4", column: "could", category: "Social", title: "Slack Integration", hours: 18 },
      { id: "t5", column: "wont", category: "Marketing", title: "Custom Email Templates", hours: 40 },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeMoscow(data) {
  const tasks = data.tasks || [];
  const totalHours = tasks.reduce((s, t) => s + Number(t.hours || 0), 0);
  const byColumn = {};
  COLUMNS.forEach((c) => {
    const colTasks = tasks.filter((t) => t.column === c.key);
    byColumn[c.key] = { tasks: colTasks, hours: colTasks.reduce((s, t) => s + Number(t.hours || 0), 0) };
  });
  const mustPct = totalHours > 0 ? (byColumn.must.hours / totalHours) * 100 : 0;

  let scopePressure = "Balanced";
  if (mustPct >= 60) scopePressure = "Overloaded — Must Have consumes most of the scope";
  else if (mustPct <= 20 && totalHours > 0) scopePressure = "Light — plenty of room for Should/Could items";

  return { byColumn, totalHours, mustPct, scopePressure };
}

export default function MoscowPrioritization() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState({ category: "", title: "", hours: "" });
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
        <div className="p-10 text-on-surface-variant">Loading MoSCoW board…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeMoscow(data);

  function moveTask(tid, dir) {
    const idx = COLUMNS.findIndex((c) => c.key === data.tasks.find((t) => t.id === tid).column);
    const nextIdx = Math.max(0, Math.min(COLUMNS.length - 1, idx + dir));
    updateData({ tasks: data.tasks.map((t) => (t.id === tid ? { ...t, column: COLUMNS[nextIdx].key } : t)) });
  }

  function removeTask(tid) {
    updateData({ tasks: data.tasks.filter((t) => t.id !== tid) });
  }

  function addTask(column) {
    if (!draft.title.trim()) return;
    updateData({ tasks: [...data.tasks, { id: `t${Date.now()}`, column, category: draft.category.trim() || "General", title: draft.title.trim(), hours: Number(draft.hours) || 0 }] });
    setDraft({ category: "", title: "", hours: "" });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">MoSCoW Prioritization Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="bg-white border border-outline-variant rounded-xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase text-on-surface-variant">Total scoped hours</span>
            <p className="text-2xl font-bold text-primary">{analysis.totalHours}h</p>
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-xs mb-1">
              <span>Must Have share of scope</span>
              <span className="font-bold">{analysis.mustPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-error rounded-full" style={{ width: `${analysis.mustPct}%` }} />
            </div>
          </div>
          <div className="text-sm font-medium text-primary">{analysis.scopePressure}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {COLUMNS.map((col, colIdx) => (
            <div key={col.key} className="flex flex-col bg-surface-container-low/30 rounded-2xl border border-outline-variant/50 p-4">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-6 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-primary">{col.label}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${col.tagClass}`}>{col.tag}</span>
              </div>
              <div className="flex flex-col gap-3 mb-3 min-h-[80px]">
                {analysis.byColumn[col.key].tasks.map((t) => (
                  <div key={t.id} className="group bg-white p-3 rounded-xl border border-outline-variant shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-secondary/10 text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase">{t.category}</span>
                      <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[14px]" /></button>
                    </div>
                    <p className="text-sm text-on-surface leading-tight mb-2">{t.title}</p>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="text-xs flex items-center gap-1"><Icon name="schedule" className="text-[14px]" /> {t.hours}h</span>
                      <div className="flex gap-1">
                        <button disabled={colIdx === 0} onClick={() => moveTask(t.id, -1)} className="p-1 rounded hover:bg-surface-container disabled:opacity-20"><Icon name="chevron_left" className="text-[16px]" /></button>
                        <button disabled={colIdx === COLUMNS.length - 1} onClick={() => moveTask(t.id, 1)} className="p-1 rounded hover:bg-surface-container disabled:opacity-20"><Icon name="chevron_right" className="text-[16px]" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-on-surface-variant mb-2">{analysis.byColumn[col.key].hours}h total</div>
              <div className="space-y-1.5">
                <input value={draft.category} onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))} placeholder="Category" className="w-full text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary" />
                <input value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} placeholder="Task" className="w-full text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary" />
                <div className="flex gap-1">
                  <input type="number" value={draft.hours} onChange={(e) => setDraft((v) => ({ ...v, hours: e.target.value }))} placeholder="hrs" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary" />
                  <button onClick={() => addTask(col.key)} className="px-2 bg-primary text-white rounded-md"><Icon name="add" className="text-[14px]" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
