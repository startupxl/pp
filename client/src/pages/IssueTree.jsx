import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import TreeCanvas from "../components/TreeCanvas";
import { api } from "../api";

const DEFAULT_ROOT_TEXT = "How can we increase operating margin by 15% in FY25?";

function computeProgress(nodes) {
  if (nodes.length <= 1) return 0;
  const nonRoot = nodes.filter((n) => n.parentId);
  const filledIn = nonRoot.filter((n) => n.text && n.text !== "New node");
  const breadthBonus = new Set(nonRoot.map((n) => n.parentId)).size >= 2 ? 1 : 0;
  const ratio = nonRoot.length ? filledIn.length / nonRoot.length : 0;
  return Math.min(100, Math.round(ratio * 80 + breadthBonus * 20));
}

export default function IssueTree() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
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

  function applySuggestion() {
    const nodes = doc.data.nodes;
    const branchCounts = {};
    nodes.forEach((n) => {
      if (n.parentId) branchCounts[n.parentId] = (branchCounts[n.parentId] || 0) + 1;
    });
    const root = nodes.find((n) => !n.parentId);
    const branches = nodes.filter((n) => n.parentId === root?.id);
    const target =
      branches.sort((a, b) => (branchCounts[a.id] || 0) - (branchCounts[b.id] || 0))[0] ||
      root;
    if (!target) return;
    const siblings = nodes.filter((n) => n.parentId === target.id);
    const newNode = {
      id: `n${Date.now()}`,
      text: "New consideration to explore",
      parentId: target.id,
      x: target.x + 260,
      y: target.y + siblings.length * 110,
    };
    onNodesChange([...nodes, newNode]);
    setSuggestionDismissed(true);
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading issue tree…</div>
      </Layout>
    );
  }

  const nodes = doc.data?.nodes || [];
  const progress = computeProgress(nodes);
  const branchCount = new Set(
    nodes.filter((n) => n.parentId === nodes.find((r) => !r.parentId)?.id).map((n) => n.id)
  ).size;

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Issue Tree Builder
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
            <button className="flex items-center gap-2 border border-outline-variant bg-white px-4 py-2 rounded-md text-sm font-semibold">
              <Icon name="ios_share" className="text-[18px]" />
              Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <TreeCanvas
            nodes={nodes}
            onNodesChange={onNodesChange}
            accentClass="border-secondary"
            emptyHint="Add your root question, then branch it out with Add Node."
          />

          <div className="flex flex-col gap-4">
            <div className="bg-white border border-outline-variant rounded-lg p-5">
              <div className="text-sm font-semibold mb-2">Tree Progress</div>
              <div className="text-2xl font-bold mb-2">{progress}%</div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden mb-1">
                <div
                  className="h-full bg-secondary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-on-surface-variant">
                {nodes.length} node{nodes.length === 1 ? "" : "s"} · {branchCount} top-level
                branch{branchCount === 1 ? "" : "es"}
              </div>
            </div>
            <div className="bg-white border border-outline-variant rounded-lg p-5">
              <div className="text-sm font-semibold mb-2">How to use this</div>
              <ul className="text-sm text-on-surface-variant space-y-2">
                <li>Drag the canvas background to pan.</li>
                <li>Scroll or use +/- to zoom.</li>
                <li>Double-click a node to edit its text.</li>
                <li>Use the teal + button on a node to branch out.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {!suggestionDismissed && nodes.length > 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-white rounded-lg shadow-lg px-5 py-4 flex items-center gap-4 max-w-xl">
          <Icon name="tips_and_updates" className="text-secondary-container" />
          <div className="text-sm">
            Your least-developed branch could use another consideration — want a suggestion
            added there?
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSuggestionDismissed(true)}
              className="text-sm text-white/70 hover:text-white px-2"
            >
              Dismiss
            </button>
            <button
              onClick={applySuggestion}
              className="bg-secondary text-white text-sm font-semibold px-3 py-1.5 rounded-md"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
