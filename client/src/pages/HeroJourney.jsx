import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import FrameworkGuide from "../components/FrameworkGuide";
import AIAssistPanel from "../components/AIAssistPanel";
import { api } from "../api";

function defaultData() {
  return {
    stages: [
      { id: "ordinary_world", label: "Ordinary World", prompt: "What did life/the market look like before the problem?", text: "" },
      { id: "call_to_adventure", label: "Call to Adventure", prompt: "What triggered the need for change?", text: "" },
      { id: "refusal", label: "Refusal of the Call", prompt: "Why didn't an obvious solution already exist?", text: "" },
      { id: "mentor", label: "Meeting the Mentor", prompt: "What insight, advisor, or data unlocked the path forward?", text: "" },
      { id: "threshold", label: "Crossing the Threshold", prompt: "What was the first bold move / launch?", text: "" },
      { id: "trials", label: "Tests, Allies, Enemies", prompt: "What obstacles and competitors did you face?", text: "" },
      { id: "ordeal", label: "The Ordeal", prompt: "What was the make-or-break moment?", text: "" },
      { id: "reward", label: "Reward", prompt: "What did you win or learn from the ordeal?", text: "" },
      { id: "return", label: "The Return / New World", prompt: "What does the world look like now, and what's next?", text: "" },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeJourney(data) {
  const stages = data.stages || [];
  const filled = stages.filter((s) => s.text.trim().length > 0);
  const pct = stages.length ? Math.round((filled.length / stages.length) * 100) : 0;
  const nextGap = stages.find((s) => s.text.trim().length === 0);
  return { pct, filledCount: filled.length, total: stages.length, nextGap };
}

export default function HeroJourney() {
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
        <div className="p-10 text-on-surface-variant">Loading Hero's Journey workspace…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeJourney(data);

  function updateStage(sid, text) {
    updateData({ stages: data.stages.map((s) => (s.id === sid ? { ...s, text } : s)) });
  }

  return (
    <Layout>
      <div className="max-w-[1000px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">The Hero's Journey</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onTitleBlur} className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant" />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 max-w-2xl">Frame your company or product story as a nine-stage narrative arc — useful for pitch decks, keynotes, and investor updates.</p>
        <FrameworkGuide toolKey="hero_journey" className="mb-6 max-w-2xl" />
        <AIAssistPanel
          toolKey="hero_journey"
          frameworkName="The Hero's Journey"
          documentData={data}
          documentTitle={title}
          className="mb-6 max-w-2xl"
        />

        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-6 flex items-center gap-4">
          <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
            <div className="h-full bg-secondary transition-all" style={{ width: `${analysis.pct}%` }} />
          </div>
          <span className="text-sm font-bold text-primary w-24 text-right">{analysis.filledCount}/{analysis.total} stages</span>
        </div>

        <div className="space-y-4">
          {data.stages.map((s, i) => (
            <div key={s.id} className="bg-white rounded-2xl border border-outline-variant shadow-sm p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">{i + 1}</div>
                <h3 className="font-bold text-primary">{s.label}</h3>
              </div>
              <p className="text-xs text-on-surface-variant mb-2 ml-10">{s.prompt}</p>
              <textarea
                value={s.text}
                onChange={(e) => updateStage(s.id, e.target.value)}
                rows={2}
                className="w-full ml-10 max-w-[calc(100%-2.5rem)] text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
              />
            </div>
          ))}
        </div>

        {analysis.nextGap && (
          <div className="mt-6 p-4 rounded-xl bg-secondary-container/20 border border-secondary/20 text-sm flex items-center gap-2">
            <Icon name="lightbulb" className="text-secondary" />
            Next up: fill in <strong>{analysis.nextGap.label}</strong> to keep the arc moving.
          </div>
        )}
      </div>
    </Layout>
  );
}
