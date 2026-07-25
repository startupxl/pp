import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function statusFor(avgProgress) {
  if (avgProgress >= 70) return { label: "On Track", classes: "bg-green-100 text-green-700 border-green-200" };
  if (avgProgress >= 40) return { label: "At Risk", classes: "bg-secondary-container/60 text-on-secondary-container border-secondary/20" };
  return { label: "Off Track", classes: "bg-error-container text-error border-error/20" };
}

function analyzeKeyResults(keyResults) {
  if (keyResults.length === 0) {
    return { avgProgress: 0, insight: "Add key results to track progress against this objective." };
  }
  const avgProgress = Math.round(
    keyResults.reduce((sum, kr) => sum + Number(kr.progress || 0), 0) / keyResults.length
  );
  const weakest = [...keyResults].sort(
    (a, b) => Number(a.progress || 0) * Number(a.confidence || 1) - Number(b.progress || 0) * Number(b.confidence || 1)
  )[0];
  let insight;
  if (Number(weakest.progress || 0) < 50 || Number(weakest.confidence || 1) < 0.5) {
    insight = `"${weakest.title || "This key result"}" is trailing at ${weakest.progress || 0}% with confidence ${weakest.confidence ?? "—"}. Consider reallocating effort from stronger key results to unblock it.`;
  } else {
    insight = "All key results are tracking well toward target — keep the current cadence of check-ins.";
  }
  return { avgProgress, insight, weakest };
}

export default function Okr() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
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

  const objective = doc?.data?.objective || "";
  const keyResults = doc?.data?.keyResults || [];

  function updateKr(krId, patch) {
    updateData({ keyResults: keyResults.map((kr) => (kr.id === krId ? { ...kr, ...patch } : kr)) });
  }

  function addKr() {
    updateData({
      keyResults: [
        ...keyResults,
        {
          id: `kr${Date.now()}`,
          title: "",
          owner: "",
          targetDate: "",
          progress: 0,
          confidence: 0.7,
          tags: [],
        },
      ],
    });
  }

  function removeKr(krId) {
    updateData({ keyResults: keyResults.filter((kr) => kr.id !== krId) });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading OKR workshop…</div>
      </Layout>
    );
  }

  const analysis = analyzeKeyResults(keyResults);
  const status = statusFor(analysis.avgProgress);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">OKR Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="flex flex-col gap-6">
            {/* Objective */}
            <div className="bg-white rounded-2xl p-8 border border-outline-variant shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
                    Objective
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${status.classes}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {status.label}
                </div>
              </div>
              <textarea
                value={objective}
                onChange={(e) => updateData({ objective: e.target.value })}
                placeholder="What is your primary focus for this period?"
                rows={2}
                className="w-full text-2xl font-bold border-none outline-none bg-transparent resize-none placeholder:text-outline-variant/50"
              />
            </div>

            {/* Key Results */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-primary">Key Results</h2>
              <button
                onClick={addKr}
                className="flex items-center gap-2 text-secondary text-sm font-semibold hover:underline"
              >
                <Icon name="add_circle" className="text-[18px]" />
                Add Key Result
              </button>
            </div>

            <div className="space-y-4">
              {keyResults.map((kr) => (
                <div
                  key={kr.id}
                  className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm hover:border-secondary transition-colors group"
                >
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <input
                      value={kr.title}
                      onChange={(e) => updateKr(kr.id, { title: e.target.value })}
                      placeholder="Key result title..."
                      className="flex-1 font-semibold text-lg bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
                    />
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-2xl font-bold text-primary">{kr.progress || 0}%</span>
                      <button
                        onClick={() => removeKr(kr.id)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 mb-4">
                    <input
                      value={kr.owner}
                      onChange={(e) => updateKr(kr.id, { owner: e.target.value })}
                      placeholder="Owner"
                      className="text-sm border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary flex-1"
                    />
                    <input
                      value={kr.targetDate}
                      onChange={(e) => updateKr(kr.id, { targetDate: e.target.value })}
                      placeholder="Target date"
                      className="text-sm border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary flex-1"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-on-surface-variant">Confidence</span>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={kr.confidence}
                        onChange={(e) => updateKr(kr.id, { confidence: Number(e.target.value) })}
                        className="w-16 text-sm border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={kr.progress || 0}
                    onChange={(e) => updateKr(kr.id, { progress: Number(e.target.value) })}
                    className="w-full accent-secondary"
                  />
                </div>
              ))}
              {keyResults.length === 0 && (
                <p className="text-sm text-on-surface-variant px-1">
                  No key results yet — add your first above.
                </p>
              )}
            </div>
          </div>

          <aside className="bg-primary text-white rounded-2xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                <Icon name="bolt" filled className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Strategy Advisor</h3>
                <p className="text-white/50 text-xs">Live</p>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
              <p className="text-sm text-white/90 leading-relaxed">{analysis.insight}</p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="bar_chart" className="text-secondary-fixed text-[18px]" />
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Key Result Progress
                </span>
              </div>
              <div className="flex justify-between items-end h-20 gap-1.5">
                {keyResults.length === 0 ? (
                  <p className="text-xs text-white/40">No data yet</p>
                ) : (
                  keyResults.map((kr) => (
                    <div key={kr.id} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm ${Number(kr.progress || 0) >= 70 ? "bg-secondary" : "bg-white/20"}`}
                        style={{ height: `${Math.max(4, Number(kr.progress || 0))}%` }}
                      />
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-white/50 mt-3">
                Average progress across {keyResults.length} key result{keyResults.length === 1 ? "" : "s"}:{" "}
                <span className="font-bold text-white">{analysis.avgProgress}%</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
