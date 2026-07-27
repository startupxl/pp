import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import FrameworkGuide from "../components/FrameworkGuide";
import { api } from "../api";

function defaultData() {
  return {
    problem: "Onboarding completion rate dropped 18% last month",
    whys: [
      { id: "w1", text: "The setup wizard added a new mandatory integration step" },
      { id: "w2", text: "The integration step requires a technical API key most users don't have handy" },
      { id: "w3", text: "The team assumed all users were technical based on early beta testers" },
      { id: "w4", text: "" },
      { id: "w5", text: "" },
    ],
    rootCause: "",
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeFiveWhys(data) {
  const filled = (data.whys || []).filter((w) => w.text.trim().length > 0);
  const depth = filled.length;
  const complete = depth >= 5 || (data.rootCause || "").trim().length > 0;
  return { depth, complete };
}

export default function FiveWhys() {
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
        <div className="p-10 text-on-surface-variant">Loading 5 Whys workspace…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeFiveWhys(data);

  function updateWhy(wid, text) {
    updateData({ whys: data.whys.map((w) => (w.id === wid ? { ...w, text } : w)) });
  }

  return (
    <Layout>
      <div className="max-w-[1000px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">5 Whys</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onTitleBlur} className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant" />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-sm text-on-surface-variant mb-4">Start with the problem, then ask "why" repeatedly — each answer becomes the subject of the next question — until you reach a root cause you can act on.</p>
        <FrameworkGuide toolKey="five_whys" className="mb-6" />

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6 mb-6">
          <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider">Problem Statement</label>
          <textarea
            value={data.problem}
            onChange={(e) => updateData({ problem: e.target.value })}
            rows={2}
            className="w-full mt-2 text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
          />
        </div>

        <div className="space-y-3 mb-6">
          {data.whys.map((w, i) => (
            <div key={w.id} className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm mt-1">{i + 1}</div>
              <div className="flex-1 bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider">Why #{i + 1}</label>
                <input
                  value={w.text}
                  onChange={(e) => updateWhy(w.id, e.target.value)}
                  placeholder="Why did that happen?"
                  className="w-full mt-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-outline-variant py-1"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-secondary-container/20 rounded-2xl border border-secondary/20 p-6">
          <label className="text-xs font-bold uppercase text-secondary tracking-wider">Root Cause & Fix</label>
          <textarea
            value={data.rootCause}
            onChange={(e) => updateData({ rootCause: e.target.value })}
            rows={2}
            placeholder="What's the underlying root cause, and what will you do about it?"
            className="w-full mt-2 text-sm bg-transparent outline-none resize-none"
          />
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-on-surface-variant">
          <Icon name={analysis.complete ? "check_circle" : "radio_button_unchecked"} className={analysis.complete ? "text-secondary" : ""} />
          {analysis.complete
            ? "You've traced this down to a root cause — capture the fix above."
            : `${analysis.depth} of 5 whys answered — keep going until the answer points to something you can actually change.`}
        </div>
      </div>
    </Layout>
  );
}
