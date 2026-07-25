import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const DEFAULT_QUARTERS = () => [
  { id: "q1", label: "Q1: Foundation", milestones: [] },
  { id: "q2", label: "Q2: Scaling", milestones: [] },
  { id: "q3", label: "Q3: Ecosystem", milestones: [] },
  { id: "q4", label: "Q4: Intelligence", milestones: [] },
];

function analyzeRoadmap(quarters) {
  const all = quarters.flatMap((q) => q.milestones);
  if (all.length === 0) {
    return { total: 0, avgProgress: 0, insight: "Add milestones to each quarter to see roadmap health." };
  }
  const avgProgress = Math.round(all.reduce((s, m) => s + Number(m.progress || 0), 0) / all.length);
  const perQuarter = quarters.map((q) => ({
    id: q.id,
    label: q.label,
    avg: q.milestones.length
      ? Math.round(q.milestones.reduce((s, m) => s + Number(m.progress || 0), 0) / q.milestones.length)
      : null,
    count: q.milestones.length,
  }));
  const weakest = perQuarter.filter((q) => q.avg !== null).sort((a, b) => a.avg - b.avg)[0];
  const insight = weakest
    ? `${weakest.label} is trailing at ${weakest.avg}% average progress across ${weakest.count} milestone${weakest.count === 1 ? "" : "s"} — consider reprioritizing resources there.`
    : "Add progress to your milestones to get a health read.";
  return { total: all.length, avgProgress, insight, perQuarter };
}

export default function ProductRoadmap() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newMilestone, setNewMilestone] = useState({});
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

  const quarters = doc?.data?.quarters?.length ? doc.data.quarters : DEFAULT_QUARTERS();

  function addMilestone(qid) {
    const draft = newMilestone[qid];
    if (!draft?.title?.trim()) return;
    updateData({
      quarters: quarters.map((q) =>
        q.id === qid
          ? {
              ...q,
              milestones: [
                ...q.milestones,
                {
                  id: `m${Date.now()}`,
                  category: draft.category?.trim() || "Feature",
                  title: draft.title.trim(),
                  description: draft.description?.trim() || "",
                  progress: 0,
                },
              ],
            }
          : q
      ),
    });
    setNewMilestone((v) => ({ ...v, [qid]: { category: "", title: "", description: "" } }));
  }

  function removeMilestone(qid, mid) {
    updateData({
      quarters: quarters.map((q) =>
        q.id === qid ? { ...q, milestones: q.milestones.filter((m) => m.id !== mid) } : q
      ),
    });
  }

  function updateMilestone(qid, mid, patch) {
    updateData({
      quarters: quarters.map((q) =>
        q.id === qid
          ? { ...q, milestones: q.milestones.map((m) => (m.id === mid ? { ...m, ...patch } : m)) }
          : q
      ),
    });
  }

  function moveMilestone(qid, mid, direction) {
    const idx = quarters.findIndex((q) => q.id === qid);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= quarters.length) return;
    const milestone = quarters[idx].milestones.find((m) => m.id === mid);
    if (!milestone) return;
    const nextQuarters = quarters.map((q, i) => {
      if (i === idx) return { ...q, milestones: q.milestones.filter((m) => m.id !== mid) };
      if (i === targetIdx) return { ...q, milestones: [...q.milestones, milestone] };
      return q;
    });
    updateData({ quarters: nextQuarters });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading roadmap…</div>
      </Layout>
    );
  }

  const analysis = analyzeRoadmap(quarters);

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Product Roadmap Workshop
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

        <p className="text-on-surface-variant max-w-2xl mb-8">
          Visualize and plan the strategic trajectory of your product across the next four quarters.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto">
            {quarters.map((q, qi) => (
              <div key={q.id} className="space-y-4 min-w-[260px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary-fixed/40 px-3 py-1 rounded-full">
                    {q.label}
                  </span>
                </div>
                {q.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-xl p-4 border border-outline-variant shadow-sm group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-secondary uppercase bg-secondary-container px-2 py-0.5 rounded">
                        {m.category}
                      </span>
                      <button
                        onClick={() => removeMilestone(q.id, m.id)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                      >
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-primary text-sm mb-1">{m.title}</h4>
                    {m.description && (
                      <p className="text-xs text-on-surface-variant mb-3 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={m.progress || 0}
                        onChange={(e) =>
                          updateMilestone(q.id, m.id, { progress: Number(e.target.value) })
                        }
                        className="flex-1 accent-secondary h-1"
                      />
                      <span className="text-xs font-bold text-primary w-9 text-right">
                        {m.progress || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => moveMilestone(q.id, m.id, -1)}
                        disabled={qi === 0}
                        className="text-on-surface-variant hover:text-secondary disabled:opacity-20"
                        title="Move to previous quarter"
                      >
                        <Icon name="chevron_left" className="text-[16px]" />
                      </button>
                      <button
                        onClick={() => moveMilestone(q.id, m.id, 1)}
                        disabled={qi === quarters.length - 1}
                        className="text-on-surface-variant hover:text-secondary disabled:opacity-20"
                        title="Move to next quarter"
                      >
                        <Icon name="chevron_right" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="bg-surface-container/30 border-2 border-dashed border-outline-variant/40 rounded-xl p-3 space-y-2">
                  <input
                    value={newMilestone[q.id]?.category || ""}
                    onChange={(e) =>
                      setNewMilestone((v) => ({ ...v, [q.id]: { ...v[q.id], category: e.target.value } }))
                    }
                    placeholder="Category"
                    className="w-full text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary"
                  />
                  <input
                    value={newMilestone[q.id]?.title || ""}
                    onChange={(e) =>
                      setNewMilestone((v) => ({ ...v, [q.id]: { ...v[q.id], title: e.target.value } }))
                    }
                    placeholder="Milestone title"
                    className="w-full text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary"
                  />
                  <button
                    onClick={() => addMilestone(q.id)}
                    disabled={!newMilestone[q.id]?.title?.trim()}
                    className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-secondary disabled:opacity-40 py-1"
                  >
                    <Icon name="add_circle" className="text-[16px]" />
                    Add Milestone
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Roadmap Health
              </h3>
            </div>
            <div className="p-4 bg-surface-container rounded-xl border border-secondary-container mb-4">
              <p className="text-sm text-on-surface">{analysis.insight}</p>
            </div>
            <div className="space-y-3">
              {(analysis.perQuarter || []).map((q) => (
                <div key={q.id}>
                  <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                    <span>{q.label}</span>
                    <span>{q.avg === null ? "—" : `${q.avg}%`}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-secondary h-full transition-all duration-500"
                      style={{ width: `${q.avg || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant mt-4 pt-4 border-t border-outline-variant">
              {analysis.total} total milestone{analysis.total === 1 ? "" : "s"} • {analysis.avgProgress}%
              average progress
            </p>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
