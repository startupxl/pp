import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    stages: [
      { id: "applied", label: "Applied", count: 1240 },
      { id: "screened", label: "Screened", count: 148 },
      { id: "interviewed", label: "Interviewed", count: 41 },
      { id: "offered", label: "Offered", count: 14 },
      { id: "hired", label: "Hired", count: 12 },
    ],
    sources: [
      { id: "s1", name: "LinkedIn Professional", count: 452 },
      { id: "s2", name: "Internal Referrals", count: 310 },
      { id: "s3", name: "Public Job Boards", count: 228 },
    ],
    timeToHireDays: 24,
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeFunnel(data) {
  const stages = data.stages || [];
  const withConversion = stages.map((s, i) => {
    const prev = stages[i - 1];
    const conversion = prev && Number(prev.count) > 0 ? (Number(s.count) / Number(prev.count)) * 100 : null;
    return { ...s, conversion };
  });
  const bottleneck = withConversion.slice(1).reduce((worst, s) => (worst === null || (s.conversion !== null && s.conversion < worst.conversion) ? s : worst), null);
  const overallConversion = stages.length && Number(stages[0].count) > 0 ? (Number(stages[stages.length - 1].count) / Number(stages[0].count)) * 100 : 0;

  const sources = data.sources || [];
  const totalSourced = sources.reduce((s, src) => s + Number(src.count), 0);
  const withPct = sources.map((s) => ({ ...s, pct: totalSourced > 0 ? (Number(s.count) / totalSourced) * 100 : 0 }));
  const topSource = withPct.reduce((max, s) => (max === null || s.count > max.count ? s : max), null);

  return { withConversion, bottleneck, overallConversion, withPct, topSource };
}

export default function RecruitmentFunnel() {
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
        <div className="p-10 text-on-surface-variant">Loading recruitment funnel…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeFunnel(data);

  function updateStage(sid, count) {
    updateData({ stages: data.stages.map((s) => (s.id === sid ? { ...s, count: Number(count) } : s)) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Recruitment Funnel Workshop</div>
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
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="text-xs text-on-surface-variant mb-1">Time to Hire</div>
            <div className="flex items-baseline gap-2">
              <input type="number" value={data.timeToHireDays} onChange={(e) => updateData({ timeToHireDays: Number(e.target.value) })} className="w-16 text-3xl font-bold text-primary bg-transparent outline-none border-b border-transparent focus:border-outline-variant" />
              <span className="text-on-surface-variant">days</span>
            </div>
          </div>
          <div className="lg:col-span-9 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-primary">Candidate Pipeline</h3>
              <span className="text-xs text-on-surface-variant">Overall conversion: {analysis.overallConversion.toFixed(1)}%</span>
            </div>
            <div className="flex flex-col gap-2">
              {analysis.withConversion.map((s, i) => (
                <div key={s.id}>
                  <div className="h-12 flex items-center justify-between px-6 rounded-lg text-white" style={{ marginLeft: `${i * 5}%`, marginRight: `${i * 5}%`, backgroundColor: `rgba(4,22,39,${0.4 + i * 0.12})` }}>
                    <span className="text-sm uppercase tracking-wider font-semibold">{s.label}</span>
                    <input type="number" value={s.count} onChange={(e) => updateStage(s.id, e.target.value)} className="w-20 bg-transparent text-right font-bold outline-none border-b border-white/30" />
                  </div>
                  {i < analysis.withConversion.length - 1 && s.conversion !== null && (
                    <div className="flex justify-center -my-1">
                      <span className={`text-xs px-3 py-0.5 rounded-full border ${analysis.bottleneck?.id === analysis.withConversion[i + 1].id ? "bg-error-container text-on-error-container border-error/30" : "bg-secondary-container text-on-secondary-container border-secondary/20"}`}>
                        {s.conversion.toFixed(1)}% conv.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {analysis.bottleneck && (
              <div className="mt-4 p-3 bg-error-container/20 border border-error/20 rounded-lg text-sm text-on-error-container">
                <strong>Bottleneck:</strong> {analysis.bottleneck.label} converts worst from the prior stage.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
          <h3 className="font-bold text-primary mb-6">Top Talent Sources</h3>
          <div className="space-y-5">
            {analysis.withPct.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="font-medium text-primary">{s.name}</span>
                  <span className="font-bold text-primary">{s.count} ({s.pct.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          {analysis.topSource && (
            <p className="text-xs text-on-surface-variant mt-4"><strong className="text-secondary">{analysis.topSource.name}</strong> is your highest-volume source.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
