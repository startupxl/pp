import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    hook: "",
    agendaPoints: ["", ""],
    evidenceNotes: "",
    checklist: [
      { label: "Clear Objective", hint: "The end goal is explicitly stated.", done: false },
      { label: "Social Proof Attached", hint: "Testimonials or case studies added.", done: false },
      { label: "Interactive Demo Live", hint: "The 'Show' phase is ready for pilot.", done: false },
    ],
    takeaways: ["", "", ""],
    cta: "",
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeTST(data) {
  const hookFilled = data.hook.trim().length > 0;
  const agendaFilled = data.agendaPoints.filter((p) => p.trim()).length;
  const evidenceFilled = data.evidenceNotes.trim().length > 0;
  const takeawaysFilled = data.takeaways.filter((t) => t.trim()).length;
  const ctaFilled = data.cta.trim().length > 0;
  const checklistDone = data.checklist.filter((c) => c.done).length;

  const introScore = (hookFilled ? 12 : 0) + agendaFilled * 6;
  const bodyScore = (evidenceFilled ? 15 : 0) + (checklistDone / data.checklist.length) * 25;
  const outroScore = takeawaysFilled * 6 + (ctaFilled ? 15 : 0);

  const readiness = Math.max(0, Math.min(100, Math.round(introScore + bodyScore + outroScore)));

  const missing = [];
  if (!hookFilled) missing.push("a one-sentence hook");
  if (agendaFilled < 2) missing.push("both agenda points");
  if (!evidenceFilled) missing.push("supporting evidence");
  if (checklistDone < data.checklist.length) missing.push(`${data.checklist.length - checklistDone} verification item(s)`);
  if (takeawaysFilled < 3) missing.push(`${3 - takeawaysFilled} key takeaway(s)`);
  if (!ctaFilled) missing.push("a call to action");

  let phase = "Intro";
  if (readiness >= 70) phase = "Ready to deliver";
  else if (evidenceFilled || checklistDone > 0) phase = "Body";
  else if (hookFilled) phase = "Body";
  if (takeawaysFilled > 0 || ctaFilled) phase = readiness >= 70 ? "Ready to deliver" : "Outro";

  return { readiness, missing, phase, checklistDone };
}

