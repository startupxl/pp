import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import FrameworkGuide from "../components/FrameworkGuide";
import AIAssistPanel from "../components/AIAssistPanel";
import { api } from "../api";

function defaultData() {
  return {
    tasks: [
      { id: "t1", text: "Respond to investor diligence request", urgent: true, important: true },
      { id: "t2", text: "Write Q3 product roadmap", urgent: false, important: true },
      { id: "t3", text: "Approve routine expense reports", urgent: true, important: false },
      { id: "t4", text: "Reorganize the shared drive folder structure", urgent: false, important: false },
    ],
  };
}

const QUADRANTS = {
  do: { label: "Do First", desc: "Urgent & Important", color: "bg-error text-white", advice: "Handle these yourself, now." },
  schedule: { label: "Schedule", desc: "Important, Not Urgent", color: "bg-secondary text-white", advice: "Block time for these — this is where strategy happens." },
  delegate: { label: "Delegate", desc: "Urgent, Not Important", color: "bg-primary-fixed-dim text-primary", advice: "Hand these off if you can." },
  delete: { label: "Delete", desc: "Neither", color: "bg-outline-variant text-on-surface", advice: "Drop these or batch them for later." },
};

function quadrantFor(urgent, important) {
  if (urgent && important) return "do";
  if (!urgent && important) return "schedule";
  if (urgent && !important) return "delegate";
  return "delete";
}

// Deterministic heuristic — no external LLM call.
function analyzeEisenhower(data) {
  const tasks = (data.tasks || []).map((t) => ({ ...t, quadrant: quadrantFor(t.urgent, t.important) }));
  const grouped = { do: [], schedule: [], delegate: [], delete: [] };
  tasks.forEach((t) => grouped[t.quadrant].push(t));
  const overloaded = grouped.do.length > grouped.schedule.length && grouped.do.length >= 3;
  return { tasks, grouped, overloaded };
}

export default function EisenhowerMatrix() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState("");
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
        <div className="p-10 text-on-surface-variant">Loading Eisenhower Matrix…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeEisenhower(data);

  function updateTask(tid, patch) {
    updateData({ tasks: data.tasks.map((t) => (t.id === tid ? { ...t, ...patch } : t)) });
  }

  function removeTask(tid) {
    updateData({ tasks: data.tasks.filter((t) => t.id !== tid) });
  }

  function addTask() {
    if (!draft.trim()) return;
    updateData({ tasks: [...data.tasks, { id: `t${Date.now()}`, text: draft.trim(), urgent: false, important: false }] });
    setDraft("");
  }

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Eisenhower Matrix</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onTitleBlur} className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant" />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 max-w-2xl">Mark each task urgent and/or important — the quadrant tells you whether to do it now, schedule it, delegate it, or drop it.</p>
        <FrameworkGuide toolKey="eisenhower_matrix" className="mb-6 max-w-2xl" />
        <AIAssistPanel
          toolKey="eisenhower_matrix"
          frameworkName="Eisenhower Matrix"
          documentData={data}
          documentTitle={title}
          className="mb-6 max-w-2xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(QUADRANTS).map(([key, q]) => (
            <div key={key} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className={`px-4 py-2 flex items-center justify-between ${q.color}`}>
                <span className="font-bold text-sm">{q.label}</span>
                <span className="text-xs opacity-80">{q.desc}</span>
              </div>
              <div className="p-4">
                {analysis.grouped[key].length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">Nothing here.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {analysis.grouped[key].map((t) => (
                      <li key={t.id} className="text-sm">{t.text}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/30">{q.advice}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <h3 className="font-bold text-primary mb-4">Tasks</h3>
          <div className="space-y-2 mb-4">
            {data.tasks.map((t) => (
              <div key={t.id} className="group flex items-center gap-4 p-3 rounded-lg border border-outline-variant">
                <input value={t.text} onChange={(e) => updateTask(t.id, { text: e.target.value })} className="flex-1 text-sm bg-transparent outline-none" />
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={t.urgent} onChange={(e) => updateTask(t.id, { urgent: e.target.checked })} /> Urgent
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={t.important} onChange={(e) => updateTask(t.id, { important: e.target.checked })} /> Important
                </label>
                <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New task…" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
            <button onClick={addTask} className="px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-1 text-sm"><Icon name="add" className="text-[16px]" /> Add</button>
          </div>
        </div>

        {analysis.overloaded && (
          <div className="mt-6 p-4 rounded-xl bg-error-container/20 border border-error/20 text-sm text-error">
            You have more "Do First" tasks than "Schedule" tasks — that usually means important work is being crowded out by fire-fighting. Look for what could move to Delegate or Delete.
          </div>
        )}
      </div>
    </Layout>
  );
}
