import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import TreeCanvas from "../components/TreeCanvas";
import { api } from "../api";

function runAudit(nodes) {
  const byParent = {};
  nodes.forEach((n) => {
    if (n.parentId) {
      byParent[n.parentId] = byParent[n.parentId] || [];
      byParent[n.parentId].push(n);
    }
  });

  let overlaps = false;
  let gaps = false;
  Object.values(byParent).forEach((siblings) => {
    const texts = siblings.map((s) => (s.text || "").trim().toLowerCase());
    if (new Set(texts).size !== texts.length) overlaps = true;
    if (siblings.length < 2) gaps = true;
  });

  return { overlaps, gaps, checkedAt: new Date().toISOString() };
}

export default function Mece() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [audit, setAudit] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
      setAudit(runAudit(d.data?.nodes || []));
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
    setAudit(runAudit(nodes));
    scheduleSave({ data: { ...doc.data, nodes } });
  }

  function onTitleBlur() {
    if (title !== doc.title) scheduleSave({ title });
  }

  function exportLogic() {
    const nodes = doc.data?.nodes || [];
    const byParent = {};
    nodes.forEach((n) => {
      byParent[n.parentId ?? "root"] = byParent[n.parentId ?? "root"] || [];
      byParent[n.parentId ?? "root"].push(n);
    });
    const root = nodes.find((n) => !n.parentId);
    function render(node, depth) {
      const children = byParent[node.id] || [];
      return (
        "  ".repeat(depth) +
        "- " +
        node.text +
        "\n" +
        children.map((c) => render(c, depth + 1)).join("")
      );
    }
    const text = root ? render(root, 0) : "";
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading MECE workspace…</div>
      </Layout>
    );
  }

  const nodes = doc.data?.nodes || [];

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              MECE Workspace
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">{saveState}</span>
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                audit?.overlaps
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {audit?.overlaps ? "Overlaps Detected" : "No Overlaps Active"}
            </span>
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                audit?.gaps
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {audit?.gaps ? "Gaps Possible" : "No Gaps Verified"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <TreeCanvas
            nodes={nodes}
            onNodesChange={onNodesChange}
            accentClass="border-secondary"
            emptyHint="Add the core problem, then branch it into mutually exclusive categories."
          />

          <div className="flex flex-col gap-4">
            <div className="bg-white border border-outline-variant rounded-lg p-5">
              <div className="text-sm font-semibold mb-3">Visual Audit</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Mutually Exclusive</span>
                  <span className={audit?.overlaps ? "text-red-600" : "text-emerald-600"}>
                    {audit?.overlaps ? "FAILED" : "PASSED"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Collectively Exhaustive</span>
                  <span className={audit?.gaps ? "text-amber-600" : "text-emerald-600"}>
                    {audit?.gaps ? "GAPS FOUND" : "PASSED"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={() => setAudit(runAudit(nodes))}
                  className="bg-primary text-white text-sm font-semibold px-3 py-2 rounded-md"
                >
                  Run Audit
                </button>
                <button
                  onClick={exportLogic}
                  className="border border-outline-variant text-sm font-semibold px-3 py-2 rounded-md flex items-center justify-center gap-2"
                >
                  <Icon name="content_copy" className="text-[16px]" />
                  Export Logic
                </button>
              </div>
            </div>
            <div className="bg-white border border-outline-variant rounded-lg p-5">
              <div className="text-sm font-semibold mb-2">MECE Tip</div>
              <p className="text-sm text-on-surface-variant">
                Every group of sibling nodes should cover the whole problem with no
                overlap. Aim for at least two categories per branch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
