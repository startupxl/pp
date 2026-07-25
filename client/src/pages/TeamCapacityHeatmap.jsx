import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    weeks: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5"],
    departments: [
      { id: "dep1", name: "Product Design", capacityHours: 45, hours: [42, 45, 52, 60, 48] },
      { id: "dep2", name: "Engineering", capacityHours: 45, hours: [58, 62, 65, 55, 45] },
      { id: "dep3", name: "Marketing", capacityHours: 40, hours: [30, 32, 35, 42, 45] },
    ],
    openHeadcount: 6,
    projectedGapRoles: 8,
  };
}

function cellTier(hours, capacity) {
  const pct = capacity > 0 ? (hours / capacity) * 100 : 0;
  if (pct >= 120) return { classes: "bg-error-container text-error" };
  if (pct >= 100) return { classes: "bg-amber-100 text-amber-700" };
  return { classes: "bg-secondary/10 text-secondary" };
}

// Deterministic heuristic — no external LLM call.
function analyzeCapacity(data) {
  const departments = data.departments || [];
  const withAvg = departments.map((d) => {
    const avgHours = d.hours.length ? d.hours.reduce((s, h) => s + Number(h), 0) / d.hours.length : 0;
    const utilization = d.capacityHours > 0 ? (avgHours / d.capacityHours) * 100 : 0;
    return { ...d, avgHours, utilization };
  });
  const overloaded = withAvg.filter((d) => d.utilization > 100).sort((a, b) => b.utilization - a.utilization);
  const globalUtilization = withAvg.length ? Math.round(withAvg.reduce((s, d) => s + d.utilization, 0) / withAvg.length) : 0;
  return { withAvg, overloaded, globalUtilization };
}

export default function TeamCapacityHeatmap() {
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
        <div className="p-10 text-on-surface-variant">Loading team capacity heatmap…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeCapacity(data);

  function updateCell(depId, weekIdx, value) {
    updateData({
      departments: data.departments.map((d) =>
        d.id !== depId ? d : { ...d, hours: d.hours.map((h, i) => (i === weekIdx ? Number(value) : h)) }
      ),
    });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Team Capacity Heatmap</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-2xl p-5 border shadow-sm ${analysis.globalUtilization > 100 ? "bg-error-container/20 border-error/20" : "bg-white border-outline-variant"}`}>
            <div className="text-xs uppercase text-on-surface-variant mb-1">Global Utilization</div>
            <div className="text-2xl font-bold text-primary">{analysis.globalUtilization}%</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-on-surface-variant mb-1">Open Headcount</div>
            <div className="text-2xl font-bold text-primary">{data.openHeadcount}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-on-surface-variant mb-1">Projected Gap</div>
            <div className="text-2xl font-bold text-primary">+{data.projectedGapRoles} Roles</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm mb-6">
          <h3 className="font-bold text-primary mb-6">Weekly Utilization Heatmap</h3>
          <table className="w-full border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="text-left text-xs text-on-surface-variant w-40">Department</th>
                {data.weeks.map((w) => (
                  <th key={w} className="text-xs text-on-surface-variant">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.departments.map((d) => (
                <tr key={d.id}>
                  <td className="text-sm font-medium text-primary">{d.name}</td>
                  {d.hours.map((h, wi) => {
                    const tier = cellTier(h, d.capacityHours);
                    return (
                      <td key={wi}>
                        <input
                          type="number"
                          value={h}
                          onChange={(e) => updateCell(d.id, wi, e.target.value)}
                          className={`w-full h-11 rounded-lg text-center text-sm font-bold outline-none ${tier.classes}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {analysis.overloaded.length > 0 && (
          <div className="bg-error-container/20 border border-error/20 rounded-2xl p-6">
            <h3 className="font-bold text-error mb-2 flex items-center gap-2"><Icon name="warning" /> Overloaded Departments</h3>
            <p className="text-sm text-on-error-container">
              {analysis.overloaded.map((d) => `${d.name} (${d.utilization.toFixed(0)}%)`).join(", ")} are running above capacity — consider rebalancing or opening new requisitions.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
