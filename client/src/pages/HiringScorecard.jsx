import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    candidateName: "",
    roleName: "",
    criteria: [
      { id: "c1", label: "Technical Skills", weight: 40, rating: 3 },
      { id: "c2", label: "Cultural Fit", weight: 30, rating: 3 },
      { id: "c3", label: "Relevant Experience", weight: 30, rating: 3 },
    ],
    interviewers: [
      { id: "i1", name: "Jordan Smith", round: "Technical Round", score: 8.2, recommendation: "Strong Hire" },
      { id: "i2", name: "Elena Vance", round: "Culture & Values", score: 5.4, recommendation: "Hire" },
    ],
    notes: "",
    recommendation: "hire",
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeHiring(data) {
  const criteria = data.criteria || [];
  const totalWeight = criteria.reduce((s, c) => s + Number(c.weight), 0) || 1;
  const weightedScore = criteria.reduce((s, c) => s + (Number(c.rating) / 5) * Number(c.weight), 0) / totalWeight * 10;
  const interviewers = data.interviewers || [];
  const avgInterviewerScore = interviewers.length ? interviewers.reduce((s, i) => s + Number(i.score), 0) / interviewers.length : 0;
  const scoreSpread = interviewers.length > 1 ? Math.max(...interviewers.map((i) => i.score)) - Math.min(...interviewers.map((i) => i.score)) : 0;
  const consensus = scoreSpread > 2 ? "Disparity — align with team before deciding" : "Consensus aligned";
  return { weightedScore, avgInterviewerScore, consensus, scoreSpread };
}

export default function HiringScorecard() {
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
        <div className="p-10 text-on-surface-variant">Loading hiring scorecard…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeHiring(data);

  function updateCriterion(cid, field, value) {
    updateData({ criteria: data.criteria.map((c) => (c.id === cid ? { ...c, [field]: value } : c)) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Hiring Scorecard Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="flex gap-3 mb-6">
          <input value={data.candidateName} onChange={(e) => updateData({ candidateName: e.target.value })} placeholder="Candidate name" className="text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary" />
          <input value={data.roleName} onChange={(e) => updateData({ roleName: e.target.value })} placeholder="Role" className="text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-primary">Evaluation Matrix</h3>
              <span className="text-sm text-secondary font-bold">{analysis.weightedScore.toFixed(1)} / 10.0</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Criteria</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Weight %</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Rating (1-5)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {data.criteria.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-primary">{c.label}</td>
                    <td className="px-4 py-3">
                      <input type="number" value={c.weight} onChange={(e) => updateCriterion(c.id, "weight", Number(e.target.value))} className="w-16 bg-transparent outline-none border-b border-outline-variant" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => updateCriterion(c.id, "rating", n)}
                            className={`w-8 h-8 rounded-lg border text-xs font-medium ${c.rating === n ? "border-secondary bg-secondary/10 text-secondary" : "border-outline-variant hover:border-secondary"}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-6">
              <label className="block text-xs font-semibold text-on-surface-variant mb-2">Overall Assessment Notes</label>
              <textarea value={data.notes} onChange={(e) => updateData({ notes: e.target.value })} className="w-full h-24 p-3 border border-outline-variant rounded-xl text-sm outline-none focus:border-secondary resize-none" placeholder="Summarize strengths and weaknesses..." />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <h3 className="font-bold text-primary mb-4">Final Recommendation</h3>
              <div className="space-y-2">
                {["strong_hire", "hire", "no_hire"].map((v) => (
                  <button
                    key={v}
                    onClick={() => updateData({ recommendation: v })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-medium ${data.recommendation === v ? "border-secondary bg-secondary/5 text-primary" : "border-outline-variant text-on-surface-variant hover:border-secondary/50"}`}
                  >
                    {v === "strong_hire" ? "Strong Hire" : v === "hire" ? "Hire" : "No Hire"}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <h3 className="font-bold text-primary mb-4">Interviewer Consensus</h3>
              <div className="space-y-3 mb-3">
                {data.interviewers.map((i) => (
                  <div key={i.id} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-primary">{i.name}</p>
                      <p className="text-xs text-on-surface-variant">{i.round}</p>
                    </div>
                    <span className="text-sm font-bold text-secondary">{i.score}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                Avg: {analysis.avgInterviewerScore.toFixed(1)} · {analysis.consensus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
