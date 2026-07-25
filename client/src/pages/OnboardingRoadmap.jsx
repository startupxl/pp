import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    employeeName: "",
    phases: [
      {
        id: "p1",
        label: "Pre-boarding Essentials",
        tasks: [
          { id: "t1", label: "Equipment shipped", done: true },
          { id: "t2", label: "Accounts provisioned", done: true },
        ],
      },
      {
        id: "p2",
        label: "Week 1: Settling In",
        tasks: [
          { id: "t3", label: "Company Orientation & Culture Session", done: true },
          { id: "t4", label: "Meet your Onboarding Buddy", done: false },
          { id: "t5", label: "Access Setup: Core Tools", done: false },
        ],
      },
      {
        id: "p3",
        label: "Month 1: Deep Work & Impact",
        tasks: [
          { id: "t6", label: "Complete first project milestone", done: false },
          { id: "t7", label: "30-day check-in with manager", done: false },
        ],
      },
    ],
    contacts: [
      { id: "c1", name: "Jordan Smith", role: "Manager / Mentor" },
      { id: "c2", name: "Sarah Jenkins", role: "Onboarding Buddy" },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeOnboarding(data) {
  const phases = data.phases || [];
  const allTasks = phases.flatMap((p) => p.tasks);
  const doneCount = allTasks.filter((t) => t.done).length;
  const overallProgress = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;
  const phaseProgress = phases.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.done).length;
    return { ...p, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  });
  const currentPhase = phaseProgress.find((p) => p.pct < 100) || phaseProgress[phaseProgress.length - 1];
  return { overallProgress, phaseProgress, currentPhase };
}

export default function OnboardingRoadmap() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
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
        <div className="p-10 text-on-surface-variant">Loading onboarding roadmap…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeOnboarding(data);

  function toggleTask(pid, tid) {
    updateData({
      phases: data.phases.map((p) =>
        p.id !== pid ? p : { ...p, tasks: p.tasks.map((t) => (t.id === tid ? { ...t, done: !t.done } : t)) }
      ),
    });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Employee Onboarding Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <input
            value={data.employeeName}
            onChange={(e) => updateData({ employeeName: e.target.value })}
            placeholder="Employee name"
            className="text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">Overall Progress</span>
            <span className="text-xl font-bold text-secondary">{analysis.overallProgress}%</span>
            <div className="w-48 h-2 bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${analysis.overallProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {analysis.phaseProgress.map((p) => (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${p.id === analysis.currentPhase?.id ? "border-secondary" : "border-outline-variant"}`}>
                <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
                  <h3 className="font-bold text-primary">{p.label}</h3>
                  <span className="text-xs text-on-surface-variant">{p.done}/{p.total} complete</span>
                </div>
                <div className="p-4 space-y-2">
                  {p.tasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(p.id, t.id)} className="w-4 h-4 accent-secondary" />
                      <span className={`text-sm ${t.done ? "line-through text-on-surface-variant" : "text-primary"}`}>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm h-fit">
            <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Icon name="groups" className="text-secondary" /> Support Network</h3>
            <div className="space-y-3">
              {data.contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-on-secondary-container">
                    {c.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{c.name}</p>
                    <p className="text-xs text-on-surface-variant">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
