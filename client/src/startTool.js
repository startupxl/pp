import { api } from "./api";

const ROOT_NODE = (text) => ({
  id: "root",
  text,
  x: 40,
  y: 260,
  parentId: null,
});

const TOOL_CONFIG = {
  swot: null, // handled separately via api.createSession (pre-existing flow)
  issue_tree: {
    route: "issue-tree",
    buildData: () => ({ nodes: [ROOT_NODE("How can we increase operating margin by 15%?")] }),
  },
  mece: {
    route: "mece",
    buildData: () => ({ nodes: [ROOT_NODE("What is the core problem we're decomposing?")] }),
  },
  pyramid: {
    route: "pyramid",
    buildData: () => ({}), // Pyramid page fills in sensible defaults itself
  },
  scqa: {
    route: "scqa",
    buildData: () => ({}), // SCQA page fills in sensible defaults itself
  },
  logic_tree: {
    route: "logic-tree",
    buildData: () => ({
      mode: "symptom",
      nodes: [ROOT_NODE("What is the primary obstacle to user conversion?")],
    }),
  },
  systems_thinking: {
    route: "systems-thinking",
    buildData: () => ({
      nodes: [
        { id: "n1", kind: "stock", label: "Market Demand", x: 120, y: 100 },
        { id: "n2", kind: "flow", label: "Production Rate", x: 480, y: 100 },
      ],
      edges: [],
      leveragePoints: [],
    }),
  },
  first_principles: {
    route: "first-principles",
    buildData: () => ({ assumptions: [], truths: [], solution: {} }),
  },
  hypothesis: {
    route: "hypothesis",
    buildData: () => ({
      hypothesis: "",
      stage: "in-validation",
      assumptions: [],
      testDesign: {},
      successCriteria: {},
      evidence: [],
    }),
  },
  ge_mckinsey: {
    route: "ge-mckinsey",
    buildData: () => ({
      bubbles: [{ id: "b1", name: "Core Product", revenue: 1000, x: 25, y: 25 }],
    }),
  },
  three_horizons: {
    route: "three-horizons",
    buildData: () => ({ initiatives: [] }),
  },
  porter: {
    route: "porter",
    buildData: () => ({ quadrants: {}, competitors: [] }),
  },
  strategic_cascade: {
    route: "strategic-cascade",
    buildData: () => ({ steps: {} }),
  },
  core_competency: {
    route: "core-competency",
    buildData: () => ({ competencies: [], notes: "", tags: [] }),
  },
  lean_canvas: {
    route: "lean-canvas",
    buildData: () => ({}), // Lean Canvas page fills in sensible defaults itself
  },
  vrio: {
    route: "vrio",
    buildData: () => ({ resources: [] }),
  },
  okr: {
    route: "okr",
    buildData: () => ({ objective: "", keyResults: [] }),
  },
  product_roadmap: {
    route: "product-roadmap",
    buildData: () => ({
      quarters: [
        { id: "q1", label: "Q1: Foundation", milestones: [] },
        { id: "q2", label: "Q2: Scaling", milestones: [] },
        { id: "q3", label: "Q3: Ecosystem", milestones: [] },
        { id: "q4", label: "Q4: Intelligence", milestones: [] },
      ],
    }),
  },
  project_charter: {
    route: "project-charter",
    buildData: () => ({
      purpose: "",
      objectives: [],
      milestones: [],
      successCriteria: [],
      risks: [],
      requirements: [],
    }),
  },
  raci: {
    route: "raci",
    buildData: () => ({ people: [], tasks: [] }),
  },
  retrospective: {
    route: "retrospective",
    buildData: () => ({ columns: { start: [], stop: [], continue: [] }, actionItems: [] }),
  },
  sprint_planning: {
    route: "sprint-planning",
    buildData: () => ({ sprintGoal: "", capacity: 60, backlog: [], sprint: [] }),
  },
  critical_path: {
    route: "critical-path",
    buildData: () => ({ tasks: [] }),
  },
  project_workspace: {
    route: "project-workspace",
    buildData: () => ({ tasks: [] }),
  },
  burn_rate: {
    route: "burn-rate",
    buildData: () => ({ cashBalance: 0, monthlyRevenue: 0, fixedCosts: [], variableCosts: [] }),
  },
  capacity_planning: {
    route: "capacity-planning",
    buildData: () => ({ members: [], projects: [] }),
  },
  skill_matrix: {
    route: "skill-matrix",
    buildData: () => ({ skills: ["Coding", "Design", "Strategy", "Ops", "Growth", "Data"], members: [] }),
  },
  unit_economics: {
    route: "unit-economics",
    buildData: () => ({ aov: 0, churnPct: 0, monthlySpend: 0, newCustomers: 0 }),
  },
  three_sixty_feedback: {
    route: "360-feedback",
    buildData: () => ({
      competencies: [
        { id: "c1", name: "Strategic Vision", score: 3.5 },
        { id: "c2", name: "Operational Excellence", score: 3.5 },
        { id: "c3", name: "Emotional Intelligence", score: 3.5 },
        { id: "c4", name: "Team Development", score: 3.5 },
      ],
      johari: { open: [], blind: [], hidden: [] },
      keepDoing: [],
      startDoing: [],
    }),
  },
  competitive_benchmarking: {
    route: "competitive-benchmarking",
    buildData: () => ({
      us: "Us",
      competitors: [{ id: "comp1", name: "Competitor A" }],
      axes: [
        { id: "pricing", label: "Pricing" },
        { id: "speed", label: "Speed" },
        { id: "depth", label: "Depth" },
        { id: "security", label: "Security" },
        { id: "support", label: "Support" },
        { id: "ux", label: "UX" },
      ],
      scores: {},
      features: [],
    }),
  },
  market_sizing: {
    route: "market-sizing",
    buildData: () => ({ tam: 0, sam: 0, som: 0, notes: "" }),
  },
  performance_review: {
    route: "performance-review",
    buildData: () => ({
      employeeName: "",
      role: "",
      reviewCycle: "",
      manager: "",
      competencies: [
        { id: "execution", name: "Execution", rating: 3, notes: "" },
        { id: "culture", name: "Culture", rating: 3, notes: "" },
        { id: "strategy", name: "Strategy", rating: 3, notes: "" },
        { id: "growth", name: "Growth", rating: 3, notes: "" },
      ],
      okrs: [],
      developmentGoals: [],
      strengths: "",
      improvements: "",
      managerNotes: "",
    }),
  },
  communication_audit: {
    route: "communication-audit",
    buildData: () => ({ scores: { clarity: 50, tone: 50, conciseness: 50 }, redundantTerms: [], rewrites: [] }),
  },
  prep_framework: {
    route: "prep-framework",
    buildData: () => ({ point: "", reason: "", example: "", reinforcePoint: "" }),
  },
  star_framework: {
    route: "star-framework",
    buildData: () => ({ situation: "", task: "", action: "", result: "" }),
  },
};

/**
 * Starts a new session/document for the given framework and navigates to the
 * right workspace. Falls back to the SWOT workshop for frameworks without a
 * dedicated tool (or without a `tool` field at all).
 */
export async function startFrameworkSession(navigate, framework) {
  const tool = framework?.tool;

  if (!tool || tool === "swot") {
    const session = await api.createSession({
      title: `${framework?.name || "Untitled"} Session`,
      frameworkId: framework?.id || 1,
      contextText: "",
    });
    navigate(`/workshop/${session.id}`);
    return;
  }

  const config = TOOL_CONFIG[tool];
  if (!config) {
    // Unknown tool key — safest fallback is the SWOT workshop so nothing dead-ends.
    const session = await api.createSession({
      title: `${framework?.name || "Untitled"} Session`,
      frameworkId: framework?.id || 1,
      contextText: "",
    });
    navigate(`/workshop/${session.id}`);
    return;
  }

  const doc = await api.createDocument({
    type: tool,
    title: `${framework.name} Draft`,
    data: config.buildData(),
  });
  navigate(`/${config.route}/${doc.id}`);
}
