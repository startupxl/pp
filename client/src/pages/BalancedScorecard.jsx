import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    perspectives: [
      {
        id: "financial",
        name: "Financial",
        icon: "payments",
        kpis: [
          { id: "k1", label: "Revenue Growth", current: 1.2, target: 1.5, unit: "$M" },
          { id: "k2", label: "Net Profit Margin", current: 24, target: 20, unit: "%" },
          { id: "k3", label: "Cost Reduction Index", current: 92, target: 100, unit: "%" },
        ],
      },
      {
        id: "customer",
        name: "Customer",
        icon: "group",
        kpis: [
          { id: "k4", label: "Net Promoter Score", current: 74, target: 80, unit: "" },
          { id: "k5", label: "Customer Retention Rate", current: 98, target: 95, unit: "%" },
          { id: "k6", label: "Support Resolution Time", current: 2.4, target: 4.0, unit: "h", lowerIsBetter: true },
        ],
      },
      {
        id: "internal_process",
        name: "Internal Process",
        icon: "settings_suggest",
        kpis: [
          { id: "k7", label: "Cycle Time", current: 14, target: 10, unit: "d", lowerIsBetter: true },
          { id: "k8", label: "Quality Control (Error Rate)", current: 0.8, target: 0.5, unit: "%", lowerIsBetter: true },
          { id: "k9", label: "Unit Cost Efficiency", current: 104, target: 100, unit: "%" },
        ],
      },
      {
        id: "learning_growth",
        name: "Learning & Growth",
        icon: "psychology",
        kpis: [
          { id: "k10", label: "Talent Retention Rate", current: 82, target: 95, unit: "%" },
          { id: "k11", label: "Training Hours per FTE", current: 12, target: 40, unit: "h" },
          { id: "k12", label: "Strategic Skill Gap Closed", current: 22, target: 100, unit: "%" },
        ],
      },
    ],
  };
}

function achievementFor(kpi) {
  const current = Number(kpi.current) || 0;
  const target = Number(kpi.target) || 0;
  if (target === 0) return 0;
  if (kpi.lowerIsBetter) {
    // lower actual than target is good; achievement caps at 100 when at/below target
    return Math.min(150, (target / Math.max(current, 0.0001)) * 100);
  }
  return Math.min(150, (current / target) * 100);
}

function statusFor(avg) {
  if (avg >= 90) return { label: "On Track", color: "text-green-700 bg-green-100", dot: "bg-green-600" };
  if (avg >= 70) return { label: "At Risk", color: "text-amber-700 bg-amber-100", dot: "bg-amber-600" };
  return { label: "Critical", color: "text-red-700 bg-red-100", dot: "bg-red-600" };
}

// Deterministic heuristic — no external LLM call.
function analyzeScorecard(data) {
  const perspectives = (data.perspectives || []).map((p) => {
    const kpisWithAchievement = p.kpis.map((k) => ({ ...k, achievement: achievementFor(k) }));
    const avg = kpisWithAchievement.length
      ? kpisWithAchievement.reduce((s, k) => s + Math.min(k.achievement, 100), 0) / kpisWithAchievement.length
      : 0;
    return { ...p, kpis: kpisWithAchievement, avg, status: statusFor(avg) };
  });
  const overall = perspectives.length ? perspectives.reduce((s, p) => s + p.avg, 0) / perspectives.length : 0;
  const weakest = perspectives.reduce((worst, p) => (worst === null || p.avg < worst.avg ? p : worst), null);
  return { perspectives, overall, weakest };
}

export default function BalancedScorecard() {
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
        <div className="p-10 text-on-surface-variant">Loading balanced scorecard…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeScorecard(data);

  function updateKpi(pid, kid, field, value) {
    updateData({
      perspectives: data.perspectives.map((p) =>
        p.id !== pid
          ? p
          : { ...p, kpis: p.kpis.map((k) => (k.id === kid ? { ...k, [field]: value } : k)) }
      ),
    });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Balanced Scorecard Dashboard</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="rounded-2xl p-6 mb-6 bg-gradient-to-r from-primary to-primary-container text-white flex items-center justify-between flex-wrap gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/70 mb-1">Overall Organizational Health</div>
            <div className="text-3xl font-extrabold">{analysis.overall.toFixed(0)}%</div>
            {analysis.weakest && (
              <p className="text-white/80 text-sm mt-2 max-w-lg">
                {analysis.weakest.name} needs the most attention this period ({analysis.weakest.avg.toFixed(0)}% achievement).
              </p>
            )}
          </div>
          <Icon name="trending_up" className="text-5xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analysis.perspectives.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Icon name={p.icon} className="text-secondary" />
                  </div>
                  <h3 className="font-bold text-primary">{p.name}</h3>
                </div>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${p.status.color}`}>
                  <span className={`w-2 h-2 rounded-full ${p.status.dot}`} />
                  {p.status.label}
                </span>
              </div>
              <div className="space-y-5">
                {p.kpis.map((k) => (
                  <div key={k.id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{k.label}</span>
                      <span className="text-primary font-medium">
                        <input
                          type="number"
                          value={k.current}
                          onChange={(e) => updateKpi(p.id, k.id, "current", Number(e.target.value))}
                          className="w-16 text-right bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
                        />
                        {k.unit} /{" "}
                        <input
                          type="number"
                          value={k.target}
                          onChange={(e) => updateKpi(p.id, k.id, "target", Number(e.target.value))}
                          className="w-16 text-right bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
                        />
                        {k.unit}
                      </span>
                    </div>
                    <div className="bg-surface-container-low rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${k.achievement >= 90 ? "bg-secondary" : k.achievement >= 70 ? "bg-amber-500" : "bg-error"}`}
                        style={{ width: `${Math.min(100, k.achievement)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant flex justify-between">
                <span>Perspective average</span>
                <span className="font-semibold text-primary">{p.avg.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
