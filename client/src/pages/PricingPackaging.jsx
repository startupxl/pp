import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    tiers: [
      { id: "seed", name: "Seed", price: 29, users: 1200 },
      { id: "pro", name: "Pro", price: 99, users: 450 },
      { id: "enterprise", name: "Enterprise", price: 850, users: 45 },
    ],
    competitors: [
      { id: "compA", name: "Competitor A", features: { "Core API Access": false, "SSO / SAML": true } },
      { id: "compB", name: "Competitor B", features: { "Core API Access": true, "SSO / SAML": false } },
    ],
    featureList: ["Core API Access", "SSO / SAML"],
    ourFeatures: { "Core API Access": true, "SSO / SAML": false },
  };
}

// Deterministic heuristic — no external LLM call.
function analyzePricing(data) {
  const tiers = (data.tiers || []).map((t) => ({ ...t, arr: Number(t.price) * Number(t.users) * 12 }));
  const totalArr = tiers.reduce((s, t) => s + t.arr, 0);
  const tierShare = tiers.map((t) => ({ ...t, sharePct: totalArr > 0 ? (t.arr / totalArr) * 100 : 0 }));
  const dominantTier = tierShare.reduce((max, t) => (max === null || t.arr > max.arr ? t : max), null);
  return { tierShare, totalArr, dominantTier };
}

export default function PricingPackaging() {
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
        <div className="p-10 text-on-surface-variant">Loading pricing workshop…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzePricing(data);

  function updateTier(tid, field, value) {
    updateData({ tiers: data.tiers.map((t) => (t.id === tid ? { ...t, [field]: Number(value) } : t)) });
  }

  function toggleOurFeature(f) {
    updateData({ ourFeatures: { ...data.ourFeatures, [f]: !data.ourFeatures[f] } });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Pricing & Packaging Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm mb-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="font-bold text-primary">Revenue Impact Calculator</h3>
            <div className="text-right">
              <div className="text-xs uppercase text-secondary">Projected ARR</div>
              <div className="text-3xl font-bold text-primary">${analysis.totalArr.toLocaleString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.tiers.map((t) => (
              <div key={t.id} className="p-4 rounded-xl bg-surface-container-low space-y-3">
                <span className="font-medium text-primary">{t.name}</span>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Price / month ($)</label>
                  <input type="number" value={t.price} onChange={(e) => updateTier(t.id, "price", e.target.value)} className="w-full text-sm border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Target Users</label>
                  <input type="number" value={t.users} onChange={(e) => updateTier(t.id, "users", e.target.value)} className="w-full text-sm border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-secondary" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-outline-variant/30">
            <div className="h-2 w-full bg-surface-container flex rounded-full overflow-hidden mb-2">
              {analysis.tierShare.map((t, i) => (
                <div key={t.id} className={i === 0 ? "bg-primary-fixed-dim" : i === 1 ? "bg-secondary" : "bg-primary"} style={{ width: `${t.sharePct}%`, height: "100%" }} />
              ))}
            </div>
            {analysis.dominantTier && (
              <p className="text-xs text-on-surface-variant"><strong className="text-secondary">{analysis.dominantTier.name}</strong> drives {analysis.dominantTier.sharePct.toFixed(0)}% of projected ARR.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
          <h3 className="font-bold text-primary mb-6">Competitor Feature Comparison</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="py-3 font-medium text-on-surface-variant">Feature</th>
                <th className="py-3 font-medium text-secondary">Us</th>
                {data.competitors.map((c) => (
                  <th key={c.id} className="py-3 font-medium text-primary">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {data.featureList.map((f) => (
                <tr key={f}>
                  <td className="py-3 font-medium text-primary">{f}</td>
                  <td className="py-3">
                    <button onClick={() => toggleOurFeature(f)}>
                      <Icon name={data.ourFeatures[f] ? "check_circle" : "remove_circle"} className={data.ourFeatures[f] ? "text-secondary" : "text-on-surface-variant/40"} filled={data.ourFeatures[f]} />
                    </button>
                  </td>
                  {data.competitors.map((c) => (
                    <td key={c.id} className="py-3">
                      <Icon name={c.features[f] ? "check_circle" : "remove_circle"} className={c.features[f] ? "text-secondary" : "text-on-surface-variant/40"} filled={c.features[f]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
