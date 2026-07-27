import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import AIAssistPanel from "../components/AIAssistPanel";
import { api } from "../api";

const STEPS = [
  { key: "context", label: "Context" },
  { key: "analysis", label: "Analysis" },
  { key: "strategy", label: "Strategy" },
];

const QUADRANTS = [
  {
    key: "strengths",
    label: "Strengths",
    kind: "Internal",
    icon: "trending_up",
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
    itemIcon: "check_circle",
  },
  {
    key: "weaknesses",
    label: "Weaknesses",
    kind: "Internal",
    icon: "trending_down",
    iconColor: "text-red-600",
    bg: "bg-red-50",
    itemIcon: "warning",
  },
  {
    key: "opportunities",
    label: "Opportunities",
    kind: "External",
    icon: "rocket_launch",
    iconColor: "text-on-surface",
    bg: "bg-surface-container",
    itemIcon: "add_circle",
  },
  {
    key: "threats",
    label: "Threats",
    kind: "External",
    icon: "cancel",
    iconColor: "text-on-surface",
    bg: "bg-surface-container",
    itemIcon: "cancel",
  },
];

export default function Workshop() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [contextText, setContextText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saveState, setSaveState] = useState("Saved");
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getSession(id).then((s) => {
      setSession(s);
      setContextText(s.contextText || "");
      setAnalysis(s.analysis);
    });
  }, [id]);

  function onChangeText(value) {
    setContextText(value);
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.updateSession(id, { contextText: value });
      setSaveState("Saved");
    }, 600);
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await api.generateAnalysis(id, contextText);
      setSession(res.session);
      setAnalysis(res.analysis);
    } finally {
      setGenerating(false);
    }
  }

  async function commit() {
    const s = await api.commitSession(id);
    setSession(s);
    navigate(`/dashboard/${id}`);
  }

  if (!session) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading session…</div>
      </Layout>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === session.stage);

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentStepIndex
                        ? "bg-primary text-white"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      i === currentStepIndex ? "text-on-surface" : "text-on-surface-variant"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-10 h-px bg-outline-variant" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {session.stage !== "strategy" ? (
              <button
                onClick={generate}
                disabled={generating || !contextText.trim()}
                className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-md font-semibold disabled:opacity-40 hover:opacity-90"
              >
                <Icon name="auto_awesome" className="text-[18px]" />
                {generating ? "Generating…" : "Generate SWOT Analysis"}
              </button>
            ) : (
              <button
                onClick={() => navigate(`/dashboard/${id}`)}
                className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-md font-semibold hover:opacity-90"
              >
                <Icon name="dashboard" className="text-[18px]" />
                View Dashboard
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold">Describe your situation</h1>
              <span className="text-sm text-on-surface-variant">{saveState}</span>
            </div>
            <div className="bg-white border border-outline-variant rounded-lg overflow-hidden flex flex-col h-[720px]">
              <div className="flex items-center gap-2 bg-surface-container-low px-4 py-3 border-b border-outline-variant text-sm text-secondary font-medium">
                <Icon name="tips_and_updates" className="text-[18px]" />
                AI Co-pilot active
              </div>
              <textarea
                value={contextText}
                onChange={(e) => onChangeText(e.target.value)}
                placeholder={`Paste your business plan, meeting notes, or describe the challenge you're facing. For example: 'We are a boutique coffee roaster looking to expand into subscription services but facing rising logistics costs...'`}
                className="flex-1 p-5 outline-none resize-none text-sm leading-relaxed"
              />
              <div className="flex items-center gap-6 px-5 py-4 border-t border-outline-variant text-sm text-on-surface-variant">
                <button className="flex items-center gap-2 hover:text-on-surface">
                  <Icon name="attach_file" className="text-[18px]" />
                  Upload context
                </button>
                <button className="flex items-center gap-2 hover:text-on-surface">
                  <Icon name="mic" className="text-[18px]" />
                  Voice note
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold">Real-time SWOT</h1>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <Icon name="open_in_full" />
                <Icon name="ios_share" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {QUADRANTS.map((q) => {
                const items = analysis?.quadrants?.[q.key] || [];
                return (
                  <div
                    key={q.key}
                    className="bg-white border border-outline-variant rounded-lg p-5 min-h-[320px] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`${q.bg} rounded-md p-1.5 flex items-center justify-center`}>
                          <Icon name={q.icon} className={`text-[18px] ${q.iconColor}`} />
                        </span>
                        <span className="font-bold text-sm tracking-wide">
                          {q.label.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          q.kind === "Internal"
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {q.kind}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.length === 0 && (
                        <div className="text-sm text-on-surface-variant italic">
                          {generating
                            ? "Analyzing…"
                            : "Add context and generate to populate this quadrant."}
                        </div>
                      )}
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-surface-container-low rounded-md px-3 py-2.5 text-sm"
                        >
                          <Icon name={q.itemIcon} className={`text-[16px] mt-0.5 ${q.iconColor}`} />
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {analysis && session.stage !== "strategy" && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={commit}
                  className="flex items-center gap-2 bg-secondary text-white px-5 py-3 rounded-md font-semibold hover:opacity-90"
                >
                  <Icon name="check_circle" className="text-[18px]" />
                  Commit to Strategy
                </button>
              </div>
            )}
          </div>
        </div>

        <AIAssistPanel
          toolKey="swot"
          frameworkName="SWOT Analysis"
          documentData={analysis ? { contextText, quadrants: analysis.quadrants } : null}
          documentTitle={session.title}
          className="mt-6 max-w-3xl"
        />
      </div>
    </Layout>
  );
}
