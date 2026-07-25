import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    jobStories: [],
    functionalJobs: [],
    emotionalJobs: [],
    socialJobs: [],
    opportunities: [],
  };
}

const JOB_CATEGORIES = [
  { key: "functionalJobs", label: "Functional Jobs", icon: "settings_suggest" },
  { key: "emotionalJobs", label: "Emotional Jobs", icon: "favorite" },
  { key: "socialJobs", label: "Social Jobs", icon: "groups" },
];

// Deterministic heuristic — no external LLM call. Opportunity Score per the ODI formula:
// Opportunity = Importance + max(Importance - Satisfaction, 0), both on a 1-10 scale.
function analyzeJtbd(data) {
  const opportunities = (data.opportunities || []).map((o) => {
    const importance = Number(o.importance) || 0;
    const satisfaction = Number(o.satisfaction) || 0;
    const score = importance + Math.max(importance - satisfaction, 0);
    const underserved = importance - satisfaction >= 3;
    return { ...o, score: Math.round(score * 10) / 10, underserved };
  });
  const ranked = [...opportunities].sort((a, b) => b.score - a.score);
  const topOpportunity = ranked[0] || null;
  const underservedCount = opportunities.filter((o) => o.underserved).length;
  const storiesCount = (data.jobStories || []).length;

  return { opportunities, topOpportunity, underservedCount, storiesCount };
}

