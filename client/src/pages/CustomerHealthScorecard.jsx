import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    accounts: [
      { id: "a1", name: "Starlight Interactive", tier: "Enterprise", score: 92, arr: 85000, tickets7d: 2, nextStep: "Quarterly Review" },
      { id: "a2", name: "Echo Systems", tier: "Growth", score: 64, arr: 22500, tickets7d: 8, nextStep: "Deep Dive Call" },
      { id: "a3", name: "Nexus Cloud Corp", tier: "Enterprise", score: 28, arr: 45000, tickets7d: 0, nextStep: "Executive Alert" },
    ],
    renewals: [
      { id: "r1", name: "Acme Global", amount: 85000, date: "", status: "On Track" },
      { id: "r2", name: "Velocity Tech", amount: 22500, date: "", status: "Negotiating" },
    ],
    expansions: [
      { id: "e1", name: "Prism Data", amount: 15000, trigger: "Storage limit reached (95%)", type: "Upsell" },
      { id: "e2", name: "CloudFlow", amount: 8000, trigger: "10+ seats added last week", type: "Cross-sell" },
    ],
  };
}

function healthTier(score) {
  if (score >= 70) return { label: "Stable", color: "text-green-700 bg-green-100", bar: "bg-secondary" };
  if (score >= 40) return { label: "At-Risk", color: "text-amber-700 bg-amber-100", bar: "bg-amber-500" };
  return { label: "Critical", color: "text-red-700 bg-red-100", bar: "bg-error" };
}

// Deterministic heuristic — no external LLM call.
function analyzeHealth(data) {
  const accounts = data.accounts || [];
  const withTier = accounts.map((a) => ({ ...a, tier: undefined, health: healthTier(a.score) }));
  const avgScore = accounts.length ? Math.round(accounts.reduce((s, a) => s + Number(a.score), 0) / accounts.length) : 0;
  const critical = accounts.filter((a) => a.score < 40);
  const criticalArr = critical.reduce((s, a) => s + Number(a.arr), 0);
  const expansionTotal = (data.expansions || []).reduce((s, e) => s + Number(e.amount), 0);
  const renewalTotal = (data.renewals || []).reduce((s, r) => s + Number(r.amount), 0);
  return { avgScore, critical, criticalArr, expansionTotal, renewalTotal };
}

export default function CustomerHealthScorecard() {
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
        <div className="p-10 text-on-surface-variant">Loading health scorecard…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeHealth(data);

  function updateAccount(aid, field, value) {
    updateData({ accounts: data.accounts.map((a) => (a.id === aid ? { ...a, [field]: value } : a)) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Customer Success Health Scorecard</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-on-surface-variant mb-1">Aggregate Health</div>
            <div className="text-3xl font-bold text-primary">{analysis.avgScore}</div>
          </div>
          <div className="bg-error-container/20 rounded-2xl p-5 border border-error/20 shadow-sm">
            <div className="text-xs uppercase text-error mb-1">Critical ARR at Risk</div>
            <div className="text-3xl font-bold text-error">${(analysis.criticalArr / 1000).toFixed(1)}k</div>
          </div>
          <div className="bg-secondary-container/10 rounded-2xl p-5 border border-secondary/20 shadow-sm">
            <div className="text-xs uppercase text-secondary mb-1">Expansion Pipeline</div>
            <div className="text-3xl font-bold text-secondary">${(analysis.expansionTotal / 1000).toFixed(1)}k</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-primary">Portfolio Health Details</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Account</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Health</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">ARR</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Support (7d)</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Next Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {data.accounts.map((a) => {
                  const h = healthTier(Number(a.score));
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-primary">{a.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input type="number" value={a.score} onChange={(e) => updateAccount(a.id, "score", Number(e.target.value))} className="w-14 bg-transparent outline-none border-b border-outline-variant" />
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${h.color}`}>{h.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">${Number(a.arr).toLocaleString()}</td>
                      <td className="px-4 py-3">{a.tickets7d}</td>
                      <td className="px-4 py-3 text-secondary">{a.nextStep}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Icon name="calendar_today" className="text-secondary" /> Renewal Pipeline</h3>
              <div className="space-y-3">
                {data.renewals.map((r) => (
                  <div key={r.id} className="pl-3 border-l-2 border-secondary">
                    <p className="text-sm font-medium text-primary">{r.name}</p>
                    <p className="text-xs text-on-surface-variant">${Number(r.amount).toLocaleString()} · {r.status}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                Total: ${analysis.renewalTotal.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-secondary/20 border-dashed shadow-sm">
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2"><Icon name="trending_up" className="text-secondary" /> Expansion Opportunities</h3>
              <div className="space-y-3">
                {data.expansions.map((e) => (
                  <div key={e.id} className="p-3 bg-surface-container-low rounded-xl">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase text-secondary">{e.type}</span>
                      <span className="font-bold text-primary">${(Number(e.amount) / 1000).toFixed(0)}k</span>
                    </div>
                    <p className="text-sm font-medium text-primary">{e.name}</p>
                    <p className="text-xs text-on-surface-variant">{e.trigger}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
