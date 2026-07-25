import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    northStar: { label: "Meaningful Connections Established", current: 2842, target: 4000 },
    dailyActive: [
      { day: "Mon", pct: 40 },
      { day: "Tue", pct: 55 },
      { day: "Wed", pct: 42 },
      { day: "Thu", pct: 72 },
      { day: "Fri", pct: 65 },
      { day: "Sat", pct: 20 },
      { day: "Sun", pct: 15 },
    ],
    cohorts: [
      { id: "co1", label: "Oct 02", size: 1240, retention: [100, 42, 38, 31, 28, 24] },
      { id: "co2", label: "Oct 09", size: 1412, retention: [100, 45, 41, 35, 30] },
      { id: "co3", label: "Oct 16", size: 988, retention: [100, 40, 36, 32] },
    ],
    features: [
      { id: "f1", name: "AI Strategy Generator", adoption: 82 },
      { id: "f2", name: "Execution Roadmap", adoption: 64 },
      { id: "f3", name: "Team Insights Portal", adoption: 41 },
      { id: "f4", name: "Custom Workspaces", adoption: 29 },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeAnalytics(data) {
  const ns = data.northStar || {};
  const northStarPct = ns.target > 0 ? Math.min(100, (Number(ns.current) / Number(ns.target)) * 100) : 0;
  const avgDau = data.dailyActive?.length ? data.dailyActive.reduce((s, d) => s + Number(d.pct), 0) / data.dailyActive.length : 0;
  const wk1Retentions = (data.cohorts || []).map((c) => c.retention[1]).filter((v) => v !== undefined);
  const avgWk1Retention = wk1Retentions.length ? wk1Retentions.reduce((s, v) => s + v, 0) / wk1Retentions.length : 0;
  const topFeature = (data.features || []).reduce((max, f) => (max === null || f.adoption > max.adoption ? f : max), null);
  const laggingFeature = (data.features || []).reduce((min, f) => (min === null || f.adoption < min.adoption ? f : min), null);
  return { northStarPct, avgDau, avgWk1Retention, topFeature, laggingFeature };
}

function cohortColor(pct) {
  const alpha = Math.max(0.15, pct / 100);
  return { backgroundColor: `rgba(0,105,112,${alpha})`, color: alpha > 0.5 ? "#fff" : "#041627" };
}

export default function ProductAnalytics() {
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
        <div className="p-10 text-on-surface-variant">Loading product analytics…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeAnalytics(data);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Product Analytics Dashboard</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-secondary mb-2">North Star Metric</div>
            <div className="text-4xl font-bold text-primary mb-1">{Number(data.northStar.current).toLocaleString()}</div>
            <p className="text-sm text-on-surface-variant mb-4">{data.northStar.label}</p>
            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-2">
              <div className="h-full bg-secondary" style={{ width: `${analysis.northStarPct}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant">Target: {Number(data.northStar.target).toLocaleString()}</span>
              <span className="text-secondary font-bold">{analysis.northStarPct.toFixed(0)}% reached</span>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-primary">Weekly Active Usage</h3>
              <span className="text-secondary font-bold text-lg">{analysis.avgDau.toFixed(1)}% avg</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {data.dailyActive.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-secondary-container/20 rounded-t-lg relative" style={{ height: "100%" }}>
                    <div className="absolute bottom-0 w-full bg-secondary rounded-t-lg" style={{ height: `${d.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-medium">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-2">Retention Cohorts</h3>
            <p className="text-xs text-on-surface-variant mb-4">Avg Week 1 retention: {analysis.avgWk1Retention.toFixed(0)}%</p>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-on-surface-variant">
                  <th className="pb-2">Cohort</th>
                  <th className="pb-2">Size</th>
                  {[0, 1, 2, 3, 4, 5].map((w) => <th key={w} className="pb-2 text-center">Wk {w}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1 font-semibold text-primary">{c.label}</td>
                    <td className="py-1 text-on-surface-variant">{c.size}</td>
                    {[0, 1, 2, 3, 4, 5].map((w) => (
                      <td key={w} className="py-1 px-1">
                        {c.retention[w] !== undefined && (
                          <div className="h-7 rounded flex items-center justify-center font-bold" style={cohortColor(c.retention[w])}>{c.retention[w]}%</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-6">Feature Adoption</h3>
            <div className="space-y-5">
              {data.features.map((f) => (
                <div key={f.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-primary">{f.name}</span>
                    <span className="text-on-surface-variant">{f.adoption}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: `${f.adoption}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {analysis.laggingFeature && (
              <p className="text-xs text-on-surface-variant mt-4">
                <strong className="text-primary">{analysis.laggingFeature.name}</strong> has the lowest adoption ({analysis.laggingFeature.adoption}%) — consider onboarding nudges.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
