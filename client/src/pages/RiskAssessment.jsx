import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    risks: [
      { id: "r1", description: "Cloud Infrastructure Latency", detail: "Scaling failure during Series B launch period.", likelihood: 4, impact: 5, mitigation: 85, owner: "David Chen", category: "Technical" },
      { id: "r2", description: "Key Customer Churn", detail: "Largest account renegotiating contract terms.", likelihood: 3, impact: 4, mitigation: 40, owner: "Sales Lead", category: "Commercial" },
    ],
  };
}

function severityFor(score) {
  if (score >= 20) return { label: "Critical", color: "text-error", bg: "bg-error" };
  if (score >= 12) return { label: "High", color: "text-error", bg: "bg-[#e67e22]" };
  if (score >= 6) return { label: "Medium", color: "text-secondary", bg: "bg-secondary" };
  return { label: "Low", color: "text-on-surface-variant", bg: "bg-secondary-fixed-dim" };
}

// Deterministic heuristic — no external LLM call.
function analyzeRisk(data) {
  const risks = (data.risks || []).map((r) => {
    const score = Number(r.likelihood) * Number(r.impact);
    return { ...r, score, severity: severityFor(score) };
  });
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  const topRisk = sorted[0] || null;
  const avgMitigation = risks.length ? risks.reduce((s, r) => s + Number(r.mitigation || 0), 0) / risks.length : 0;

  const byCategory = {};
  risks.forEach((r) => {
    const cat = r.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + r.score;
  });
  const totalScore = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const concentration = topCategory && totalScore > 0 ? Math.round((topCategory[1] / totalScore) * 100) : 0;

  const criticalCount = risks.filter((r) => r.severity.label === "Critical").length;

  return { risks, topRisk, avgMitigation, topCategory: topCategory?.[0], concentration, criticalCount };
}

export default function RiskAssessment() {
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
        <div className="p-10 text-on-surface-variant">Loading risk workspace…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeRisk(data);

  function updateRisk(rid, patch) {
    updateData({ risks: data.risks.map((r) => (r.id === rid ? { ...r, ...patch } : r)) });
  }

  function addRisk() {
    updateData({ risks: [...data.risks, { id: `r${Date.now()}`, description: "New risk", detail: "", likelihood: 3, impact: 3, mitigation: 0, owner: "", category: "Uncategorized" }] });
  }

  function removeRisk(rid) {
    updateData({ risks: data.risks.filter((r) => r.id !== rid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Strategic Risk Workspace</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-on-surface-variant max-w-2xl mb-8">Quantify uncertainty across likelihood and impact to prioritize mitigation.</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-6">Probability vs. Impact Heatmap</h3>
            <div className="relative w-full aspect-[16/10] bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Likelihood</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Impact</div>
              <div className="absolute inset-0 ml-8 mb-8">
                {analysis.risks.map((r) => (
                  <div
                    key={r.id}
                    title={`${r.description} (${r.score})`}
                    className={`absolute w-4 h-4 rounded-full ring-4 ring-white shadow-lg ${r.severity.bg}`}
                    style={{
                      left: `${(Number(r.impact) / 5) * 90}%`,
                      bottom: `${(Number(r.likelihood) / 5) * 90}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-primary text-white rounded-2xl p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xs uppercase text-on-primary-container">Critical Risks</h3>
                <Icon name="warning" className="text-secondary-fixed" />
              </div>
              <div className="text-4xl font-bold">{analysis.criticalCount}</div>
              <p className="text-sm mt-2 text-on-primary-container">{analysis.risks.length} total logged</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm flex-1">
              <h3 className="text-xs uppercase text-on-surface-variant mb-2">Top Category</h3>
              <div className="font-bold text-primary mb-3">{analysis.topCategory || "—"}</div>
              <div className="p-3 bg-surface-container-low rounded-lg">
                <div className="flex justify-between text-xs mb-1">
                  <span>Concentration</span>
                  <span className="font-bold">{analysis.concentration}/100</span>
                </div>
                <div className="h-1.5 bg-outline-variant rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${analysis.concentration}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-primary">Risk Register &amp; Mitigation Plans</h3>
            <button onClick={addRisk} className="text-secondary text-sm font-semibold flex items-center gap-1 hover:underline"><Icon name="add_circle" className="text-[16px]" /> Log risk</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Risk</th>
                  <th className="px-4 py-3 text-center">Likelihood</th>
                  <th className="px-4 py-3 text-center">Impact</th>
                  <th className="px-4 py-3">Mitigation</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {analysis.risks.map((r) => (
                  <tr key={r.id} className="group hover:bg-surface-container-lowest">
                    <td className="px-6 py-4">
                      <input value={r.description} onChange={(e) => updateRisk(r.id, { description: e.target.value })} className="font-bold text-primary bg-transparent outline-none w-full mb-1" />
                      <input value={r.category} onChange={(e) => updateRisk(r.id, { category: e.target.value })} placeholder="Category" className="text-xs text-on-surface-variant bg-transparent outline-none w-full" />
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.severity.color}`}>{r.severity.label} ({r.score})</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="number" min="1" max="5" value={r.likelihood} onChange={(e) => updateRisk(r.id, { likelihood: Number(e.target.value) })} className="w-12 text-center bg-surface-container-low rounded outline-none" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="number" min="1" max="5" value={r.impact} onChange={(e) => updateRisk(r.id, { impact: Number(e.target.value) })} className="w-12 text-center bg-surface-container-low rounded outline-none" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="100" value={r.mitigation} onChange={(e) => updateRisk(r.id, { mitigation: Number(e.target.value) })} className="w-24 accent-secondary" />
                        <span className="text-xs font-bold text-secondary">{r.mitigation}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input value={r.owner} onChange={(e) => updateRisk(r.id, { owner: e.target.value })} className="text-sm bg-transparent outline-none w-24" />
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => removeRisk(r.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
