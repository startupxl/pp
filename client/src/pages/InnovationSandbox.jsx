import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    hypotheses: [
      { id: "h1", title: "Usage-based pricing tier for SMB segment", category: "SaaS / Pricing", stage: "testing", score: 8.4, note: "Early interviews show strong willingness-to-pay signal among 20-50 seat teams." },
      { id: "h2", title: "AI co-pilot for onboarding flow", category: "Product / AI", stage: "testing", score: 7.1, note: "Prototype reduced time-to-first-value in 6 of 9 usability sessions." },
      { id: "h3", title: "Vertical package for fintech compliance teams", category: "SaaS / Fintech", stage: "testing", score: 6.5, note: "Two design partners lined up; regulatory scope still being defined." },
    ],
    promoted: [
      { id: "p1", title: "Self-serve trial-to-paid flow", status: "Q4 Start" },
      { id: "p2", title: "Slack-native notifications", status: "In Design" },
    ],
    graveyard: [
      { id: "g1", title: "Marketplace for third-party plugins", reason: "Market Saturation", date: "Sep 2026" },
      { id: "g2", title: "Native mobile app", reason: "High Tech Friction", date: "Aug 2026" },
    ],
    researchSnippets: [
      { id: "r1", quote: "I'd pay more if I only got billed for the seats my team actually uses.", source: "Customer interview, SMB segment" },
      { id: "r2", quote: "Onboarding took us three weeks longer than we expected — nobody walked us through it.", source: "Churn exit interview" },
    ],
  };
}

const STAGE_META = {
  testing: { label: "Testing", color: "bg-secondary text-white" },
  validated: { label: "Validated", color: "bg-primary text-white" },
  paused: { label: "Paused", color: "bg-outline-variant text-on-surface" },
};

