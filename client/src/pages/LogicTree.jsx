import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import TreeCanvas from "../components/TreeCanvas";
import { api } from "../api";

const DEFAULT_ROOT_TEXT = "What is the primary obstacle to user conversion?";

// Deterministic heuristic "diagnostic integrity" scan — no external LLM call,
// mirrors the style of server/analysisEngine.js but runs client-side since
// it only needs the current node graph.
function computeIntegrity(nodes) {
  const root = nodes.find((n) => !n.parentId);
  const nonRoot = nodes.filter((n) => n.parentId);
  const leaves = nodes.filter((n) => !nodes.some((c) => c.parentId === n.id));
  const nonRootLeaves = leaves.filter((n) => n.parentId);

  const filledLeaves = nonRootLeaves.filter((n) => n.text && n.text !== "New node");
  const pathCoverage = nonRootLeaves.length
    ? Math.round((filledLeaves.length / nonRootLeaves.length) * 100)
    : 0;

  // "Fallacy" heuristic: sibling nodes under the same parent with identical
  // (case-insensitive) text — a sign of a duplicated, non-exclusive branch.
  const byParent = {};
  nonRoot.forEach((n) => {
    (byParent[n.parentId] ||= []).push(n);
  });
  let fallacyCount = 0;
  Object.values(byParent).forEach((siblings) => {
    const seen = new Set();
    siblings.forEach((s) => {
      const key = (s.text || "").trim().toLowerCase();
      if (key && seen.has(key)) fallacyCount += 1;
      seen.add(key);
    });
  });

  const mutuallyExclusive = fallacyCount === 0 && nonRoot.length > 0;
  const exhaustive = Object.values(byParent).every((siblings) => siblings.length >= 2) &&
    Object.keys(byParent).length > 0;
  const evidenceAnchored =
    nonRootLeaves.length > 0 &&
    nonRootLeaves.every((n) => (n.text || "").trim().length >= 20);

  return {
    pathCoverage,
    fallacyCount,
    hasRoot: Boolean(root),
    nodeCount: nodes.length,
    checklist: [
      {
        key: "exclusivity",
        label: "Mutual Exclusivity",
        description: "Are all branch options clearly distinct?",
        done: mutuallyExclusive,
      },
      {
        key: "exhaustive",
        label: "Exhaustive Options",
        description: "Have you accounted for 'Other' scenarios?",
        done: exhaustive,
      },
      {
        key: "evidence",
        label: "Evidence Anchors",
        description: "Every leaf node must link to a dataset or detail.",
        done: evidenceAnchored,
      },
    ],
  };
}

function integrityLevel(integrity) {
  const doneCount = integrity.checklist.filter((c) => c.done).length;
  if (integrity.fallacyCount > 0) return "Needs Review";
  if (doneCount === integrity.checklist.length && integrity.pathCoverage >= 80) return "Optimal";
  if (doneCount >= 1) return "Developing";
  return "Early";
}

