import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FirstPrinciples() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newAssumption, setNewAssumption] = useState("");
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
    });
  }, [id]);

  function scheduleSave(patch) {
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = await api.updateDocument(id, patch);
      setDoc(updated);
      setSaveState("Saved");
    }, 500);
  }

  function updateData(patch) {
    const nextData = { ...doc.data, ...patch };
    setDoc((d) => ({ ...d, data: nextData }));
    scheduleSave({ data: nextData });
  }

  function onTitleBlur() {
    if (title !== doc.title) scheduleSave({ title });
  }

  function addAssumption() {
    if (!newAssumption.trim()) return;
    const assumptions = doc.data?.assumptions || [];
    updateData({
      assumptions: [...assumptions, { id: `a${Date.now()}`, text: newAssumption.trim() }],
    });
    setNewAssumption("");
  }

  function removeAssumption(id) {
    updateData({ assumptions: (doc.data?.assumptions || []).filter((a) => a.id !== id) });
  }

  function challengeAssumption(assumption) {
    const assumptions = (doc.data?.assumptions || []).filter((a) => a.id !== assumption.id);
    const truths = doc.data?.truths || [];
    const newTruth = {
      id: `t${Date.now()}`,
      title: "New fundamental truth",
      description: "",
      derivedFrom: assumption.text,
    };
    updateData({ assumptions, truths: [...truths, newTruth] });
  }

  function synthesizeTruth() {
    const truths = doc.data?.truths || [];
    updateData({
      truths: [
        ...truths,
        { id: `t${Date.now()}`, title: "New fundamental truth", description: "", derivedFrom: null },
      ],
    });
  }

  function updateTruth(id, patch) {
    updateData({
      truths: (doc.data?.truths || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  function removeTruth(id) {
    updateData({ truths: (doc.data?.truths || []).filter((t) => t.id !== id) });
  }

  function updateSolution(patch) {
    updateData({ solution: { ...(doc.data?.solution || {}), ...patch } });
  }

  function exportMap() {
    const lines = [
      `# ${doc.title}`,
      "",
      "## Deconstructed Assumptions",
      ...(doc.data?.assumptions || []).map((a) => `- ${a.text}`),
      "",
      "## Fundamental Truths",
      ...(doc.data?.truths || []).map(
        (t) => `- ${t.title}: ${t.description || "(no detail yet)"}`
      ),
      "",
      "## Emergent Solution",
      doc.data?.solution?.title || "(untitled)",
      doc.data?.solution?.description || "",
    ];
    downloadText(`${(doc.title || "first-principles").replace(/\s+/g, "-").toLowerCase()}.md`, lines.join("\n"));
  }

  function initializeProject() {
    updateSolution({ initializedAt: new Date().toISOString() });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading first principles workshop…</div>
      </Layout>
    );
  }

  const assumptions = doc.data?.assumptions || [];
  const truths = doc.data?.truths || [];
  const solution = doc.data?.solution || {};

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              First Principles Workshop
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="max-w-3xl mb-8">
          <h2 className="text-2xl font-bold text-primary mb-2">Deconstruct the Complex.</h2>
          <p className="text-on-surface-variant">
            First principles thinking is the act of boiling a process down to the fundamental
            parts that you know are true and building up from there.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Deconstructing Assumptions */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="layers_clear" className="text-error" filled />
                <h3 className="text-lg font-bold text-primary">Deconstructing Assumptions</h3>
              </div>
              <span className="px-3 py-1 bg-error-container text-on-error-container rounded-full text-xs font-semibold">
                {assumptions.length} Believed
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {assumptions.map((a, i) => (
                <div key={a.id} className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-outline uppercase tracking-wider">
                      Assumption {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface">"{a.text}"</p>
                  <div className="mt-3 pt-3 border-t border-outline-variant flex gap-4">
                    <button
                      onClick={() => challengeAssumption(a)}
                      className="text-xs font-semibold text-secondary hover:underline"
                    >
                      Challenge
                    </button>
                    <button
                      onClick={() => removeAssumption(a.id)}
                      className="text-xs font-semibold text-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="bg-white/50 p-5 rounded-xl border border-dashed border-outline-variant flex flex-col items-center justify-center gap-2">
                <textarea
                  value={newAssumption}
                  onChange={(e) => setNewAssumption(e.target.value)}
                  placeholder="Add an existing belief you hold about this problem…"
                  className="w-full text-sm outline-none resize-none bg-transparent text-center"
                  rows={2}
                />
                <button
                  onClick={addAssumption}
                  disabled={!newAssumption.trim()}
                  className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-secondary disabled:opacity-40"
                >
                  <Icon name="add_circle" className="text-[18px]" />
                  Add belief
                </button>
              </div>
            </div>
          </div>

          {/* Right: Rebuilding from Truths */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="architecture" className="text-secondary" filled />
                <h3 className="text-lg font-bold text-primary">Rebuilding from Truths</h3>
              </div>
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
                {truths.length} Truths Found
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {truths.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-5 rounded-xl border-l-4 border-l-secondary border-y border-r border-outline-variant shadow-sm"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-secondary">
                      <Icon name="verified" className="text-[18px]" />
                      <span className="text-xs uppercase tracking-wider">Fundamental Truth</span>
                    </div>
                    <button
                      onClick={() => removeTruth(t.id)}
                      className="text-on-surface-variant hover:text-error"
                    >
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </div>
                  <input
                    value={t.title}
                    onChange={(e) => updateTruth(t.id, { title: e.target.value })}
                    className="w-full text-sm font-semibold text-on-surface mb-2 outline-none bg-transparent"
                  />
                  <textarea
                    value={t.description}
                    onChange={(e) => updateTruth(t.id, { description: e.target.value })}
                    placeholder="What's the underlying, provable truth here?"
                    className="w-full text-sm text-on-surface-variant outline-none resize-none bg-transparent"
                    rows={2}
                  />
                  {t.derivedFrom && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-surface-container rounded text-[10px] font-bold text-outline uppercase">
                        derived from: {t.derivedFrom.slice(0, 40)}
                        {t.derivedFrom.length > 40 ? "…" : ""}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={synthesizeTruth}
                className="bg-secondary/5 p-5 rounded-xl border border-dashed border-secondary flex flex-col items-center justify-center gap-2 hover:bg-secondary/10 transition-all"
              >
                <Icon name="verified_user" className="text-secondary" />
                <span className="text-sm font-semibold text-secondary">Synthesize New Truth</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom: Emergent Solution */}
        <section className="mt-8 p-6 bg-white/80 border border-outline-variant rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex gap-6 items-start flex-1">
            <div className="p-4 bg-primary-container rounded-xl shrink-0">
              <Icon name="rocket_launch" className="text-secondary-fixed-dim text-4xl" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-primary mb-2">Emergent Solution</h4>
              <input
                value={solution.title || ""}
                onChange={(e) => updateSolution({ title: e.target.value })}
                placeholder="Name the solution that emerges from your fundamental truths"
                className="w-full font-semibold text-on-surface mb-1 outline-none bg-transparent border-b border-transparent focus:border-outline-variant"
              />
              <textarea
                value={solution.description || ""}
                onChange={(e) => updateSolution({ description: e.target.value })}
                placeholder="Describe it in a sentence or two."
                className="w-full text-sm text-on-surface-variant outline-none resize-none bg-transparent"
                rows={2}
              />
              {solution.initializedAt && (
                <p className="text-xs text-secondary font-semibold mt-1">
                  Initialized {new Date(solution.initializedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={exportMap}
              className="px-5 py-3 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
            >
              Export Map
            </button>
            <button
              onClick={initializeProject}
              className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              Initialize Project
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
