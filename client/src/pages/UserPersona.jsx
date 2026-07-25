import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    name: "",
    role: "",
    ageRange: "",
    location: "",
    keyConcern: "",
    motivations: [],
    dayInLife: [],
    painPoints: [],
    quote: "",
  };
}

// Deterministic heuristic — no external LLM call.
function analyzePersona(data) {
  const fields = [data.name, data.role, data.keyConcern, data.quote];
  const filled = fields.filter((f) => (f || "").trim().length > 0).length;
  const completeness = Math.round(
    (filled / fields.length) * 40 +
      Math.min(20, (data.motivations || []).length * 7) +
      Math.min(20, (data.dayInLife || []).length * 5) +
      Math.min(20, (data.painPoints || []).length * 7)
  );

  const strategies = (data.painPoints || []).map((p) => {
    const lower = p.toLowerCase();
    let angle = "Remove this friction directly in the core workflow";
    if (lower.includes("time") || lower.includes("overwhelm") || lower.includes("busy")) angle = "Automate or batch this so it costs them zero extra time";
    else if (lower.includes("cost") || lower.includes("budget") || lower.includes("expensive")) angle = "Reframe the value equation with a clear, fast ROI story";
    else if (lower.includes("trust") || lower.includes("risk") || lower.includes("fear") || lower.includes("worried") || lower.includes("anxious")) angle = "De-risk with proof — case studies, guarantees, or a low-commitment trial";
    else if (lower.includes("complex") || lower.includes("confus") || lower.includes("overload")) angle = "Simplify the surface area; hide advanced options behind progressive disclosure";
    return { pain: p, angle };
  });

  return { completeness: Math.min(100, completeness), strategies };
}