function toMermaid(nodes) {
  const lines = ["graph TD"];
  const safe = (id) => `n${String(id).replace(/[^a-zA-Z0-9]/g, "")}`;
  nodes.forEach((n) => {
    const label = (n.text || "Untitled").replace(/"/g, "'");
    lines.push(`  ${safe(n.id)}["${label}"]`);
  });
  nodes
    .filter((n) => n.parentId)
    .forEach((n) => {
      lines.push(`  ${safe(n.parentId)} --> ${safe(n.id)}`);
    });
  return lines.join("\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogicTree() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [mode, setMode] = useState("symptom");
  const [scanning, setScanning] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
      setMode(d.data?.mode || "symptom");
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

  function onNodesChange(nodes) {
    setDoc((d) => ({ ...d, data: { ...d.data, nodes } }));
    scheduleSave({ data: { ...doc.data, nodes } });
  }

  function onTitleBlur() {
    if (title !== doc.title) scheduleSave({ title });
  }

  function setModeAndSave(nextMode) {
    setMode(nextMode);
    scheduleSave({ data: { ...doc.data, mode: nextMode } });
  }

  function handleExportMermaid() {
    downloadText(`${(doc.title || "logic-tree").replace(/\s+/g, "-").toLowerCase()}.mmd`, toMermaid(nodes));
  }

  function handleRunScan() {
    setScanning(true);
    setTimeout(() => {
      scheduleSave({ data: { ...doc.data, lastScanAt: new Date().toISOString() } });
      setScanning(false);
    }, 600);
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading logic tree…</div>
      </Layout>
    );
  }

  const nodes = doc.data?.nodes || [];
  const integrity = computeIntegrity(nodes);
  const level = integrityLevel(integrity);
  const levelClasses =
    level === "Optimal"
      ? "bg-secondary-container text-on-secondary-container"
      : level === "Needs Review"
      ? "bg-error-container text-on-error-container"
      : "bg-surface-container-high text-on-surface-variant";

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Logic Tree Workshop
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant">
              <button
                onClick={() => setModeAndSave("symptom")}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  mode === "symptom" ? "bg-primary text-white" : "text-on-surface-variant"
                }`}
              >
                Symptom-driven
              </button>
              <button
                onClick={() => setModeAndSave("decision")}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  mode === "decision" ? "bg-primary text-white" : "text-on-surface-variant"
                }`}
              >
                Decision-driven
              </button>
            </div>
            <span className="text-sm text-on-surface-variant">{saveState}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <TreeCanvas
            nodes={nodes}
            onNodesChange={onNodesChange}
            accentClass="border-secondary"
            emptyHint={`Add your root ${
              mode === "symptom" ? "symptom" : "decision"
            } question, then branch it out with Add Node.`}
          />

          <aside className="bg-white border border-outline-variant rounded-lg flex flex-col">
            <div className="p-5 border-b border-outline-variant">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Icon name="verified_user" className="text-secondary text-[18px]" />
                  Diagnostic Integrity
                </h3>
                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${levelClasses}`}>
                  Level: {level}
                </span>
              </div>
              <div className="space-y-3">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-on-surface-variant">Path Coverage</span>
                    <span className="text-xs text-primary font-bold">{integrity.pathCoverage}%</span>
                  </div>
                  <div className="w-full bg-outline-variant h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-secondary h-full"
                      style={{ width: `${integrity.pathCoverage}%` }}
                    />
                  </div>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-on-surface-variant">Logic Fallacies</span>
                    <span
                      className={`text-xs font-bold ${
                        integrity.fallacyCount > 0 ? "text-error" : "text-secondary"
                      }`}
                    >
                      {integrity.fallacyCount > 0 ? integrity.fallacyCount : "None"}
                    </span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant italic leading-tight">
                    Scanned {integrity.nodeCount} node{integrity.nodeCount === 1 ? "" : "s"} for
                    duplicated sibling branches.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto">
              <h4 className="text-xs text-on-surface-variant uppercase tracking-widest mb-4">
                Integrity Checklist
              </h4>
              <ul className="space-y-4">
                {integrity.checklist.map((item) => (
                  <li key={item.key} className={`flex gap-3 ${item.done ? "" : "opacity-60"}`}>
                    <Icon
                      name={item.done ? "check_circle" : "radio_button_unchecked"}
                      className={`text-xl mt-0.5 ${item.done ? "text-secondary" : "text-outline"}`}
                      filled={item.done}
                    />
                    <div>
                      <p className="text-sm font-semibold text-primary">{item.label}</p>
                      <p className="text-sm text-on-surface-variant">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-surface-container-low mt-auto rounded-b-lg">
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleExportMermaid}
                  disabled={!nodes.length}
                  className="w-full py-3 px-4 bg-white border border-outline-variant rounded-xl text-sm font-semibold text-primary flex items-center justify-between hover:bg-surface-container transition-colors disabled:opacity-40"
                >
                  Export as Mermaid
                  <Icon name="download" className="text-[16px]" />
                </button>
                <button
                  onClick={handleRunScan}
                  disabled={scanning}
                  className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Icon name="psychology" className="text-[16px]" />
                  {scanning ? "Scanning…" : "Run Diagnostic Scan"}
                </button>
                {doc.data?.lastScanAt && (
                  <p className="text-[11px] text-on-surface-variant text-center">
                    Last scanned {new Date(doc.data.lastScanAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
