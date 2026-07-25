import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const DIMENSIONS = [
  { key: "valuable", label: "Valuable" },
  { key: "rare", label: "Rare" },
  { key: "inimitable", label: "Inimitable" },
  { key: "organized", label: "Organized" },
];

function implicationFor(r) {
  if (!r.valuable) return { label: "Competitive Disadvantage", tone: "bad" };
  if (!r.rare) return { label: "Competitive Parity", tone: "neutral" };
  if (!r.inimitable) return { label: "Temporary Advantage", tone: "ok" };
  if (!r.organized) return { label: "Unused Potential", tone: "warn" };
  return { label: "Sustained Advantage", tone: "good" };
}

const TONE_CLASSES = {
  bad: "bg-error-container/40 text-error",
  neutral: "bg-surface-container-low text-on-surface-variant",
  ok: "bg-surface-container text-on-surface-variant",
  warn: "bg-surface-container-high text-primary",
  good: "bg-secondary/10 text-secondary",
};

function analyzeResources(resources) {
  if (resources.length === 0) {
    return { hasContent: false, healthScore: 0, sustained: 0, threatened: 0 };
  }
  const scored = resources.map((r) => ({
    ...r,
    score: DIMENSIONS.filter((d) => r[d.key]).length,
    implication: implicationFor(r),
  }));
  const healthScore = Math.round(
    (scored.reduce((sum, r) => sum + r.score, 0) / (scored.length * 4)) * 100
  );
  const sustained = scored.filter((r) => r.implication.label === "Sustained Advantage");
  const threatened = scored.filter((r) =>
    ["Competitive Disadvantage", "Competitive Parity"].includes(r.implication.label)
  );
  const unusedPotential = scored.filter((r) => r.implication.label === "Unused Potential");
  const temporary = scored.filter((r) => r.implication.label === "Temporary Advantage");

  return {
    hasContent: true,
    healthScore,
    sustained: sustained.length,
    threatened: threatened.length,
    protectionPick: sustained[0],
    gapPick: unusedPotential[0],
    recommendationPick: temporary[0],
  };
}