// Deterministic heuristic — no external LLM call.
function analyzeSandbox(data) {
  const hyps = data.hypotheses || [];
  const avgScore = hyps.length ? hyps.reduce((s, h) => s + Number(h.score || 0), 0) / hyps.length : 0;
  const readyToPromote = hyps.filter((h) => Number(h.score) >= 8);
  const needsAttention = hyps.filter((h) => Number(h.score) < 5);
  const categoryCount = {};
  hyps.forEach((h) => {
    categoryCount[h.category] = (categoryCount[h.category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
  return { avgScore, readyToPromote, needsAttention, topCategory };
}

export default function InnovationSandbox() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState({ title: "", category: "" });
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
        <div className="p-10 text-on-surface-variant">Loading innovation sandbox…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeSandbox(data);

  function updateHypothesis(hid, patch) {
    updateData({ hypotheses: data.hypotheses.map((h) => (h.id === hid ? { ...h, ...patch } : h)) });
  }

  function removeHypothesis(hid) {
    updateData({ hypotheses: data.hypotheses.filter((h) => h.id !== hid) });
  }

  function addHypothesis() {
    if (!draft.title.trim()) return;
    updateData({
      hypotheses: [
        ...data.hypotheses,
        { id: `h${Date.now()}`, title: draft.title.trim(), category: draft.category.trim() || "Uncategorized", stage: "testing", score: 5, note: "" },
      ],
    });
    setDraft({ title: "", category: "" });
  }

  function promoteHypothesis(hid) {
    const h = data.hypotheses.find((x) => x.id === hid);
    if (!h) return;
    updateData({
      hypotheses: data.hypotheses.filter((x) => x.id !== hid),
      promoted: [...data.promoted, { id: `p${Date.now()}`, title: h.title, status: "Backlog" }],
    });
  }

  function killHypothesis(hid) {
    const h = data.hypotheses.find((x) => x.id === hid);
    if (!h) return;
    updateData({
      hypotheses: data.hypotheses.filter((x) => x.id !== hid),
      graveyard: [...data.graveyard, { id: `g${Date.now()}`, title: h.title, reason: "Deprioritized", date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }) }],
    });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Innovation Sandbox</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Active Ideas</p>
            <p className="text-3xl font-bold text-primary">{data.hypotheses.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Avg. Score</p>
            <p className="text-3xl font-bold text-primary">{analysis.avgScore.toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Ready to Promote</p>
            <p className="text-3xl font-bold text-secondary">{analysis.readyToPromote.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Top Focus Area</p>
            <p className="text-lg font-bold text-primary truncate">{analysis.topCategory ? analysis.topCategory[0] : "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6 mb-6">
              <h3 className="font-bold text-primary mb-4">Product Hypotheses</h3>
              <div className="space-y-4 mb-4">
                {data.hypotheses.map((h) => (
                  <div key={h.id} className="group border border-outline-variant rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold uppercase text-secondary">{h.category}</span>
                        <input
                          value={h.title}
                          onChange={(e) => updateHypothesis(h.id, { title: e.target.value })}
                          className="block font-medium text-sm bg-transparent outline-none w-full mt-0.5"
                        />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STAGE_META[h.stage]?.color || STAGE_META.testing.color}`}>
                        {STAGE_META[h.stage]?.label || "Testing"}
                      </span>
                    </div>
                    <textarea
                      value={h.note}
                      onChange={(e) => updateHypothesis(h.id, { note: e.target.value })}
                      placeholder="Validation notes…"
                      rows={2}
                      className="w-full text-xs text-on-surface-variant bg-surface-container-low rounded-lg p-2 outline-none resize-none mb-3"
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${Math.min(100, Number(h.score) * 10)}%` }} />
                      </div>
                      <input
                        type="range" min="0" max="10" step="0.1"
                        value={h.score}
                        onChange={(e) => updateHypothesis(h.id, { score: Number(e.target.value) })}
                        className="w-24 accent-secondary"
                      />
                      <span className="text-xs font-bold w-8 text-right">{Number(h.score).toFixed(1)}</span>
                      <button onClick={() => promoteHypothesis(h.id)} title="Promote to Roadmap" className="text-secondary hover:opacity-70"><Icon name="rocket_launch" className="text-[18px]" /></button>
                      <button onClick={() => killHypothesis(h.id)} title="Send to Graveyard" className="text-on-surface-variant hover:text-error"><Icon name="delete_outline" className="text-[18px]" /></button>
                      <button onClick={() => removeHypothesis(h.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} placeholder="New hypothesis…" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
                <input value={draft.category} onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))} placeholder="Category" className="w-40 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
                <button onClick={addHypothesis} className="px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-1 text-sm"><Icon name="add" className="text-[16px]" /> Add</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <h3 className="font-bold text-primary mb-4">Live Research Snippets</h3>
              <div className="space-y-3">
                {data.researchSnippets.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <p className="text-sm italic text-on-surface">"{r.quote}"</p>
                    <p className="text-xs text-on-surface-variant mt-1">— {r.source}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="workspace_premium" className="text-secondary" />
                <h3 className="font-bold text-primary">Promoted to Roadmap</h3>
              </div>
              <div className="space-y-2">
                {data.promoted.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary-container/20 border border-secondary/20">
                    <span className="text-sm font-medium">{p.title}</span>
                    <span className="text-[10px] font-bold uppercase text-secondary">{p.status}</span>
                  </div>
                ))}
                {data.promoted.length === 0 && <p className="text-xs text-on-surface-variant">Nothing promoted yet.</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="delete_outline" className="text-on-surface-variant" />
                <h3 className="font-bold text-primary">Framework Graveyard</h3>
              </div>
              <div className="space-y-2">
                {data.graveyard.map((g) => (
                  <div key={g.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-sm line-through text-on-surface-variant">{g.title}</span>
                    <div className="text-[10px] text-on-surface-variant mt-1">{g.reason} · {g.date}</div>
                  </div>
                ))}
                {data.graveyard.length === 0 && <p className="text-xs text-on-surface-variant">No killed ideas yet.</p>}
              </div>
            </div>

            {analysis.needsAttention.length > 0 && (
              <div className="bg-error-container/20 rounded-2xl border border-error/20 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="warning" className="text-error" />
                  <h3 className="font-bold text-error text-sm">Needs Attention</h3>
                </div>
                <p className="text-xs text-on-surface-variant">{analysis.needsAttention.length} hypothesis{analysis.needsAttention.length === 1 ? "" : "es"} scoring below 5 — consider retesting or moving to the graveyard.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
