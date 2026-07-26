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
  bluf_workshop: {
    route: "bluf-workshop",
    buildData: () => ({ draftText: "", subjectLine: "" }),
  },
  decision_sir: {
    route: "decision-sir",
    buildData: () => ({
      situation: "",
      situationPoints: ["", "", ""],
      financialRiskPerHour: "",
      churnRisk: "Medium",
      opexWasteMonthly: "",
      impactNarrative: "",
      recommendation: "",
      steps: [
        { label: "", phase: "Phase 1" },
        { label: "", phase: "Phase 2" },
      ],
      timeToValueMonths: "",
    }),
  },
  tell_show_tell: {
    route: "tell-show-tell",
    buildData: () => ({
      hook: "",
      agendaPoints: ["", ""],
      evidenceNotes: "",
      checklist: [
        { label: "Clear Objective", hint: "The end goal is explicitly stated.", done: false },
        { label: "Social Proof Attached", hint: "Testimonials or case studies added.", done: false },
        { label: "Interactive Demo Live", hint: "The 'Show' phase is ready for pilot.", done: false },
      ],
      takeaways: ["", "", ""],
      cta: "",
    }),
  },
  initiative_workshop: {
    route: "initiative-workshop",
    buildData: () => ({ what: "", why: "", how: "" }),
  },
  cash_flow_projection: {
    route: "cash-flow-projection",
    buildData: () => ({
      startingBalance: 24500,
      months: [
        { id: "m1", label: "Aug", inflow: 14500, outflow: 11200, forecast: false },
        { id: "m2", label: "Sep", inflow: 12000, outflow: 13400, forecast: false },
        { id: "m3", label: "Oct", inflow: 9000, outflow: 22000, forecast: false },
        { id: "m4", label: "Nov", inflow: 15000, outflow: 10500, forecast: true },
      ],
      lowCashThreshold: 5000,
      paymentDelayDays: 0,
      costIncreasePct: 0,
    }),
  },
  empathy_map: {
    route: "empathy-map",
    buildData: () => ({ personaName: "", says: [], does: [], thinks: [], feels: [], pains: [], gains: [] }),
  },
  jtbd_workshop: {
    route: "jtbd-workshop",
    buildData: () => ({ jobStories: [], functionalJobs: [], emotionalJobs: [], socialJobs: [], opportunities: [] }),
  },
  pl_forecasting: {
    route: "pl-forecasting",
    buildData: () => ({
      revenueLines: [{ id: "r1", label: "SaaS Subscriptions", amount: 42000 }],
      expenseLines: [{ id: "e1", label: "Staffing Costs", amount: 22000 }],
      scenario: "moderate",
      targetMargin: 22,
    }),
  },
  customer_journey: {
    route: "customer-journey",
    buildData: () => ({
      stages: [
        { id: "awareness", name: "Awareness", subtitle: "Problem Recognition", actions: [], feelings: "", touchpoints: [], friction: 20 },
        { id: "consideration", name: "Consideration", subtitle: "Solution Research", actions: [], feelings: "", touchpoints: [], friction: 30 },
        { id: "purchase", name: "Purchase", subtitle: "Decision & Buy-in", actions: [], feelings: "", touchpoints: [], friction: 25 },
        { id: "onboarding", name: "Onboarding", subtitle: "First Value Trip", actions: [], feelings: "", touchpoints: [], friction: 15 },
        { id: "retention", name: "Retention", subtitle: "Loyal Advocate", actions: [], feelings: "", touchpoints: [], friction: 10 },
      ],
    }),
  },
  user_persona: {
    route: "user-persona",
    buildData: () => ({
      name: "",
      role: "",
      ageRange: "",
      location: "",
      keyConcern: "",
      motivations: [],
      dayInLife: [],
      painPoints: [],
      quote: "",
    }),
  },
  equity_management: {
    route: "equity-management",
    buildData: () => ({
      shareholders: [
        { id: "s1", name: "Founder", type: "Common", shares: 5000000 },
      ],
      esopPoolShares: 1000000,
      newRoundShares: 0,
      newRoundHolderName: "New Investor",
    }),
  },
  gtm_strategy: {
    route: "gtm-strategy",
    buildData: () => ({
      funnelStages: [
        { id: "leads", label: "Leads", count: 0 },
        { id: "mql", label: "MQLs", count: 0 },
        { id: "sql", label: "SQLs", count: 0 },
        { id: "opp", label: "Opportunities", count: 0 },
        { id: "closed", label: "Closed Won", count: 0 },
      ],
      checklist: [
        { id: "c1", label: "Define ICP Parameters", status: "pending", progress: 0 },
        { id: "c2", label: "Map Buyer Personas", status: "pending", progress: 0 },
        { id: "c3", label: "Sales Script Iteration", status: "pending", progress: 0 },
      ],
      icps: [],
    }),
  },
  risk_assessment: {
    route: "risk-assessment",
    buildData: () => ({ risks: [] }),
  },
  ice_scoring: {
    route: "ice-scoring",
    buildData: () => ({ initiatives: [] }),
  },
  moscow_prioritization: {
    route: "moscow-prioritization",
    buildData: () => ({ tasks: [] }),
  },
  stakeholder_mapping: {
    route: "stakeholder-mapping",
    buildData: () => ({ stakeholders: [] }),
  },
  balanced_scorecard: {
    route: "balanced-scorecard",
    buildData: () => ({
      perspectives: [
        {
          id: "financial",
          name: "Financial",
          icon: "payments",
          kpis: [
            { id: "k1", label: "Revenue Growth", current: 0, target: 0, unit: "$M" },
            { id: "k2", label: "Net Profit Margin", current: 0, target: 0, unit: "%" },
          ],
        },
        {
          id: "customer",
          name: "Customer",
          icon: "group",
          kpis: [
            { id: "k3", label: "Net Promoter Score", current: 0, target: 0, unit: "" },
            { id: "k4", label: "Customer Retention Rate", current: 0, target: 0, unit: "%" },
          ],
        },
        {
          id: "internal_process",
          name: "Internal Process",
          icon: "settings_suggest",
          kpis: [{ id: "k5", label: "Cycle Time", current: 0, target: 0, unit: "d", lowerIsBetter: true }],
        },
        {
          id: "learning_growth",
          name: "Learning & Growth",
          icon: "psychology",
          kpis: [{ id: "k6", label: "Talent Retention Rate", current: 0, target: 0, unit: "%" }],
        },
      ],
    }),
  },
  content_calendar: {
    route: "content-calendar",
    buildData: () => ({ objectives: [], items: [] }),
  },
  mckinsey_7s: {
    route: "mckinsey-7s",
    buildData: () => ({
      elements: [
        { key: "strategy", assessment: "", complete: false },
        { key: "structure", assessment: "", complete: false },
        { key: "systems", assessment: "", complete: false },
        { key: "shared_values", assessment: "", complete: false },
        { key: "style", assessment: "", complete: false },
        { key: "staff", assessment: "", complete: false },
        { key: "skills", assessment: "", complete: false },
      ],
    }),
  },
  social_media_strategy: {
    route: "social-media-strategy",
    buildData: () => ({ channels: [], pillars: [], voiceBalance: 50, postingFrequency: 1, videoRatio: 0, communityReplies: "low" }),
  },
  customer_health_scorecard: {
    route: "customer-health-scorecard",
    buildData: () => ({ accounts: [], renewals: [], expansions: [] }),
  },
  onboarding_roadmap: {
    route: "onboarding-roadmap",
    buildData: () => ({ employeeName: "", phases: [], contacts: [] }),
  },
  hiring_scorecard: {
    route: "hiring-scorecard",
    buildData: () => ({
      candidateName: "",
      roleName: "",
      criteria: [
        { id: "c1", label: "Technical Skills", weight: 40, rating: 3 },
        { id: "c2", label: "Cultural Fit", weight: 30, rating: 3 },
        { id: "c3", label: "Relevant Experience", weight: 30, rating: 3 },
      ],
      interviewers: [],
      notes: "",
      recommendation: "hire",
    }),
  },
  lead_management: {
    route: "lead-management",
    buildData: () => ({ leads: [] }),
  },
  pricing_packaging: {
    route: "pricing-packaging",
    buildData: () => ({
      tiers: [
        { id: "seed", name: "Seed", price: 0, users: 0 },
        { id: "pro", name: "Pro", price: 0, users: 0 },
        { id: "enterprise", name: "Enterprise", price: 0, users: 0 },
      ],
      competitors: [],
      featureList: [],
      ourFeatures: {},
    }),
  },
  recruitment_funnel: {
    route: "recruitment-funnel",
    buildData: () => ({
      stages: [
        { id: "applied", label: "Applied", count: 0 },
        { id: "screened", label: "Screened", count: 0 },
        { id: "interviewed", label: "Interviewed", count: 0 },
        { id: "offered", label: "Offered", count: 0 },
        { id: "hired", label: "Hired", count: 0 },
      ],
      sources: [],
      timeToHireDays: 0,
    }),
  },
  sales_pipeline: {
    route: "sales-pipeline",
    buildData: () => ({ deals: [] }),
  },
  team_capacity_heatmap: {
    route: "team-capacity-heatmap",
    buildData: () => ({ weeks: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], departments: [], openHeadcount: 0, projectedGapRoles: 0 }),
  },
  compliance_hub: {
    route: "compliance-hub",
    buildData: () => ({ frameworks: [], documents: [], deadlines: [] }),
  },
  product_analytics: {
    route: "product-analytics",
    buildData: () => ({
      northStar: { label: "", current: 0, target: 0 },
      dailyActive: [
        { day: "Mon", pct: 0 }, { day: "Tue", pct: 0 }, { day: "Wed", pct: 0 },
        { day: "Thu", pct: 0 }, { day: "Fri", pct: 0 }, { day: "Sat", pct: 0 }, { day: "Sun", pct: 0 },
      ],
      cohorts: [],
      features: [],
    }),
  },
  innovation_sandbox: {
    route: "innovation-sandbox",
    buildData: () => ({
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
    }),
  },
  investor_relations: {
    route: "investor-relations",
    buildData: () => ({
      runwayMonths: 18.4,
      capTable: [
        { id: "c1", holder: "Founders", pct: 52.4 },
        { id: "c2", holder: "Lead Investors", pct: 28.1 },
        { id: "c3", holder: "Angel Syndicate", pct: 11.5 },
        { id: "c4", holder: "ESOP Pool", pct: 8.0 },
      ],
      updateSections: [
        { id: "u1", name: "Executive Summary", note: "Auto-generated from high-level milestones", done: true },
        { id: "u2", name: "Key Metrics & KPIs", note: "Active users, MRR, Churn (synced)", done: true },
        { id: "u3", name: "The Ask", note: "Where you need investor help", done: false },
      ],
      documents: [
        { id: "d1", name: "Series A Term Sheet", type: "pdf" },
        { id: "d2", name: "Articles of Incorporation", type: "doc" },
        { id: "d3", name: "Q3 Board Deck - Final", type: "slides" },
        { id: "d4", name: "Consolidated Financials FY24", type: "sheet" },
      ],
      activity: [
        { id: "a1", name: "Sarah Chen", org: "Blue Chip Ventures", action: "Accessed Vault: Series A Deck", date: "Oct 12, 2026", status: "Verified" },
        { id: "a2", name: "Marcus Bloom", org: "Bloom Angels", action: "Signed: Consent for Board Action", date: "Oct 10, 2026", status: "Signed" },
      ],
    }),
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