export default function TellShowTell() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      const merged = { ...defaultData(), ...(d.data || {}) };
      if (!Array.isArray(merged.agendaPoints) || merged.agendaPoints.length < 2) merged.agendaPoints = ["", ""];
      if (!Array.isArray(merged.checklist) || merged.checklist.length === 0) merged.checklist = defaultData().checklist;
      if (!Array.isArray(merged.takeaways) || merged.takeaways.length === 0) merged.takeaways = ["", "", ""];
      setDoc({ ...d, data: merged });
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

  function updateField(key, value) {
    setDoc((d) => {
      const data = { ...d.data, [key]: value };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function updateAgenda(idx, value) {
    setDoc((d) => {
      const agendaPoints = [...d.data.agendaPoints];
      agendaPoints[idx] = value;
      const data = { ...d.data, agendaPoints };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function toggleChecklist(idx) {
    setDoc((d) => {
      const checklist = d.data.checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c));
      const data = { ...d.data, checklist };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function updateTakeaway(idx, value) {
    setDoc((d) => {
      const takeaways = [...d.data.takeaways];
      takeaways[idx] = value;
      const data = { ...d.data, takeaways };
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
        <div className="p-10 text-on-surface-variant">Loading Tell → Show → Tell workshop…</div>
      </Layout>
    );
  }

  const analysis = analyzeTST(doc.data);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Tell → Show → Tell Workshop</div>
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
          Structure any presentation with the classic three-part narrative: tell them what you'll
          tell them, show them the proof, then tell them what you told them.
        </p>

        {/* Phase progress */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {["Intro", "Body", "Outro"].map((phaseName, i) => {
            const active = analysis.phase === phaseName || (analysis.phase === "Ready to deliver" && phaseName === "Outro");
            return (
              <div
                key={phaseName}
                className={`p-5 rounded-xl border transition-all ${
                  active ? "border-l-4 border-secondary bg-surface-container-low border-outline-variant/0" : "border-outline-variant opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <Icon name={["chat_bubble", "visibility", "assignment_turned_in"][i]} className="text-[18px]" />
                  <span className="text-xs font-semibold">Phase 0{i + 1}</span>
                </div>
                <h3 className="font-bold text-primary text-sm">{["The Intro", "The Body", "The Outro"][i]}</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {["Tell them what you are going to tell them.", "Show them. Prove it with evidence.", "Tell them what you told them."][i]}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* Intro */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <h4 className="text-secondary text-xs font-semibold uppercase tracking-wider mb-2">01. Setup the Hook</h4>
              <h3 className="font-bold text-primary text-lg mb-4">Define the Core Narrative</h3>
              <label className="block mb-4">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">The one-sentence hook</span>
                <textarea
                  value={doc.data.hook}
                  onChange={(e) => updateField("hook", e.target.value)}
                  rows={3}
                  placeholder="What is the singular most compelling reason they should listen?"
                  className="w-full mt-1 text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                {doc.data.agendaPoints.map((p, i) => (
                  <label key={i} className="block">
                    <span className="text-xs font-semibold uppercase text-secondary">Agenda Point {i + 1}</span>
                    <input
                      value={p}
                      onChange={(e) => updateAgenda(i, e.target.value)}
                      placeholder={i === 0 ? "Initial context…" : "The key friction…"}
                      className="w-full mt-1 text-sm border-b border-outline-variant bg-transparent outline-none focus:border-secondary py-1"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="image" className="text-secondary" />
                <h3 className="font-bold text-primary">Supporting Evidence &amp; Visuals</h3>
              </div>
              <textarea
                value={doc.data.evidenceNotes}
                onChange={(e) => updateField("evidenceNotes", e.target.value)}
                rows={4}
                placeholder="Describe the data, demo, or case study that proves your hook…"
                className="w-full text-sm border border-outline-variant rounded-lg p-3 outline-none focus:border-secondary resize-none"
              />
            </div>

            {/* Outro */}
            <div className="bg-secondary rounded-xl p-6 text-white">
              <h3 className="font-bold mb-2">Final Call to Action</h3>
              <p className="text-sm opacity-90 mb-3">Tell them exactly what step to take next. No ambiguity.</p>
              <input
                value={doc.data.cta}
                onChange={(e) => updateField("cta", e.target.value)}
                placeholder="e.g. Approve the pilot budget by Friday"
                className="w-full text-sm rounded-lg p-3 text-on-surface outline-none"
              />
            </div>
          </div>

          <aside className="flex flex-col gap-4 h-fit sticky top-24">
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Readiness Score</p>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="transparent" stroke="#e5eeff" strokeWidth="8" />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      fill="transparent"
                      stroke="#006970"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 - (analysis.readiness / 100) * (2 * Math.PI * 48)}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.5s" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{analysis.readiness}%</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant text-center">
                {analysis.missing.length === 0
                  ? "Fully structured — ready to deliver."
                  : `Still missing: ${analysis.missing.join(", ")}.`}
              </p>
            </div>

            <div className="bg-primary-container p-6 rounded-xl text-on-primary">
              <h4 className="text-secondary-fixed text-xs font-semibold uppercase mb-4">Verification Check</h4>
              <ul className="space-y-3">
                {doc.data.checklist.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 cursor-pointer" onClick={() => toggleChecklist(i)}>
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${c.done ? "border-secondary text-secondary" : "border-outline-variant"}`}>
                      {c.done && <Icon name="check" className="text-[16px]" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${c.done ? "" : "text-on-primary-container"}`}>{c.label}</p>
                      <p className="text-on-primary-container/70 text-xs">{c.hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <h4 className="text-secondary text-xs font-semibold uppercase mb-4">Key Takeaways</h4>
              <div className="space-y-3">
                {doc.data.takeaways.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                    <input
                      value={t}
                      onChange={(e) => updateTakeaway(i, e.target.value)}
                      placeholder="What should stick after this presentation?"
                      className="w-full text-sm border-b border-outline-variant/40 bg-transparent outline-none focus:border-secondary py-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
