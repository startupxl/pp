import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const BLOCKS = [
  { key: "problem", label: "Problem", icon: "report_problem", placeholder: "Identify the top 3 problems you're solving." },
  { key: "solution", label: "Solution", icon: "lightbulb", placeholder: "Describe the top 3 features..." },
  { key: "keyMetrics", label: "Key Metrics", icon: "bar_chart", placeholder: "List the numbers that matter..." },
  { key: "uniqueValueProp", label: "Unique Value Prop", icon: "verified", placeholder: "Single, clear, compelling message..." },
  { key: "unfairAdvantage", label: "Unfair Advantage", icon: "bolt", placeholder: "What can't be easily copied?" },
  { key: "channels", label: "Channels", icon: "hub", placeholder: "Path to customers..." },
  { key: "customerSegments", label: "Customer Segments", icon: "group", placeholder: "Target audience..." },
  { key: "costStructure", label: "Cost Structure", icon: "account_balance_wallet", placeholder: "Customer acquisition costs, hosting, salaries..." },
  { key: "revenueStreams", label: "Revenue Streams", icon: "payments", placeholder: "Subscription models, direct sales, licensing..." },
];

const GRID_POSITION = {
  problem: "lg:col-start-1 lg:row-span-2",
  solution: "lg:col-start-2 lg:row-start-1",
  keyMetrics: "lg:col-start-2 lg:row-start-2",
  uniqueValueProp: "lg:col-start-3 lg:row-span-2",
  unfairAdvantage: "lg:col-start-4 lg:row-start-1",
  channels: "lg:col-start-4 lg:row-start-2",
  customerSegments: "lg:col-start-5 lg:row-span-2",
};

function analyzeCanvas(data) {
  const filled = BLOCKS.filter((b) => (data[b.key] || "").trim().length > 0);
  const pct = Math.round((filled.length / BLOCKS.length) * 100);
  const missing = BLOCKS.filter((b) => !(data[b.key] || "").trim());
  let message;
  if (pct === 100) {
    message = "Every block is filled in — your canvas is ready for a pitch review.";
  } else if (pct >= 60) {
    message = `Still needs: ${missing.map((b) => b.label).join(", ")}.`;
  } else {
    message = "Start with Problem, Customer Segments, and Unique Value Prop — the rest follows from those three.";
  }
  return { pct, missing, message };
}

export default function LeanCanvas() {
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

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading canvas…</div>
      </Layout>
    );
  }

  const data = doc.data || {};
  const analysis = analyzeCanvas(data);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Lean Canvas Workshop
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
          Refine your startup's business model with tactical precision across all nine building
          blocks.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 lg:grid-rows-2 gap-4 mb-6">
          {BLOCKS.filter((b) => !["costStructure", "revenueStreams"].includes(b.key)).map((b) => (
            <div
              key={b.key}
              className={`bg-white rounded-xl border border-outline-variant p-5 flex flex-col ${GRID_POSITION[b.key] || ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {b.label}
                </h3>
                <Icon name={b.icon} className="text-on-surface-variant text-[18px]" />
              </div>
              <textarea
                value={data[b.key] || ""}
                onChange={(e) => updateData({ [b.key]: e.target.value })}
                placeholder={b.placeholder}
                className="flex-1 min-h-[140px] w-full bg-surface-container-low border-none rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40 placeholder:text-on-surface-variant/40"
              />
              {b.key === "problem" && (
                <div className="mt-3 pt-3 border-t border-outline-variant/50">
                  <h4 className="text-[10px] font-semibold uppercase text-outline mb-1">
                    Existing Alternatives
                  </h4>
                  <input
                    value={data.existingAlternatives || ""}
                    onChange={(e) => updateData({ existingAlternatives: e.target.value })}
                    placeholder="Spreadsheets, manual tracking..."
                    className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
                  />
                </div>
              )}
              {b.key === "uniqueValueProp" && (
                <div className="mt-3">
                  <div className="p-3 rounded-lg bg-primary text-white mb-3">
                    <p className="text-[10px] opacity-60 mb-1">HIGH-LEVEL CONCEPT</p>
                    <input
                      value={data.highLevelConcept || ""}
                      onChange={(e) => updateData({ highLevelConcept: e.target.value })}
                      placeholder="The X for Y..."
                      className="w-full bg-transparent outline-none text-sm font-bold placeholder:text-white/50"
                    />
                  </div>
                </div>
              )}
              {b.key === "customerSegments" && (
                <div className="mt-3 pt-3 border-t border-outline-variant/50">
                  <h4 className="text-[10px] font-semibold uppercase text-outline mb-1">
                    Early Adopters
                  </h4>
                  <input
                    value={data.earlyAdopters || ""}
                    onChange={(e) => updateData({ earlyAdopters: e.target.value })}
                    placeholder="Who will try this first?"
                    className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8">
          <div className="sm:col-span-2 bg-white rounded-xl border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Cost Structure
              </h3>
              <Icon name="account_balance_wallet" className="text-on-surface-variant text-[18px]" />
            </div>
            <textarea
              value={data.costStructure || ""}
              onChange={(e) => updateData({ costStructure: e.target.value })}
              placeholder="Customer acquisition costs, hosting, salaries..."
              className="w-full h-28 bg-surface-container-low border-none rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>
          <div className="sm:col-span-3 bg-white rounded-xl border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Revenue Streams
              </h3>
              <Icon name="payments" className="text-on-surface-variant text-[18px]" />
            </div>
            <textarea
              value={data.revenueStreams || ""}
              onChange={(e) => updateData({ revenueStreams: e.target.value })}
              placeholder="Subscription models, direct sales, licensing..."
              className="w-full h-28 bg-surface-container-low border-none rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-outline-variant p-6 flex items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between items-center text-xs uppercase text-on-surface-variant mb-1">
                <span>Canvas Completeness</span>
                <span className="text-secondary font-bold">{analysis.pct}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-secondary h-full transition-all duration-500"
                  style={{ width: `${analysis.pct}%` }}
                />
              </div>
              <p className="text-sm text-on-surface-variant">{analysis.message}</p>
            </div>
          </div>
          <div className="bg-primary text-white rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-bold mb-1">Ready for Pitch?</h4>
              <p className="text-white/70 text-sm">AI analysis of your canvas completeness.</p>
            </div>
            <button
              disabled={analysis.pct < 100}
              className="mt-4 w-full bg-secondary-fixed text-on-secondary-fixed py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              {analysis.pct < 100 ? "Fill all blocks to unlock" : "Generate Pitch Deck"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