export default function JtbdWorkshop() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draftStory, setDraftStory] = useState({ when: "", want: "", so: "" });
  const [drafts, setDrafts] = useState({ functionalJobs: "", emotionalJobs: "", socialJobs: "" });
  const [draftOpp, setDraftOpp] = useState({ name: "", importance: 5, satisfaction: 5 });
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
        <div className="p-10 text-on-surface-variant">Loading JTBD workshop…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeJtbd(data);

  function addStory() {
    if (!draftStory.when.trim() && !draftStory.want.trim() && !draftStory.so.trim()) return;
    updateData({ jobStories: [...(data.jobStories || []), { id: `s${Date.now()}`, ...draftStory }] });
    setDraftStory({ when: "", want: "", so: "" });
  }

  function removeStory(sid) {
    updateData({ jobStories: (data.jobStories || []).filter((s) => s.id !== sid) });
  }

  function addJob(key) {
    const val = drafts[key].trim();
    if (!val) return;
    updateData({ [key]: [...(data[key] || []), val] });
    setDrafts((d) => ({ ...d, [key]: "" }));
  }

  function removeJob(key, idx) {
    updateData({ [key]: (data[key] || []).filter((_, i) => i !== idx) });
  }

  function addOpportunity() {
    if (!draftOpp.name.trim()) return;
    updateData({
      opportunities: [
        ...(data.opportunities || []),
        { id: `o${Date.now()}`, name: draftOpp.name.trim(), importance: Number(draftOpp.importance), satisfaction: Number(draftOpp.satisfaction) },
      ],
    });
    setDraftOpp({ name: "", importance: 5, satisfaction: 5 });
  }

  function removeOpportunity(oid) {
    updateData({ opportunities: (data.opportunities || []).filter((o) => o.id !== oid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Jobs-to-be-Done Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-on-surface-variant max-w-2xl mb-8">
          Define the fundamental goals your customers are trying to achieve, then rank
          opportunities by importance vs. satisfaction.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mb-8">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
            <h3 className="font-bold text-primary mb-4">Job Stories</h3>
            <div className="space-y-3 mb-4">
              {(data.jobStories || []).map((s) => (
                <div key={s.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-outline-variant group relative">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-on-surface-variant">When I…</span>
                    <p className="text-sm">{s.when}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-on-surface-variant">I want to…</span>
                    <p className="text-sm">{s.want}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-on-surface-variant">So that I can…</span>
                    <p className="text-sm">{s.so}</p>
                  </div>
                  <button onClick={() => removeStory(s.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </div>
              ))}
              {(data.jobStories || []).length === 0 && <p className="text-sm text-on-surface-variant italic">No job stories yet.</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low">
              <input value={draftStory.when} onChange={(e) => setDraftStory((v) => ({ ...v, when: e.target.value }))} placeholder="When I…" className="text-sm bg-transparent outline-none border-b border-outline-variant py-1" />
              <input value={draftStory.want} onChange={(e) => setDraftStory((v) => ({ ...v, want: e.target.value }))} placeholder="I want to…" className="text-sm bg-transparent outline-none border-b border-outline-variant py-1" />
              <input value={draftStory.so} onChange={(e) => setDraftStory((v) => ({ ...v, so: e.target.value }))} placeholder="So that I can…" className="text-sm bg-transparent outline-none border-b border-outline-variant py-1" />
            </div>
            <button onClick={addStory} className="mt-3 flex items-center gap-1 text-secondary text-sm font-semibold hover:underline">
              <Icon name="add_circle" className="text-[16px]" /> Add job story
            </button>
          </div>

          <div className="space-y-6">
            {JOB_CATEGORIES.map((cat) => (
              <div key={cat.key} className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={cat.icon} className="text-secondary" />
                  <h4 className="font-semibold text-sm">{cat.label}</h4>
                </div>
                <ul className="space-y-1.5 mb-3">
                  {(data[cat.key] || []).map((j, i) => (
                    <li key={i} className="group flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full shrink-0" />
                      <span className="flex-1">{j}</span>
                      <button onClick={() => removeJob(cat.key, i)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">×</button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    value={drafts[cat.key]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addJob(cat.key)}
                    placeholder="Add…"
                    className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
                  />
                  <button onClick={() => addJob(cat.key)} className="px-2 bg-primary text-white rounded-md"><Icon name="add" className="text-[14px]" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="font-bold text-primary">Opportunity Score Matrix</h3>
              <p className="text-sm text-on-surface-variant">Importance vs. satisfaction — higher scores mean more underserved needs.</p>
            </div>
            {analysis.topOpportunity && (
              <div className="bg-secondary-container/30 border border-secondary/20 rounded-xl px-4 py-3 text-sm">
                <span className="font-bold text-secondary">Top opportunity: </span>
                {analysis.topOpportunity.name} (score {analysis.topOpportunity.score})
              </div>
            )}
          </div>
          <div className="space-y-3 mb-4">
            {analysis.opportunities.map((o) => (
              <div key={o.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 p-3 rounded-lg border border-outline-variant">
                <span className="text-sm font-medium">{o.name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-on-surface-variant">Importance</span>
                  <input type="range" min="1" max="10" value={o.importance} onChange={(e) => updateData({ opportunities: data.opportunities.map((x) => (x.id === o.id ? { ...x, importance: Number(e.target.value) } : x)) })} className="w-24 accent-primary" />
                  <span>{o.importance}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-on-surface-variant">Satisfaction</span>
                  <input type="range" min="1" max="10" value={o.satisfaction} onChange={(e) => updateData({ opportunities: data.opportunities.map((x) => (x.id === o.id ? { ...x, satisfaction: Number(e.target.value) } : x)) })} className="w-24 accent-secondary" />
                  <span>{o.satisfaction}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase text-center ${o.underserved ? "bg-secondary text-white" : "bg-surface-container-highest text-on-surface-variant"}`}>
                  {o.underserved ? "High Opportunity" : "Served Well"}
                </span>
                <button onClick={() => removeOpportunity(o.id)} className="text-on-surface-variant hover:text-error justify-self-end"><Icon name="close" className="text-[16px]" /></button>
              </div>
            ))}
            {analysis.opportunities.length === 0 && <p className="text-sm text-on-surface-variant italic">No opportunities scored yet.</p>}
          </div>
          <div className="flex gap-2 items-center">
            <input value={draftOpp.name} onChange={(e) => setDraftOpp((v) => ({ ...v, name: e.target.value }))} placeholder="Desired outcome…" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
            <button onClick={addOpportunity} className="px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-1 text-sm"><Icon name="add" className="text-[16px]" /> Add</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
