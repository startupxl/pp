import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const QUADRANTS = [
  { key: "strengths", label: "Strengths", icon: "trending_up", color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "weaknesses", label: "Weaknesses", icon: "close", color: "text-red-600", bg: "bg-red-50" },
  { key: "opportunities", label: "Opportunities", icon: "lightbulb", color: "text-amber-600", bg: "bg-amber-50" },
  { key: "threats", label: "Threats", icon: "shield", color: "text-slate-600", bg: "bg-slate-100" },
];

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    api.getSession(id).then((s) => {
      setSession(s);
      setAnalysis(s.analysis);
    });
  }, [id]);

  if (!session) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading dashboard…</div>
      </Layout>
    );
  }

  if (!analysis) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-8 py-16 text-center">
          <h1 className="text-2xl font-bold mb-3">No analysis yet</h1>
          <p className="text-on-surface-variant mb-6">
            Generate a SWOT analysis in the workshop before viewing the strategic dashboard.
          </p>
          <button
            onClick={() => navigate(`/workshop/${id}`)}
            className="bg-primary text-white px-5 py-3 rounded-md font-semibold"
          >
            Go to Workshop
          </button>
        </div>
      </Layout>
    );
  }

  const { metrics, insights, executiveSummary } = analysis;

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-10">
        <div className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
          <button onClick={() => navigate("/")} className="hover:underline">
            Dashboard
          </button>
          <Icon name="chevron_right" className="text-[16px]" />
          <span>Live Analysis Preview</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Strategic Dashboard: {session.title}
            </h1>
            <p className="text-on-surface-variant mt-1">
              Comprehensive intelligence report generated from your workshop session.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 border border-outline-variant rounded-md px-4 py-2.5 text-sm font-semibold bg-white">
              <Icon name="picture_as_pdf" className="text-[18px]" />
              Export PDF
            </button>
            <button className="flex items-center gap-2 border border-outline-variant rounded-md px-4 py-2.5 text-sm font-semibold bg-white">
              <Icon name="share" className="text-[18px]" />
              Share
            </button>
            <button className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2.5 text-sm font-semibold">
              <Icon name="verified" className="text-[18px]" />
              Committed
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">SWOT Quadrants</h2>
              <span className="text-xs font-semibold bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
                Updated just now
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {QUADRANTS.map((q) => (
                <div
                  key={q.key}
                  className="bg-white border border-outline-variant rounded-lg p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`${q.bg} rounded-md p-1.5 flex items-center justify-center`}>
                        <Icon name={q.icon} className={`text-[18px] ${q.color}`} />
                      </span>
                      <span className="font-bold text-sm tracking-wide">
                        {q.label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {analysis.quadrants[q.key].map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-on-surface-variant">•</span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-white border border-outline-variant rounded-lg p-6 grid grid-cols-3 gap-6 mb-8">
              <Metric label="MARKET VIABILITY" value={`${metrics.marketViability}%`} tag={metrics.marketViability > 70 ? "High" : "Moderate"} tagColor="text-emerald-600" barPct={metrics.marketViability} barColor="bg-emerald-500" />
              <Metric label="RISK INDEX" value={`${metrics.riskIndex}%`} tag={metrics.riskIndex < 20 ? "Negligible" : "Moderate"} tagColor="text-red-500" barPct={metrics.riskIndex} barColor="bg-red-500" />
              <Metric label="ROI PROJECTION" value={metrics.roi} tag="18 mo." tagColor="text-on-surface-variant" barPct={70} barColor="bg-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-outline-variant rounded-lg p-5">
                <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-2">
                  <Icon name="schedule" className="text-[18px]" />
                  Timeline Integrity
                </div>
                <div className="text-3xl font-bold mb-1">{metrics.timelineIntegrity}%</div>
                <div className="text-sm text-emerald-600 font-medium">Ahead of Schedule</div>
              </div>
              <div className="bg-white border-2 border-secondary rounded-lg p-5">
                <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-2">
                  <Icon name="account_balance_wallet" className="text-[18px]" />
                  Burn Rate Optimization
                </div>
                <div className="text-3xl font-bold mb-1">{metrics.burnRateOptimization}%</div>
                <div className="text-sm text-emerald-600 font-medium">Under Budget Projection</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold">AI Strategic Insights</h2>
              <Icon name="auto_awesome" className="text-secondary text-[18px]" />
            </div>
            <div className="flex flex-col gap-4 mb-4">
              {insights.map((insight, idx) => (
                <div key={idx} className="bg-white border border-outline-variant rounded-lg p-5">
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    <Icon name={insight.icon} className="text-secondary text-[18px]" />
                    {insight.title}
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3">{insight.body}</p>
                  <div className="flex gap-2 flex-wrap">
                    {insight.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-semibold bg-surface-container-high text-on-surface-variant px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full border border-dashed border-outline-variant rounded-lg py-3 text-sm font-semibold text-on-surface-variant flex items-center justify-center gap-2 mb-6 bg-white">
              <Icon name="add" className="text-[18px]" />
              Generate More Insights
            </button>

            <div className="bg-primary text-white rounded-lg p-6">
              <div className="text-xs font-semibold tracking-wide text-white/60 mb-3">
                EXECUTIVE SUMMARY
              </div>
              <p className="italic text-white/90 mb-6">"{executiveSummary}"</p>
              <div className="flex items-center gap-3 border-t border-white/20 pt-4">
                <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-semibold text-sm">
                  AR
                </div>
                <div>
                  <div className="font-semibold text-sm">Alex Rivera</div>
                  <div className="text-xs text-white/60">Chief Strategy Officer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Metric({ label, value, tag, tagColor, barPct, barColor }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-wide text-on-surface-variant mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold">{value}</span>
        <span className={`text-sm font-medium ${tagColor}`}>{tag}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${Math.min(100, barPct)}%` }}
        />
      </div>
    </div>
  );
}
