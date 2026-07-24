// Lightweight deterministic "analysis engine" that turns free-text context
// into a plausible SWOT breakdown + strategic insights, without calling an
// external LLM. Uses simple keyword heuristics + seeded pseudo-randomness so
// the same input always produces the same output (feels stable, not flaky).

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const STRENGTH_TEMPLATES = [
  "Established credibility and momentum in the core area described",
  "Clear founder/operator conviction and first-hand domain knowledge",
  "Lean structure that can move faster than larger incumbents",
  "Existing relationships or channel access that competitors lack",
];

const WEAKNESS_TEMPLATES = [
  "Limited resources to pursue every opportunity simultaneously",
  "Dependency on a small number of key relationships or channels",
  "Brand/awareness gap outside the immediate existing audience",
  "Processes are still informal and may not scale as-is",
];

const OPPORTUNITY_TEMPLATES = [
  "Underserved segment adjacent to the current focus area",
  "Potential for a recurring or subscription-style revenue layer",
  "Partnership or channel plays that widen distribution",
  "Shifting market conditions favor faster, more focused players",
];

const THREAT_TEMPLATES = [
  "Larger, better-capitalized competitors entering the same space",
  "Rising input costs or supplier dependency risk",
  "Customer expectations shifting faster than roadmap can absorb",
  "Regulatory or platform changes outside of direct control",
];

function pick(arr, rng, n) {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function extractKeyPhrase(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "your initiative";
  const firstSentence = clean.split(/[.!?]/)[0];
  return firstSentence.length > 80 ? firstSentence.slice(0, 80) + "..." : firstSentence;
}

export function generateSwot(contextText) {
  const seed = hashSeed(contextText || "default-seed");
  const rng = seededRandom(seed);
  const keyPhrase = extractKeyPhrase(contextText || "");

  const strengths = pick(STRENGTH_TEMPLATES, rng, 2);
  const weaknesses = pick(WEAKNESS_TEMPLATES, rng, 2);
  const opportunities = pick(OPPORTUNITY_TEMPLATES, rng, 2);
  const threats = pick(THREAT_TEMPLATES, rng, 2);

  const marketViability = Math.round(55 + rng() * 40); // 55-95
  const riskIndex = Math.round(5 + rng() * 30); // 5-35
  const roi = (1.5 + rng() * 2.5).toFixed(1); // 1.5x - 4.0x
  const timeline = Math.round(80 + rng() * 20); // 80-100
  const burnRate = -Math.round(5 + rng() * 20); // -5 to -25

  const insights = [
    {
      icon: "trending_up",
      title: "Growth Strategy",
      body: `Double down on "${strengths[0]?.toLowerCase()}" to widen the gap on ${keyPhrase}.`,
      tags: ["PRIORITY: HIGH", "ACTIONABLE"],
    },
    {
      icon: "shield",
      title: "Risk Mitigation",
      body: `Address "${weaknesses[0]?.toLowerCase()}" before it becomes a blocker to execution.`,
      tags: ["URGENCY: MID", "TECHNICAL"],
    },
    {
      icon: "military_tech",
      title: "Competitive Edge",
      body: `Leverage "${opportunities[0]?.toLowerCase()}" as the wedge that incumbents can't easily copy.`,
      tags: ["LONG-TERM", "MARKETING"],
    },
  ];

  const summary = `${keyPhrase} shows real upside, anchored by ${strengths[0]?.toLowerCase()}. The primary blocker is ${weaknesses[0]?.toLowerCase()}, which can be mitigated by acting on ${opportunities[0]?.toLowerCase()} ahead of ${threats[0]?.toLowerCase()}.`;

  return {
    quadrants: {
      strengths: strengths.map((s) => ({ text: s })),
      weaknesses: weaknesses.map((s) => ({ text: s })),
      opportunities: opportunities.map((s) => ({ text: s })),
      threats: threats.map((s) => ({ text: s })),
    },
    metrics: {
      marketViability,
      riskIndex,
      roi: `${roi}x`,
      timelineIntegrity: timeline,
      burnRateOptimization: burnRate,
    },
    insights,
    executiveSummary: summary,
    generatedAt: new Date().toISOString(),
  };
}
