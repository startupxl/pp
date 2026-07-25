import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";
import { startFrameworkSession } from "../startTool";

const DOCUMENT_TYPES = [
  { type: "issue_tree", route: "issue-tree", label: "Issue Tree" },
  { type: "mece", route: "mece", label: "MECE Workspace" },
  { type: "pyramid", route: "pyramid", label: "Pyramid" },
  { type: "scqa", route: "scqa", label: "SCQA" },
  { type: "logic_tree", route: "logic-tree", label: "Logic Tree" },
  { type: "systems_thinking", route: "systems-thinking", label: "Systems Thinking" },
  { type: "first_principles", route: "first-principles", label: "First Principles" },
  { type: "hypothesis", route: "hypothesis", label: "Hypothesis Workspace" },
  { type: "ge_mckinsey", route: "ge-mckinsey", label: "GE McKinsey Matrix" },
  { type: "three_horizons", route: "three-horizons", label: "Three Horizons" },
  { type: "porter", route: "porter", label: "Porter's Generic Strategies" },
  { type: "strategic_cascade", route: "strategic-cascade", label: "Strategic Choice Cascade" },
  { type: "core_competency", route: "core-competency", label: "Core Competency Auditor" },
  { type: "lean_canvas", route: "lean-canvas", label: "Lean Canvas Workshop" },
  { type: "vrio", route: "vrio", label: "VRIO Analysis Workshop" },
  { type: "okr", route: "okr", label: "OKR Workshop" },
  { type: "product_roadmap", route: "product-roadmap", label: "Product Roadmap Workshop" },
  { type: "project_charter", route: "project-charter", label: "Project Charter Workshop" },
  { type: "raci", route: "raci", label: "RACI Matrix Workshop" },
  { type: "retrospective", route: "retrospective", label: "Retrospective Workshop" },
  { type: "sprint_planning", route: "sprint-planning", label: "Sprint Planning Workshop" },
  { type: "critical_path", route: "critical-path", label: "Critical Path Analysis Workshop" },
  { type: "project_workspace", route: "project-workspace", label: "Project Workspace" },
  { type: "burn_rate", route: "burn-rate", label: "Burn Rate & Runway" },
  { type: "capacity_planning", route: "capacity-planning", label: "Capacity Planning" },
  { type: "skill_matrix", route: "skill-matrix", label: "Skill Matrix Workshop" },
  { type: "unit_economics", route: "unit-economics", label: "Unit Economics Workshop" },
  { type: "three_sixty_feedback", route: "360-feedback", label: "360-Degree Feedback Workshop" },
  { type: "competitive_benchmarking", route: "competitive-benchmarking", label: "Competitive Benchmarking" },
  { type: "market_sizing", route: "market-sizing", label: "Market Sizing Workshop" },
  { type: "performance_review", route: "performance-review", label: "Performance Review" },
  { type: "communication_audit", route: "communication-audit", label: "Communication Audit Dashboard" },
  { type: "prep_framework", route: "prep-framework", label: "PREP Framework Workspace" },
  { type: "star_framework", route: "star-framework", label: "STAR Framework Workspace" },
  { type: "bluf_workshop", route: "bluf-workshop", label: "BLUF Workshop" },
  { type: "decision_sir", route: "decision-sir", label: "Executive Decision SIR" },
  { type: "tell_show_tell", route: "tell-show-tell", label: "Tell → Show → Tell Workshop" },
  { type: "initiative_workshop", route: "initiative-workshop", label: "Initiative Workshop" },
  { type: "cash_flow_projection", route: "cash-flow-projection", label: "Cash Flow Projection" },
  { type: "empathy_map", route: "empathy-map", label: "Empathy Map Workshop" },
  { type: "jtbd_workshop", route: "jtbd-workshop", label: "JTBD Workshop" },
  { type: "pl_forecasting", route: "pl-forecasting", label: "P&L Forecasting" },
  { type: "customer_journey", route: "customer-journey", label: "Customer Journey Workspace" },
  { type: "user_persona", route: "user-persona", label: "User Persona Workshop" },
  { type: "equity_management", route: "equity-management", label: "Equity & Cap Table" },
  { type: "gtm_strategy", route: "gtm-strategy", label: "GTM Strategy Workspace" },
  { type: "risk_assessment", route: "risk-assessment", label: "Strategic Risk Workspace" },
  { type: "ice_scoring", route: "ice-scoring", label: "ICE Scoring Workshop" },
  { type: "moscow_prioritization", route: "moscow-prioritization", label: "MoSCoW Prioritization Workshop" },
  { type: "stakeholder_mapping", route: "stakeholder-mapping", label: "Stakeholder Mapping" },
];

