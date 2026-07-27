import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import FrameworkGuide from "../components/FrameworkGuide";
import AIAssistPanel from "../components/AIAssistPanel";
import { api } from "../api";

function defaultData() {
  return {
    situations: [
      { id: "s1", text: "Onboarding flow has a known bug pattern with a documented fix", domain: "clear" },
      { id: "s2", text: "Choosing a database migration strategy for a well-understood schema change", domain: "complicated" },
      { id: "s3", text: "Predicting how users will react to a new pricing model", domain: "complex" },
      { id: "s4", text: "Production outage during a live investor demo", domain: "chaotic" },
    ],
  };
}

const DOMAINS = {
  clear: { label: "Clear", color: "bg-secondary", text: "text-secondary", response: "Sense → Categorize → Respond", desc: "Cause and effect are obvious. Apply known best practice." },
  complicated: { label: "Complicated", color: "bg-primary", text: "text-primary", response: "Sense → Analyze → Respond", desc: "Cause and effect require expert analysis. Apply good practice from experts." },
  complex: { label: "Complex", color: "bg-secondary-fixed-dim", text: "text-on-secondary-fixed-variant", response: "Probe → Sense → Respond", desc: "Cause and effect are only clear in hindsight. Run safe-to-fail experiments." },
  chaotic: { label: "Chaotic", color: "bg-error", text: "text-error", response: "Act → Sense → Respond", desc: "No clear cause and effect. Act first to stabilize, then find order." },
};

// Deterministic heuristic — no external LLM call.
function analyzeCynefin(data) {
  const situations = data.situations || [];
  const counts = { clear: 0, complicated: 0, complex: 0, chaotic: 0 };
  situations.forEach((s) => { if (counts[s.domain] !== undefined) counts[s.domain]++; });
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { counts, dominant: dominant && dominant[1] > 0 ? dominant[0] : null };
}

export default function CynefinFramework() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState("");
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
        <div className="p-10 text-on-surface-variant">Loading Cynefin workspace…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeCynefin(data);

  function updateSituation(sid, patch) {
    updateData({ situations: data.situations.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  }

  function removeSituation(sid) {
    updateData({ situations: data.situations.filter((s) => s.id !== sid) });
  }

  function addSituation() {
    if (!draft.trim()) return;
    updateData({ situations: [...data.situations, { id: `s${Date.now()}`, text: draft.trim(), domain: "complicated" }] });
    setDraft("");
  }

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Cynefin Framework</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onTitleBlur} className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant" />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 max-w-2xl">Sort each situation into the domain that best matches how well its cause and effect are understood, then apply the matching response mode.</p>
        <FrameworkGuide toolKey="cynefin_framework" className="mb-6 max-w-2xl" />
        <AIAssistPanel
          toolKey="cynefin_framework"
          frameworkName="Cynefin Framework"
          documentData={data}
          documentTitle={title}
          className="mb-6 max-w-2xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(DOMAINS).map(([key, d]) => (
            <div key={key} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                <h3 className={`font-bold ${d.text}`}>{d.label}</h3>
                <span className="ml-auto text-xs text-on-surface-variant">{analysis.counts[key]} situations</span>
              </div>
              <p className="text-xs text-on-surface-variant mb-2">{d.desc}</p>
              <p className="text-xs font-semibold text-primary">{d.response}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <h3 className="font-bold text-primary mb-4">Situations</h3>
          <div className="space-y-3 mb-4">
            {data.situations.map((s) => (
              <div key={s.id} className="group flex items-center gap-3 p-3 rounded-lg border border-outline-variant">
                <input value={s.text} onChange={(e) => updateSituation(s.id, { text: e.target.value })} className="flex-1 text-sm bg-transparent outline-none" />
                <select value={s.domain} onChange={(e) => updateSituation(s.id, { domain: e.target.value })} className="text-xs border border-outline-variant rounded-lg px-2 py-1.5 outline-none">
                  {Object.entries(DOMAINS).map(([key, d]) => (
                    <option key={key} value={key}>{d.label}</option>
                  ))}
                </select>
                <button onClick={() => removeSituation(s.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe a situation or decision…" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
            <button onClick={addSituation} className="px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-1 text-sm"><Icon name="add" className="text-[16px]" /> Add</button>
          </div>
        </div>

        {analysis.dominant && (
          <div className="mt-6 p-4 rounded-xl bg-secondary-container/20 border border-secondary/20 text-sm">
            Most of your situations sit in the <strong className={DOMAINS[analysis.dominant].text}>{DOMAINS[analysis.dominant].label}</strong> domain — lean on <strong>{DOMAINS[analysis.dominant].response}</strong> as your default operating mode this cycle.
          </div>
        )}
      </div>
    </Layout>
  );
}
