import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import FrameworkGuide from "../components/FrameworkGuide";
import AIAssistPanel from "../components/AIAssistPanel";
import { api } from "../api";

function defaultData() {
  return {
    forces: [
      { id: "rivalry", label: "Competitive Rivalry", intensity: 65, note: "3-4 well-funded direct competitors, feature parity is common." },
      { id: "suppliers", label: "Supplier Power", intensity: 30, note: "Cloud infra and APIs are commoditized; low switching cost." },
      { id: "buyers", label: "Buyer Power", intensity: 55, note: "Enterprise buyers can negotiate hard; SMB buyers are price-sensitive." },
      { id: "substitutes", label: "Threat of Substitution", intensity: 45, note: "Spreadsheets and manual process are the default substitute." },
      { id: "newEntrants", label: "Threat of New Entry", intensity: 40, note: "Moderate technical barrier, low capital barrier." },
    ],
  };
}

function intensityLabel(v) {
  if (v >= 70) return { label: "High Pressure", color: "text-error" };
  if (v >= 40) return { label: "Moderate", color: "text-secondary" };
  return { label: "Low Pressure", color: "text-primary" };
}

// Deterministic heuristic — no external LLM call.
function analyzeForces(data) {
  const forces = data.forces || [];
  const avg = forces.length ? forces.reduce((s, f) => s + Number(f.intensity || 0), 0) / forces.length : 0;
  const attractiveness = Math.round(100 - avg);
  const strongest = [...forces].sort((a, b) => Number(b.intensity) - Number(a.intensity))[0];
  return { avg, attractiveness, strongest };
}

export default function PorterFiveForces() {
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
        <div className="p-10 text-on-surface-variant">Loading Porter's Five Forces…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeForces(data);

  function updateForce(fid, patch) {
    updateData({ forces: data.forces.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });
  }

  return (
    <Layout>
      <div className="max-w-[1100px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Porter's Five Forces</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onTitleBlur} className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant" />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 max-w-2xl">Rate the pressure each competitive force puts on your industry's profitability. Higher pressure across the board means a less attractive market.</p>
        <FrameworkGuide toolKey="porter_five_forces" className="mb-6 max-w-2xl" />
        <AIAssistPanel
          toolKey="porter_five_forces"
          frameworkName="Porter's Five Forces"
          documentData={data}
          documentTitle={title}
          className="mb-6 max-w-2xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Industry Attractiveness</p>
            <p className="text-3xl font-bold text-primary">{analysis.attractiveness}/100</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Avg. Force Intensity</p>
            <p className="text-3xl font-bold text-primary">{Math.round(analysis.avg)}/100</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Strongest Force</p>
            <p className="text-lg font-bold text-error truncate">{analysis.strongest?.label || "—"}</p>
          </div>
        </div>

        <div className="space-y-4">
          {data.forces.map((f) => {
            const meta = intensityLabel(f.intensity);
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-outline-variant shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-primary">{f.label}</h3>
                  <span className={`text-xs font-bold uppercase ${meta.color}`}>{meta.label}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input type="range" min="0" max="100" value={f.intensity} onChange={(e) => updateForce(f.id, { intensity: Number(e.target.value) })} className="flex-1 accent-secondary" />
                  <span className="w-10 text-right text-sm font-bold">{f.intensity}</span>
                </div>
                <textarea
                  value={f.note}
                  onChange={(e) => updateForce(f.id, { note: e.target.value })}
                  rows={2}
                  placeholder="Why is this force at this level?"
                  className="w-full text-xs text-on-surface-variant bg-surface-container-low rounded-lg p-2 outline-none resize-none"
                />
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
