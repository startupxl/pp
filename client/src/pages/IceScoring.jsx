import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    initiatives: [
      { id: "i1", name: "Refactor API Infrastructure", detail: "Core backend stability and performance", impact: 8, confidence: 9, ease: 5 },
      { id: "i2", name: "New Landing Page Hero", detail: "Optimize conversion rates for Q4", impact: 9, confidence: 7, ease: 8 },
      { id: "i3", name: "LinkedIn Content Automation", detail: "Scale social media presence via API", impact: 6, confidence: 6, ease: 9 },
      { id: "i4", name: "Enterprise Security Audit", detail: "Required for SOC2 compliance path", impact: 10, confidence: 10, ease: 2 },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeIce(data) {
  const scored = (data.initiatives || []).map((i) => ({
    ...i,
    score: Number(i.impact) * Number(i.confidence) * Number(i.ease),
  }));
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const avgScore = scored.length ? scored.reduce((s, i) => s + i.score, 0) / scored.length : 0;
  const maxScore = sorted[0]?.score || 1;
  return { scored, sorted, avgScore, maxScore };
}

export default function IceScoring() {
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
        <div className="p-10 text-on-surface-variant">Loading ICE scoring workshop…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeIce(data);

  function updateInitiative(iid, patch) {
    updateData({ initiatives: data.initiatives.map((i) => (i.id === iid ? { ...i, ...patch } : i)) });
  }

  function addInitiative() {
    updateData({ initiatives: [...data.initiatives, { id: `i${Date.now()}`, name: "New initiative", detail: "", impact: 5, confidence: 5, ease: 5 }] });
  }

  function removeInitiative(iid) {
    updateData({ initiatives: data.initiatives.filter((i) => i.id !== iid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">ICE Scoring Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-on-surface-variant max-w-2xl mb-8">Score initiatives on Impact, Confidence, and Ease to find the most impactful path forward.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <p className="text-xs uppercase text-on-surface-variant mb-2">Total Initiatives</p>
            <span className="text-3xl font-bold text-primary">{analysis.scored.length}</span>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <p className="text-xs uppercase text-on-surface-variant mb-2">Avg. ICE Score</p>
            <span className="text-3xl font-bold text-primary">{analysis.avgScore.toFixed(1)}</span>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <p className="text-xs uppercase text-on-surface-variant mb-2">Highest Potential</p>
            <span className="text-3xl font-bold text-secondary">{analysis.sorted[0]?.score ?? "—"}</span>
            <p className="text-xs text-on-surface-variant mt-1">{analysis.sorted[0]?.name}</p>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm mb-8">
          <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h3 className="font-bold text-primary">Prioritization Framework</h3>
              <p className="text-sm text-on-surface-variant">Score your initiatives to find the most impactful path forward.</p>
            </div>
            <button onClick={addInitiative} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2"><Icon name="add" className="text-[18px]" /> Add Initiative</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50 text-xs uppercase text-on-surface-variant">
                  <th className="px-8 py-4">Initiative</th>
                  <th className="px-4 py-4 text-center">Impact</th>
                  <th className="px-4 py-4 text-center">Confidence</th>
                  <th className="px-4 py-4 text-center">Ease</th>
                  <th className="px-8 py-4 text-right">ICE Score</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {analysis.scored.map((i) => (
                  <tr key={i.id} className="group hover:bg-surface-container-low transition-colors">
                    <td className="px-8 py-5">
                      <input value={i.name} onChange={(e) => updateInitiative(i.id, { name: e.target.value })} className="font-medium text-primary bg-transparent outline-none w-full" />
                      <input value={i.detail} onChange={(e) => updateInitiative(i.id, { detail: e.target.value })} placeholder="Detail" className="text-xs text-on-surface-variant bg-transparent outline-none w-full" />
                    </td>
                    {["impact", "confidence", "ease"].map((k) => (
                      <td key={k} className="px-4 py-5 text-center">
                        <input type="number" min="1" max="10" value={i[k]} onChange={(e) => updateInitiative(i.id, { [k]: Number(e.target.value) })} className="w-16 text-center py-1 rounded bg-surface-container-low outline-none focus:ring-2 focus:ring-secondary/30" />
                      </td>
                    ))}
                    <td className="px-8 py-5 text-right font-bold text-secondary text-lg">{i.score}</td>
                    <td className="px-4 py-5">
                      <button onClick={() => removeInitiative(i.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
          <h3 className="font-bold text-primary mb-1">Top Ranked Initiatives</h3>
          <p className="text-sm text-on-surface-variant mb-6">Visual distribution of ICE scores.</p>
          <div className="space-y-4">
            {analysis.sorted.map((i) => (
              <div key={i.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-primary font-medium">{i.name}</span>
                  <span className="font-bold text-secondary">{i.score}</span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${(i.score / analysis.maxScore) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