export default function Home() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getGoals(),
      api.getFrameworks(),
      api.getSessions(),
      ...DOCUMENT_TYPES.map((t) => api.listDocuments(t.type)),
    ])
      .then(([g, f, s, ...docLists]) => {
        setGoals(g.goals);
        setFrameworks(f.frameworks);
        setSessions(s.sessions);
        const merged = docLists.flatMap((res, i) =>
          res.documents.map((d) => ({ ...d, docType: DOCUMENT_TYPES[i] }))
        );
        setDocuments(merged);
      })
      .finally(() => setLoading(false));
  }, []);

  const featured = frameworks.find((f) => f.featured) || frameworks[0];
  const others = frameworks.filter((f) => f !== featured).slice(0, 2);

  async function startNewSession(frameworkId) {
    const framework = frameworks.find((f) => f.id === frameworkId) || featured;
    await startFrameworkSession(navigate, framework);
  }

  const recentWork = [
    ...sessions.map((s) => ({
      kind: "session",
      id: s.id,
      title: s.title,
      subtitle: s.contextText || "No context added yet.",
      tag: s.stage,
      committed: s.committed,
      route: `/workshop/${s.id}`,
      updatedAt: s.updatedAt,
    })),
    ...documents.map((d) => ({
      kind: "document",
      id: d.id,
      title: d.title,
      subtitle: d.docType.label,
      tag: d.docType.label,
      committed: false,
      route: `/${d.docType.route}/${d.id}`,
      updatedAt: d.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-10">
        <div className="flex items-center justify-between gap-6 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Framework Selector</h1>
            <p className="text-on-surface-variant mt-1">
              Strategize your next move with cognitive precision.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-md px-4 py-2.5 w-72">
              <Icon name="search" className="text-outline text-[20px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search frameworks or projects..."
                className="outline-none text-sm w-full bg-transparent"
              />
            </div>
            <button
              onClick={() => startNewSession()}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:opacity-90"
            >
              <Icon name="add" className="text-[18px]" />
              New Session
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">What is your goal?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => startNewSession(goal.frameworkId)}
              className="text-left bg-white border border-outline-variant rounded-lg p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-md bg-secondary-container flex items-center justify-center mb-4">
                <Icon name={goal.icon} className="text-secondary text-[20px]" />
              </div>
              <div className="font-semibold mb-1">{goal.title}</div>
              <div className="text-sm text-on-surface-variant">{goal.description}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Featured Frameworks</h2>
          <button
            onClick={() => navigate("/library")}
            className="text-secondary text-sm font-semibold hover:underline"
          >
            Explore all {frameworks.length ? `${frameworks.length}+` : ""} frameworks
          </button>
        </div>

        {!loading && featured && (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            <div className="relative rounded-xl overflow-hidden min-h-[420px] flex flex-col justify-end p-8 text-white bg-gradient-to-br from-primary-container via-primary to-tertiary">
              <span className="absolute top-8 left-8 bg-secondary-container/90 text-on-secondary-container text-xs font-semibold px-3 py-1 rounded-full">
                {featured.tag}
              </span>
              <h3 className="text-4xl font-extrabold mb-3">{featured.name}</h3>
              <p className="max-w-lg text-white/85 mb-6">{featured.description}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startNewSession(featured.id)}
                  className="bg-white text-primary font-semibold px-5 py-2.5 rounded-md hover:opacity-90"
                >
                  Start Session
                </button>
                <button className="border border-white/60 text-white font-semibold px-5 py-2.5 rounded-md hover:bg-white/10">
                  Learn More
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {others.map((f) => (
                <button
                  key={f.id}
                  onClick={() => startNewSession(f.id)}
                  className="text-left bg-white border border-outline-variant rounded-lg p-5 flex-1 flex flex-col hover:shadow-md transition-all"
                >
                  <span className="text-secondary text-xs font-semibold uppercase tracking-wide mb-2">
                    {f.category}
                  </span>
                  <div className="font-bold text-lg mb-1">{f.name}</div>
                  <p className="text-sm text-on-surface-variant line-clamp-2">
                    {f.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="text-xl font-bold">Recent Work</h2>
        </div>
        {recentWork.length === 0 ? (
          <div className="bg-white border border-dashed border-outline-variant rounded-lg p-10 text-center text-on-surface-variant">
            No sessions yet — start one above to see it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentWork.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => navigate(item.route)}
                className="text-left bg-white border border-outline-variant rounded-lg p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-secondary">
                    {item.tag}
                  </span>
                  {item.committed && (
                    <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                      Committed
                    </span>
                  )}
                </div>
                <div className="font-semibold mb-1">{item.title}</div>
                <div className="text-sm text-on-surface-variant line-clamp-2">
                  {item.subtitle}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
