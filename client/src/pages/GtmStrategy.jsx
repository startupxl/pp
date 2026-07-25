import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    funnelStages: [
      { id: "leads", label: "Leads", count: 2450 },
      { id: "mql", label: "MQLs", count: 446 },
      { id: "sql", label: "SQLs", count: 109 },
      { id: "opp", label: "Opportunities", count: 46 },
      { id: "closed", label: "Closed Won", count: 14 },
    ],
    checklist: [
      { id: "c1", label: "Define ICP Parameters", status: "done", progress: 100 },
      { id: "c2", label: "Map Buyer Personas", status: "in_progress", progress: 65 },
      { id: "c3", label: "Sales Script Iteration", status: "pending", progress: 0 },
      { id: "c4", label: "Setup Lead Scoring v2", status: "pending", progress: 0 },
    ],
    icps: [],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeGtm(data) {
  const stages = data.funnelStages || [];
  const withConversion = stages.map((s, i) => {
    const prev = stages[i - 1];
    const conversion = prev && Number(prev.count) > 0 ? (Number(s.count) / Number(prev.count)) * 100 : null;
    return { ...s, conversion };
  });
  const bottleneck = withConversion.slice(1).reduce((worst, s) => (worst === null || (s.conversion !== null && s.conversion < worst.conversion) ? s : worst), null);

  const overallConversion = stages.length && Number(stages[0].count) > 0 ? (Number(stages[stages.length - 1].count) / Number(stages[0].count)) * 100 : 0;
  const checklistDone = (data.checklist || []).filter((c) => c.status === "done").length;
  const checklistTotal = (data.checklist || []).length;

  return { withConversion, bottleneck, overallConversion, checklistDone, checklistTotal };
}

const STATUS_META = {
  done: { icon: "check_circle", label: "Completed" },
  in_progress: { icon: "radio_button_unchecked", label: "In Progress" },
  pending: { icon: "radio_button_unchecked", label: "Pending" },
};

export default function GtmStrategy() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draftIcp, setDraftIcp] = useState({ name: "", industry: "", size: "" });
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
        <div className="p-10 text-on-surface-variant">Loading GTM strategy…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeGtm(data);

  function updateStage(sid, count) {
    updateData({ funnelStages: data.funnelStages.map((s) => (s.id === sid ? { ...s, count: Number(count) } : s)) });
  }

  function cycleStatus(cid) {
    const order = ["pending", "in_progress", "done"];
    updateData({
      checklist: data.checklist.map((c) => {
        if (c.id !== cid) return c;
        const next = order[(order.indexOf(c.status) + 1) % order.length];
        return { ...c, status: next, progress: next === "done" ? 100 : c.progress };
      }),
    });
  }

  function addIcp() {
    if (!draftIcp.name.trim()) return;
    updateData({ icps: [...(data.icps || []), { id: `icp${Date.now()}`, ...draftIcp }] });
    setDraftIcp({ name: "", industry: "", size: "" });
  }

  function removeIcp(iid) {
    updateData({ icps: data.icps.filter((i) => i.id !== iid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">GTM Strategy Workspace</div>
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
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-primary flex items-center gap-2"><Icon name="filter_alt" className="text-secondary" /> Sales Funnel</h3>
              <span className="text-xs text-on-surface-variant">Overall conversion: {analysis.overallConversion.toFixed(1)}%</span>
            </div>
            <div className="flex flex-col gap-2 py-2">
              {analysis.withConversion.map((s, i) => (
                <div key={s.id}>
                  <div
                    className="h-14 flex items-center justify-between px-6 rounded-lg text-white shadow-sm"
                    style={{ marginLeft: `${i * 5}%`, marginRight: `${i * 5}%`, backgroundColor: i === analysis.withConversion.length - 1 ? "#006970" : `rgba(4,22,39,${0.5 + i * 0.1})` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs opacity-50">0{i + 1}</span>
                      <span className="text-sm uppercase tracking-wider font-semibold">{s.label}</span>
                    </div>
                    <input
                      type="number"
                      value={s.count}
                      onChange={(e) => updateStage(s.id, e.target.value)}
                      className="w-20 bg-transparent text-right font-bold outline-none border-b border-white/30"
                    />
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
                <strong>Bottleneck:</strong> {analysis.bottleneck.label} converts worst from the prior stage — focus optimization here first.
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-1 flex items-center gap-2"><Icon name="checklist" className="text-secondary" /> GTM Checklist</h3>
            <p className="text-xs text-on-surface-variant mb-4">{analysis.checklistDone}/{analysis.checklistTotal} complete</p>
            <div className="space-y-3">
              {data.checklist.map((c) => (
                <div
                  key={c.id}
                  onClick={() => cycleStatus(c.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-l-4 cursor-pointer transition-colors ${c.status === "done" ? "bg-surface-container border-secondary" : "hover:bg-surface-container border-outline-variant"}`}
                >
                  <Icon name={STATUS_META[c.status].icon} className={c.status === "done" ? "text-secondary" : "text-outline-variant"} filled={c.status === "done"} />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-primary">{c.label}</h4>
                    <p className="text-xs text-on-surface-variant">{STATUS_META[c.status].label}{c.status === "in_progress" ? ` - ${c.progress}%` : ""}</p>
                    {c.status === "in_progress" && (
                      <div className="w-full bg-outline-variant/30 h-1 rounded-full mt-2">
                        <div className="bg-secondary h-full rounded-full" style={{ width: `${c.progress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-primary flex items-center gap-2"><Icon name="groups" className="text-secondary" /> Ideal Customer Profiles</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {(data.icps || []).map((icp) => (
              <div key={icp.id} className="group relative rounded-xl border border-outline-variant p-5 bg-surface-container-low">
                <button onClick={() => removeIcp(icp.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                <div className="w-10 h-10 bg-secondary-container rounded-lg flex items-center justify-center mb-3">
                  <Icon name="corporate_fare" className="text-secondary" />
                </div>
                <h4 className="font-bold text-primary">{icp.name}</h4>
                <p className="text-xs text-on-surface-variant">{icp.industry} {icp.size && `· ${icp.size}`}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={draftIcp.name} onChange={(e) => setDraftIcp((v) => ({ ...v, name: e.target.value }))} placeholder="Persona name" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <input value={draftIcp.industry} onChange={(e) => setDraftIcp((v) => ({ ...v, industry: e.target.value }))} placeholder="Industry" className="w-40 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <input value={draftIcp.size} onChange={(e) => setDraftIcp((v) => ({ ...v, size: e.target.value }))} placeholder="Company size" className="w-32 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <button onClick={addIcp} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
