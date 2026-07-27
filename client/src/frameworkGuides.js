// Short, plain-language guidance for every framework: what it is, when to reach
// for it, and how to fill it out. Surfaced on the Library and Home recommendation
// cards to help people navigate 70+ frameworks without guessing.
export const FRAMEWORK_GUIDES = {
  "swot": {
    "name": "SWOT Analysis",
    "whatItIs": "Master your environment by identifying Strengths, Weaknesses, Opportunities, and Threats. The foundational tool for every high-stakes decision.",
    "whenToUse": "You need a fast, shared-language snapshot of your position before going deeper into strategy work.",
    "howTo": "List real, specific items in each quadrant. Vague entries like \"good team\" produce a weak analysis. Aim for at least 3 per quadrant."
  },
  "first_principles": {
    "name": "First Principles",
    "whatItIs": "Breaking down complex problems into basic elements and then reassembling them from the ground up.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "hero_journey": {
    "name": "The Hero's Journey",
    "whatItIs": "A structural framework for storytelling used to create compelling brand narratives and product visions.",
    "whenToUse": "You are building a founder story, product narrative, or keynote and need it to actually move people.",
    "howTo": "Fill in stages in order. Even short, honest answers work better than skipping ahead to the ending."
  },
  "cynefin_framework": {
    "name": "Cynefin Framework",
    "whatItIs": "A decision-making tool used to help managers, policy-makers and others identify how they perceive situations and make sense of their own and other people's behavior.",
    "whenToUse": "You are not sure whether a situation calls for best practice, expert analysis, experimentation, or immediate action.",
    "howTo": "Sort each situation into a domain honestly based on how well understood its cause and effect really are, not how you wish it worked."
  },
  "five_whys": {
    "name": "5 Whys",
    "whatItIs": "An iterative interrogative technique used to explore the cause-and-effect relationships underlying a problem.",
    "whenToUse": "Something broke or underperformed and you want the real cause, not the first plausible excuse.",
    "howTo": "Answer each \"why\" using the previous answer as the new question. Stop when the answer points to something you can actually change."
  },
  "star_framework": {
    "name": "STAR Framework Workspace",
    "whatItIs": "Turn an accomplishment into a Situation, Task, Action, Result story with a computed impact score from your metrics and verbs.",
    "whenToUse": "You have one shot to land a message clearly, especially with a busy or skeptical audience.",
    "howTo": "Write it the way you would actually say it out loud, then trim anything that is not essential."
  },
  "pyramid": {
    "name": "Minto Pyramid",
    "whatItIs": "The gold standard for top-down logic and effective executive communication.",
    "whenToUse": "You need to turn scattered facts into a story someone will remember and act on.",
    "howTo": "Draft each section in order. The structure does the persuading, so resist the urge to skip ahead."
  },
  "eisenhower_matrix": {
    "name": "Eisenhower Matrix",
    "whatItIs": "Prioritize what matters by sorting tasks along urgency and importance.",
    "whenToUse": "Your to-do list is full and you cannot tell what actually deserves your attention today.",
    "howTo": "Mark each task urgent and/or important honestly. Most task lists are wrong because everything gets marked urgent by default."
  },
  "porter_five_forces": {
    "name": "Porter's Five Forces",
    "whatItIs": "Analyze the competitive intensity and attractiveness of an industry.",
    "whenToUse": "You are evaluating whether an industry or market is structurally attractive to compete in.",
    "howTo": "Rate each of the five forces on how much pressure it puts on profitability, and note the specific evidence behind each rating."
  },
  "okr": {
    "name": "OKR Workshop",
    "whatItIs": "Set an ambitious objective and track measurable key results with live confidence and progress tracking.",
    "whenToUse": "You need every team pointed at the same outcome for a quarter, not just a list of projects.",
    "howTo": "Write one ambitious, qualitative objective, then 2-4 measurable key results that would prove you hit it. Avoid restating tasks as key results."
  },
  "issue_tree": {
    "name": "Issue Tree Builder",
    "whatItIs": "Break a root question into mutually exclusive, collectively exhaustive branches on a pannable, zoomable canvas.",
    "whenToUse": "A root question is too big to answer directly and you need to see all its sub-questions at once.",
    "howTo": "Start with the root question at the top, then keep splitting each branch into mutually exclusive, collectively exhaustive sub-branches until each leaf is answerable on its own."
  },
  "mece": {
    "name": "MECE Workspace",
    "whatItIs": "Decompose a core problem into categories with live overlap and gap auditing, so nothing is double-counted or missed.",
    "whenToUse": "A problem feels tangled and you need to break it into pieces you can actually act on.",
    "howTo": "Work top-down: state the problem precisely first, then break it into smaller, mutually exclusive pieces."
  },
  "scqa": {
    "name": "SCQA Storytelling",
    "whatItIs": "Structure a tight pitch narrative — Situation, Complication, Question, Answer — with a live preview as you write.",
    "whenToUse": "You need to open a document, email, or pitch in a way that immediately earns attention.",
    "howTo": "Write the Situation the reader already agrees with, the Complication that disrupts it, the Question it raises, and the Answer you are proposing, in that order."
  },
  "logic_tree": {
    "name": "Logic Tree Workshop",
    "whatItIs": "Diagnose symptoms or stress-test decisions on a branching canvas with live path-coverage and logic-fallacy scanning.",
    "whenToUse": "A problem feels tangled and you need to break it into pieces you can actually act on.",
    "howTo": "Work top-down: state the problem precisely first, then break it into smaller, mutually exclusive pieces."
  },
  "systems_thinking": {
    "name": "Systems Thinking Workspace",
    "whatItIs": "Map stocks, flows, and reinforcing/balancing feedback loops, then let the Delay/Feedback Analyzer surface leverage points.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "hypothesis": {
    "name": "Hypothesis-Driven Thinking",
    "whatItIs": "Turn a business assumption into a testable hypothesis, design the test, and track confidence as evidence comes in.",
    "whenToUse": "You have an idea you believe is true but have not validated it, and the cost of being wrong is high enough to test first.",
    "howTo": "State the hypothesis as a falsifiable claim, list the assumptions it depends on, design a test for each, and log evidence as it comes in."
  },
  "ge_mckinsey": {
    "name": "GE McKinsey Matrix",
    "whatItIs": "Plot business units on a 3x3 industry attractiveness vs. competitive strength grid to guide invest, hold, or divest decisions.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "three_horizons": {
    "name": "Three Horizons Framework",
    "whatItIs": "Balance current-core, emerging, and future-option initiatives on a value-vs-time map with target allocation tracking.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "porter": {
    "name": "Porter's Generic Strategies",
    "whatItIs": "Define your strategic scope and advantage — Cost Leadership, Differentiation, or a Focused variant — and benchmark competitors.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "strategic_cascade": {
    "name": "Strategic Choice Cascade",
    "whatItIs": "Work through Lafley & Martin's five cascading strategy choices, from Winning Aspiration down to Management Systems.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "core_competency": {
    "name": "Core Competency Auditor",
    "whatItIs": "Audit your capabilities against the Valuable, Unique, and Extendable test to find your true competitive moat.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "lean_canvas": {
    "name": "Lean Canvas Workshop",
    "whatItIs": "Sketch your business model across all nine Lean Canvas blocks, from Problem and Solution to Cost Structure and Revenue Streams.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "vrio": {
    "name": "VRIO Analysis Workshop",
    "whatItIs": "Test resources against Valuable, Rare, Inimitable, and Organized hurdles to determine sustained competitive advantage.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "product_roadmap": {
    "name": "Product Roadmap Workshop",
    "whatItIs": "Plan milestones across a four-quarter horizon with category tags, progress tracking, and roadmap health insights.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "project_charter": {
    "name": "Project Charter Workshop",
    "whatItIs": "Define purpose, measurable objectives, milestones, success criteria, risks, and requirements for a new initiative.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "raci": {
    "name": "RACI Matrix Workshop",
    "whatItIs": "Clarify who is Responsible, Accountable, Consulted, and Informed across your cross-functional team.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "retrospective": {
    "name": "Retrospective Workshop",
    "whatItIs": "Run a Start, Stop, Continue retrospective with sticky-note voting and a shared action item checklist.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "sprint_planning": {
    "name": "Sprint Planning Workshop",
    "whatItIs": "Move stories from the product backlog into the sprint backlog with live capacity utilization and sprint health.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "critical_path": {
    "name": "Critical Path Analysis Workshop",
    "whatItIs": "Compute the true critical path from task durations and dependencies using forward/backward pass CPM analysis.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "project_workspace": {
    "name": "Project Workspace",
    "whatItIs": "Plan tasks and milestones on a proportional Gantt timeline computed from start dates, durations, and progress.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "burn_rate": {
    "name": "Burn Rate & Runway",
    "whatItIs": "Model cash balance, revenue, and cost line items to compute net burn, runway, and an optimization opportunity.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "capacity_planning": {
    "name": "Capacity Planning",
    "whatItIs": "Track team allocation against capacity to spot over-allocation and get rebalancing suggestions.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "skill_matrix": {
    "name": "Skill Matrix Workshop",
    "whatItIs": "Map team proficiency across key skills to surface gaps and single-point-of-failure risks.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "unit_economics": {
    "name": "Unit Economics Workshop",
    "whatItIs": "Calculate LTV, CAC, and the LTV/CAC efficiency ratio with a live payback period projection.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "three_sixty_feedback": {
    "name": "360-Degree Feedback Workshop",
    "whatItIs": "Map self vs. external perception with a Johari Window, rate core competencies, and capture keep-doing / start-doing feedback themes.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "competitive_benchmarking": {
    "name": "Competitive Benchmarking",
    "whatItIs": "Score yourself against named competitors across strategic axes and track feature-by-feature parity and gaps.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "market_sizing": {
    "name": "Market Sizing Workshop",
    "whatItIs": "Define your playing field with a live TAM/SAM/SOM bullseye and a computed market viability score.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "performance_review": {
    "name": "Performance Review",
    "whatItIs": "Rate core competencies, track OKR progress and development goals, and capture private manager notes for a review cycle.",
    "whenToUse": "You are aligning a team on ownership, priorities, or how work gets done.",
    "howTo": "Populate it with real names, dates, and numbers from your team. Vague entries produce vague guidance."
  },
  "communication_audit": {
    "name": "Communication Audit Dashboard",
    "whatItIs": "Score clarity, tone, and conciseness across channels, track overused phrases, and turn verbose drafts into tight rewrites.",
    "whenToUse": "You have one shot to land a message clearly, especially with a busy or skeptical audience.",
    "howTo": "Write it the way you would actually say it out loud, then trim anything that is not essential."
  },
  "prep_framework": {
    "name": "PREP Framework Workspace",
    "whatItIs": "Structure a persuasive message with Point, Reason, Example, Point — and a live credibility score based on the evidence you provide.",
    "whenToUse": "You have one shot to land a message clearly, especially with a busy or skeptical audience.",
    "howTo": "Write it the way you would actually say it out loud, then trim anything that is not essential."
  },
  "bluf_workshop": {
    "name": "BLUF Workshop",
    "whatItIs": "Paste a draft and get a deterministic read on verbosity and actionability, plus a Bottom-Line-Up-Front rewrite lead and suggested subject line.",
    "whenToUse": "You have one shot to land a message clearly, especially with a busy or skeptical audience.",
    "howTo": "Write it the way you would actually say it out loud, then trim anything that is not essential."
  },
  "decision_sir": {
    "name": "Executive Decision SIR",
    "whatItIs": "Break a high-stakes call into Situation, Impact, and Recommendation, with a computed decision-confidence score and executive summary.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "tell_show_tell": {
    "name": "Tell → Show → Tell Workshop",
    "whatItIs": "Structure any presentation with the classic three-part narrative — intro, evidence, and outro — with a computed readiness score.",
    "whenToUse": "You have one shot to land a message clearly, especially with a busy or skeptical audience.",
    "howTo": "Write it the way you would actually say it out loud, then trim anything that is not essential."
  },
  "initiative_workshop": {
    "name": "Initiative Workshop",
    "whatItIs": "Turn a raw idea into a high-conviction pitch with the What → Why → How method, a jargon/clarity score, and a synthesized elevator pitch.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "cash_flow_projection": {
    "name": "Cash Flow Projection",
    "whatItIs": "Track a monthly cash ledger with low-cash alerts, plus a sensitivity model for payment delays and cost increases against your runway.",
    "whenToUse": "You need to understand or defend the numbers behind a decision.",
    "howTo": "Enter your real figures. Every insight on the page is computed directly from what you type in."
  },
  "empathy_map": {
    "name": "Empathy Map Workshop",
    "whatItIs": "Map what your target persona says, does, thinks, and feels, then balance it against their pains and desired gains.",
    "whenToUse": "You need to ground a decision in what real users actually think, feel, or do.",
    "howTo": "Base every field on something you actually observed or heard, not an assumption."
  },
  "jtbd_workshop": {
    "name": "JTBD Workshop",
    "whatItIs": "Capture job stories and functional/emotional/social jobs, then rank opportunities with the Importance-vs-Satisfaction Opportunity Score.",
    "whenToUse": "You need to ground a decision in what real users actually think, feel, or do.",
    "howTo": "Base every field on something you actually observed or heard, not an assumption."
  },
  "pl_forecasting": {
    "name": "P&L Forecasting",
    "whatItIs": "Model 12-month revenue and expense lines under conservative, moderate, or aggressive growth scenarios with live EBITDA and margin tracking.",
    "whenToUse": "You need to understand or defend the numbers behind a decision.",
    "howTo": "Enter your real figures. Every insight on the page is computed directly from what you type in."
  },
  "customer_journey": {
    "name": "Customer Journey Workspace",
    "whatItIs": "Map actions, feelings, and touchpoints across five journey stages, with a computed friction score to surface the riskiest stage.",
    "whenToUse": "You need to ground a decision in what real users actually think, feel, or do.",
    "howTo": "Base every field on something you actually observed or heard, not an assumption."
  },
  "user_persona": {
    "name": "User Persona Workshop",
    "whatItIs": "Build a full persona profile — demographics, motivations, a day in the life, pain points — with generated strategy angles for each pain point.",
    "whenToUse": "You need to ground a decision in what real users actually think, feel, or do.",
    "howTo": "Base every field on something you actually observed or heard, not an assumption."
  },
  "equity_management": {
    "name": "Equity & Cap Table",
    "whatItIs": "Track shareholder ownership by class, ESOP pool, and simulate a new funding round's dilution impact on every existing holder.",
    "whenToUse": "You need to understand or defend the numbers behind a decision.",
    "howTo": "Enter your real figures. Every insight on the page is computed directly from what you type in."
  },
  "gtm_strategy": {
    "name": "GTM Strategy Workspace",
    "whatItIs": "Model your sales funnel stage-by-stage with computed conversion rates, track GTM launch checklist progress, and define ideal customer profiles.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "risk_assessment": {
    "name": "Strategic Risk Workspace",
    "whatItIs": "Log risks with likelihood and impact to get a computed severity score, a probability/impact heatmap, and category concentration analysis.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "ice_scoring": {
    "name": "ICE Scoring Workshop",
    "whatItIs": "Score initiatives on Impact, Confidence, and Ease to compute an ICE score and rank your roadmap by potential.",
    "whenToUse": "You have a backlog of ideas or experiments and need a fast, defensible way to rank them.",
    "howTo": "Score every item 1-10 on Impact, Confidence, and Ease. The tool multiplies them automatically, so consistency across scorers matters more than precision on any one score."
  },
  "moscow_prioritization": {
    "name": "MoSCoW Prioritization Workshop",
    "whatItIs": "Sort scope into Must/Should/Could/Won't Have columns with hour estimates and a computed scope-pressure read on your Must Have load.",
    "whenToUse": "You have more to do than time to do it and need a defensible way to sequence it.",
    "howTo": "List everything first, then score or sequence it. Do not pre-filter before you have seen it all together."
  },
  "stakeholder_mapping": {
    "name": "Stakeholder Mapping",
    "whatItIs": "Plot stakeholders on a Power/Interest matrix with automatic quadrant classification and tailored engagement strategies for each group.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "balanced_scorecard": {
    "name": "Balanced Scorecard Dashboard",
    "whatItIs": "Track Financial, Customer, Internal Process, and Learning & Growth KPIs side by side with automatic status scoring and a weighted overall health score.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "content_calendar": {
    "name": "Content Calendar Workshop",
    "whatItIs": "Plan campaign objectives and schedule content across Blog, Social, Email, and Video with completion tracking and channel-load insights.",
    "whenToUse": "You are planning how to reach and engage an audience across channels.",
    "howTo": "Map out the plan by channel and date so the tool can flag gaps or overload."
  },
  "mckinsey_7s": {
    "name": "McKinsey 7S Workshop",
    "whatItIs": "Diagnose organizational effectiveness across the 7 interconnected elements — Strategy, Structure, Systems, Shared Values, Style, Staff, and Skills — with a live harmony score.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "social_media_strategy": {
    "name": "Social Media Strategy Lab",
    "whatItIs": "Map channels, tune voice and tone, define content pillars, and simulate engagement forecasts before you publish.",
    "whenToUse": "You are planning how to reach and engage an audience across channels.",
    "howTo": "Map out the plan by channel and date so the tool can flag gaps or overload."
  },
  "customer_health_scorecard": {
    "name": "Customer Success Health Scorecard",
    "whatItIs": "Track account health scores, churn risk, renewal pipeline, and expansion opportunities across your customer portfolio.",
    "whenToUse": "You need visibility into how work, risk, or capacity is distributed across the team.",
    "howTo": "Keep it current. This stays useful only if you update it as things change, not just at setup."
  },
  "onboarding_roadmap": {
    "name": "Employee Onboarding Workshop",
    "whatItIs": "Structure a phased onboarding roadmap with checklists and progress tracking for new hires.",
    "whenToUse": "You are hiring, onboarding, or evaluating the people side of the business.",
    "howTo": "Fill in specifics for each person or role. Insight quality depends entirely on the detail you provide."
  },
  "hiring_scorecard": {
    "name": "Hiring Scorecard Workshop",
    "whatItIs": "Score candidates against weighted criteria, capture interviewer consensus, and reach a confident hire/no-hire recommendation.",
    "whenToUse": "You are hiring, onboarding, or evaluating the people side of the business.",
    "howTo": "Fill in specifics for each person or role. Insight quality depends entirely on the detail you provide."
  },
  "lead_management": {
    "name": "Lead Management Workspace",
    "whatItIs": "Track inbound leads by source and status, spot your best-converting channel, and manage next actions.",
    "whenToUse": "You need to track or forecast revenue-generating activity.",
    "howTo": "Update it as deals move. The forecast recalculates live from whatever stage and probability you set."
  },
  "pricing_packaging": {
    "name": "Pricing & Packaging Workshop",
    "whatItIs": "Model tier pricing against projected ARR and benchmark your feature set against competitors.",
    "whenToUse": "You need to make a high-stakes directional call and want to stress-test your reasoning before committing.",
    "howTo": "Fill in each section with your own data. The insight panel updates its guidance as you go, computed from what you enter, never from an external AI call."
  },
  "recruitment_funnel": {
    "name": "Recruitment Funnel Workshop",
    "whatItIs": "Analyze your hiring funnel from applied to hired, spot the weakest conversion stage, and track source performance.",
    "whenToUse": "You are hiring, onboarding, or evaluating the people side of the business.",
    "howTo": "Fill in specifics for each person or role. Insight quality depends entirely on the detail you provide."
  },
  "sales_pipeline": {
    "name": "Sales Pipeline Kanban",
    "whatItIs": "Move deals through a Discovery-to-Closed kanban board with automatic weighted revenue forecasting.",
    "whenToUse": "You need to track or forecast revenue-generating activity.",
    "howTo": "Update it as deals move. The forecast recalculates live from whatever stage and probability you set."
  },
  "team_capacity_heatmap": {
    "name": "Team Capacity Heatmap",
    "whatItIs": "Visualize weekly team utilization by department, flag overloaded teams, and forecast headcount gaps.",
    "whenToUse": "You need visibility into how work, risk, or capacity is distributed across the team.",
    "howTo": "Keep it current. This stays useful only if you update it as things change, not just at setup."
  },
  "compliance_hub": {
    "name": "Legal & Compliance Hub",
    "whatItIs": "Track SOC2 and GDPR readiness checklists, manage a document vault, and stay ahead of regulatory deadlines.",
    "whenToUse": "You need visibility into how work, risk, or capacity is distributed across the team.",
    "howTo": "Keep it current. This stays useful only if you update it as things change, not just at setup."
  },
  "product_analytics": {
    "name": "Product Analytics Dashboard",
    "whatItIs": "Monitor your North Star metric, daily engagement, retention cohorts, and feature adoption in one view.",
    "whenToUse": "You are deciding what to build next or how to measure whether it is working.",
    "howTo": "Connect it to your real metrics or targets so the recommendations reflect your actual numbers."
  },
  "innovation_sandbox": {
    "name": "Innovation Sandbox",
    "whatItIs": "Track product hypotheses through validation scoring, promote winners to the roadmap, and retire dead ends in the framework graveyard.",
    "whenToUse": "You have more product ideas than you can pursue and need a lightweight way to track validation.",
    "howTo": "Score each hypothesis 0-10 as evidence comes in, and move it to Promoted or the Graveyard once you have enough signal. Do not let ideas sit untouched."
  },
  "investor_relations": {
    "name": "Investor Relations Hub",
    "whatItIs": "Manage cap table ownership, build monthly investor updates, maintain a secure document vault, and track stakeholder activity.",
    "whenToUse": "You are actively fundraising or need to keep existing investors informed on a regular cadence.",
    "howTo": "Keep the cap table and runway numbers current, and check off update sections as you draft your monthly investor email."
  }
};

export function getFrameworkGuide(toolKey) {
  return FRAMEWORK_GUIDES[toolKey] || null;
}
