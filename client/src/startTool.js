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