export default function Vrio() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newResource, setNewResource] = useState({ name: "", description: "" });
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

  const resources = doc?.data?.resources || [];

  function toggleDimension(rid, key) {
    updateData({
      resources: resources.map((r) => (r.id === rid ? { ...r, [key]: !r[key] } : r)),
    });
  }

  function addResource() {
    if (!newResource.name.trim()) return;
    updateData({
      resources: [
        ...resources,
        {
          id: `res${Date.now()}`,
          name: newResource.name.trim(),
          description: newResource.description.trim(),
          valuable: false,
          rare: false,
          inimitable: false,
          organized: false,
        },
      ],
    });
    setNewResource({ name: "", description: "" });
  }

  function removeResource(rid) {
    updateData({ resources: resources.filter((r) => r.id !== rid) });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading VRIO workshop…</div>
      </Layout>
    );
  }

  const analysis = analyzeResources(resources);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              VRIO Analysis Workshop
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
          Analyze your resources using the VRIO framework to determine sustained competitive
          advantage. A "No" at any stage resets the advantage level.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Strategic score + guide */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-xl p-6 border border-outline-variant shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                  <Icon name="analytics" />
                </div>
                <h3 className="text-lg font-bold text-primary">Strategic Score</h3>
              </div>
              <p className="text-xs uppercase text-on-surface-variant mb-1">Health Score</p>
              <span className="text-4xl font-extrabold text-primary">{analysis.healthScore}%</span>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden my-4">
                <div
                  className="bg-secondary h-full transition-all duration-500"
                  style={{ width: `${analysis.healthScore}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg">
                  <p className="text-xs text-on-surface-variant mb-1">Sustainable Assets</p>
                  <p className="text-xl font-bold text-primary">
                    {String(analysis.sustained).padStart(2, "0")}
                  </p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg">
                  <p className="text-xs text-on-surface-variant mb-1">Threatened Assets</p>
                  <p className="text-xl font-bold text-error">
                    {String(analysis.threatened).padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary text-white rounded-xl p-6">
              <h4 className="text-sm font-semibold mb-3">Workshop Guide</h4>
              <ul className="space-y-2.5 text-sm text-white/80">
                <li className="flex gap-2">
                  <Icon name="check_circle" filled className="text-secondary-fixed text-[18px]" />
                  Define the resource or capability clearly.
                </li>
                <li className="flex gap-2">
                  <Icon name="check_circle" filled className="text-secondary-fixed text-[18px]" />
                  Test against V-R-I-O sequential hurdles.
                </li>
                <li className="flex gap-2">
                  <Icon name="info" className="text-secondary-fixed text-[18px]" />
                  A "No" at any stage resets the advantage level.
                </li>
              </ul>
            </div>
          </div>

          {/* Resource matrix */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary">Resource Matrix</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
                    <th className="text-left py-3 px-5 font-semibold border-b border-outline-variant w-1/4">
                      Resource
                    </th>
                    {DIMENSIONS.map((d) => (
                      <th key={d.key} className="text-center py-3 px-3 font-semibold border-b border-outline-variant">
                        {d.label}
                      </th>
                    ))}
                    <th className="text-right py-3 px-5 font-semibold border-b border-outline-variant">
                      Implication
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {resources.map((r) => {
                    const implication = implicationFor(r);
                    return (
                      <tr key={r.id} className="hover:bg-surface-container-low/40 group">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-primary text-sm">{r.name}</div>
                          {r.description && (
                            <div className="text-xs text-on-surface-variant">{r.description}</div>
                          )}
                        </td>
                        {DIMENSIONS.map((d) => (
                          <td key={d.key} className="py-4 px-3 text-center">
                            <button onClick={() => toggleDimension(r.id, d.key)}>
                              <Icon
                                name={r[d.key] ? "check_circle" : "cancel"}
                                filled={r[d.key]}
                                className={r[d.key] ? "text-secondary" : "text-outline-variant"}
                              />
                            </button>
                          </td>
                        ))}
                        <td className="py-4 px-5 text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${TONE_CLASSES[implication.tone]}`}
                          >
                            {implication.label}
                          </span>
                        </td>
                        <td className="py-2 pr-2">
                          <button
                            onClick={() => removeResource(r.id)}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                          >
                            <Icon name="close" className="text-[16px]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {resources.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 px-5 text-center text-sm text-on-surface-variant">
                        No resources analyzed yet — add one below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-container-low/30 flex gap-2 flex-wrap items-center">
              <input
                value={newResource.name}
                onChange={(e) => setNewResource((v) => ({ ...v, name: e.target.value }))}
                placeholder="Resource / capability name"
                className="flex-1 min-w-[180px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
              />
              <input
                value={newResource.description}
                onChange={(e) => setNewResource((v) => ({ ...v, description: e.target.value }))}
                placeholder="Short description (optional)"
                className="flex-1 min-w-[180px] text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
              />
              <button
                onClick={addResource}
                disabled={!newResource.name.trim()}
                className="flex items-center gap-2 text-primary font-semibold text-sm hover:text-secondary transition-colors disabled:opacity-40 px-3 py-2"
              >
                <Icon name="add_circle" className="text-[18px]" />
                Analyze New Resource
              </button>
            </div>
          </div>
        </div>

        {/* Contextual insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl p-5 border border-outline-variant shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="verified_user" className="text-secondary" />
              <h4 className="font-semibold text-primary text-sm">Protection Strategy</h4>
            </div>
            <p className="text-sm text-on-surface-variant">
              {analysis.protectionPick
                ? `"${analysis.protectionPick.name}" is currently your strongest moat. Consider additional investment to reinforce its inimitability.`
                : "No resource has reached Sustained Advantage yet — organize around your strongest valuable/rare/inimitable asset."}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-outline-variant shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="warning" className="text-error" />
              <h4 className="font-semibold text-primary text-sm">Organizational Gap</h4>
            </div>
            <p className="text-sm text-on-surface-variant">
              {analysis.gapPick
                ? `"${analysis.gapPick.name}" is valuable, rare, and inimitable, but the organization isn't capitalizing on it yet.`
                : "No unused-potential resources detected — capabilities are either well organized or not yet defensible."}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-outline-variant shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="lightbulb" className="text-primary" />
              <h4 className="font-semibold text-primary text-sm">AI Recommendation</h4>
            </div>
            <p className="text-sm text-on-surface-variant italic">
              {analysis.recommendationPick
                ? `Push "${analysis.recommendationPick.name}" toward Inimitable to convert its Temporary Advantage into something durable.`
                : "Add resources and score them across all four dimensions to surface a recommendation."}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