export default function UserPersona() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draftMotivation, setDraftMotivation] = useState({ title: "", description: "" });
  const [draftTimeline, setDraftTimeline] = useState({ time: "", activity: "" });
  const [draftPain, setDraftPain] = useState("");
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
        <div className="p-10 text-on-surface-variant">Loading persona workshop…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzePersona(data);

  function addMotivation() {
    if (!draftMotivation.title.trim()) return;
    updateData({ motivations: [...(data.motivations || []), { id: `m${Date.now()}`, ...draftMotivation }] });
    setDraftMotivation({ title: "", description: "" });
  }
  function removeMotivation(mid) {
    updateData({ motivations: data.motivations.filter((m) => m.id !== mid) });
  }
  function addTimeline() {
    if (!draftTimeline.time.trim() && !draftTimeline.activity.trim()) return;
    updateData({ dayInLife: [...(data.dayInLife || []), { id: `t${Date.now()}`, ...draftTimeline }] });
    setDraftTimeline({ time: "", activity: "" });
  }
  function removeTimeline(tid) {
    updateData({ dayInLife: data.dayInLife.filter((t) => t.id !== tid) });
  }
  function addPain() {
    if (!draftPain.trim()) return;
    updateData({ painPoints: [...(data.painPoints || []), draftPain.trim()] });
    setDraftPain("");
  }
  function removePain(idx) {
    updateData({ painPoints: data.painPoints.filter((_, i) => i !== idx) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">User Persona Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col items-center text-center gap-3">
              <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center">
                <Icon name="person" className="text-secondary text-[40px]" />
              </div>
              <input
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                placeholder="Persona name"
                className="text-lg font-bold text-primary text-center bg-transparent outline-none border-b border-transparent focus:border-outline-variant w-full"
              />
              <input
                value={data.role}
                onChange={(e) => updateData({ role: e.target.value })}
                placeholder="Role / archetype"
                className="text-sm text-secondary text-center bg-transparent outline-none border-b border-transparent focus:border-outline-variant w-full"
              />
              <div className="w-full space-y-2 pt-4 border-t border-outline-variant/40 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Age</span>
                  <input value={data.ageRange} onChange={(e) => updateData({ ageRange: e.target.value })} placeholder="32–38" className="text-right bg-transparent outline-none w-24" />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Location</span>
                  <input value={data.location} onChange={(e) => updateData({ location: e.target.value })} placeholder="Remote" className="text-right bg-transparent outline-none w-24" />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Key Concern</span>
                  <input value={data.keyConcern} onChange={(e) => updateData({ keyConcern: e.target.value })} placeholder="Operational friction" className="text-right bg-transparent outline-none w-32" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Core Motivations</h4>
              <div className="space-y-3 mb-3">
                {(data.motivations || []).map((m) => (
                  <div key={m.id} className="group flex gap-3">
                    <div className="w-8 h-8 shrink-0 bg-secondary-container rounded-full flex items-center justify-center text-secondary">
                      <Icon name="bolt" className="text-[16px]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-on-surface-variant">{m.description}</p>
                    </div>
                    <button onClick={() => removeMotivation(m.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[14px]" /></button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <input value={draftMotivation.title} onChange={(e) => setDraftMotivation((v) => ({ ...v, title: e.target.value }))} placeholder="Motivation title" className="w-full text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <input value={draftMotivation.description} onChange={(e) => setDraftMotivation((v) => ({ ...v, description: e.target.value }))} placeholder="Description" className="w-full text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <button onClick={addMotivation} className="text-xs text-secondary font-semibold hover:underline">+ Add motivation</button>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">A Day in the Life</h4>
              <div className="space-y-5 relative border-l-2 border-secondary-container ml-3 pl-8 mb-4">
                {(data.dayInLife || []).map((t) => (
                  <div key={t.id} className="group relative">
                    <span className="absolute -left-[41px] top-1 w-4 h-4 bg-secondary-fixed-dim rounded-full ring-4 ring-white" />
                    <input value={t.time} onChange={(e) => updateData({ dayInLife: data.dayInLife.map((x) => (x.id === t.id ? { ...x, time: e.target.value } : x)) })} placeholder="06:00 AM" className="text-xs font-bold text-secondary bg-transparent outline-none" />
                    <textarea
                      value={t.activity}
                      onChange={(e) => updateData({ dayInLife: data.dayInLife.map((x) => (x.id === t.id ? { ...x, activity: e.target.value } : x)) })}
                      rows={2}
                      placeholder="What are they doing at this time?"
                      className="w-full text-sm mt-1 border border-outline-variant rounded-md p-2 outline-none focus:border-secondary resize-none"
                    />
                    <button onClick={() => removeTimeline(t.id)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[14px]" /></button>
                  </div>
                ))}
                {(data.dayInLife || []).length === 0 && <p className="text-sm text-on-surface-variant italic">No timeline entries yet.</p>}
              </div>
              <div className="flex gap-2">
                <input value={draftTimeline.time} onChange={(e) => setDraftTimeline((v) => ({ ...v, time: e.target.value }))} placeholder="Time" className="w-28 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <input value={draftTimeline.activity} onChange={(e) => setDraftTimeline((v) => ({ ...v, activity: e.target.value }))} placeholder="Activity" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
                <button onClick={addTimeline} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[14px]" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-widest text-error mb-4">Pain Points / Frustrations</h4>
                <ul className="space-y-2 mb-3">
                  {(data.painPoints || []).map((p, i) => (
                    <li key={i} className="group flex items-start gap-2 text-sm text-on-surface-variant">
                      <Icon name="error_outline" className="text-error text-[16px] mt-0.5" />
                      <span className="flex-1">{p}</span>
                      <button onClick={() => removePain(i)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">×</button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input value={draftPain} onChange={(e) => setDraftPain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPain()} placeholder="Add a pain point…" className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-error" />
                  <button onClick={addPain} className="px-3 bg-error text-white rounded-md"><Icon name="add" className="text-[14px]" /></button>
                </div>
              </div>
              <div className="bg-primary rounded-xl p-6 text-white flex flex-col justify-center">
                <Icon name="format_quote" className="text-secondary-fixed opacity-50 text-[28px] mb-3" />
                <textarea
                  value={data.quote}
                  onChange={(e) => updateData({ quote: e.target.value })}
                  rows={3}
                  placeholder="A representative quote from this persona…"
                  className="bg-transparent italic text-lg outline-none resize-none placeholder:text-white/40"
                />
                <p className="mt-3 text-secondary-fixed text-sm">— {data.name || "Persona"}</p>
              </div>
            </div>

            <div className="bg-secondary-container/20 border border-secondary/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="auto_awesome" className="text-secondary" filled />
                <h4 className="font-bold text-primary">How to Win This Persona</h4>
                <span className="ml-auto text-xs text-on-surface-variant">Completeness: {analysis.completeness}%</span>
              </div>
              {analysis.strategies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.strategies.map((s, i) => (
                    <div key={i} className="bg-white/60 p-3 rounded-lg border border-secondary/10">
                      <p className="text-xs font-semibold text-secondary mb-1">{s.pain}</p>
                      <p className="text-xs text-on-surface-variant">{s.angle}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant italic">Add pain points to generate strategy suggestions.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
