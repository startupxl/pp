import { useCallback, useRef, useState } from "react";
import Icon from "./Icon";

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2;
const NODE_W = 176;
const NODE_H = 84;

/**
 * Free-form (non-hierarchical) pan/zoom/drag canvas for causal loop diagrams.
 * Nodes are stocks/flows: { id, label, kind: 'stock'|'flow', x, y }.
 * Edges are directional and labeled: { id, from, to, loop: 'reinforcing'|'balancing' }.
 *
 * Props:
 *  - nodes, onNodesChange(nodes)
 *  - edges, onEdgesChange(edges)
 */
export default function LoopCanvas({ nodes, onNodesChange, edges, onEdgesChange }) {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState("select"); // "select" | "connect"
  const [pendingLoop, setPendingLoop] = useState("reinforcing");
  const [connectFrom, setConnectFrom] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const dragState = useRef(null);

  const updateNode = useCallback(
    (id, patch) => {
      onNodesChange(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    },
    [nodes, onNodesChange]
  );

  function onBackgroundMouseDown(e) {
    if (e.target !== e.currentTarget) return;
    dragState.current = { type: "pan", startX: e.clientX, startY: e.clientY, origin: pan };
    document.addEventListener("mousemove", onDocMouseMove);
    document.addEventListener("mouseup", onDocMouseUp);
  }

  function onNodeMouseDown(e, node) {
    e.stopPropagation();
    if (mode === "connect") return; // clicks handled in onNodeClick instead
    dragState.current = {
      type: "node",
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: node.x, y: node.y },
    };
    document.addEventListener("mousemove", onDocMouseMove);
    document.addEventListener("mouseup", onDocMouseUp);
  }

  function onDocMouseMove(e) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.type === "pan") {
      setPan({ x: d.origin.x + dx, y: d.origin.y + dy });
    } else if (d.type === "node") {
      updateNode(d.nodeId, { x: d.origin.x + dx / scale, y: d.origin.y + dy / scale });
    }
  }

  function onDocMouseUp() {
    dragState.current = null;
    document.removeEventListener("mousemove", onDocMouseMove);
    document.removeEventListener("mouseup", onDocMouseUp);
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }

  function zoomBy(delta) {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(2))));
  }

  function resetView() {
    setPan({ x: 40, y: 40 });
    setScale(1);
  }

  function onNodeClick(node) {
    if (mode !== "connect") return;
    if (!connectFrom) {
      setConnectFrom(node.id);
      return;
    }
    if (connectFrom === node.id) {
      setConnectFrom(null);
      return;
    }
    const id = `e${Date.now()}${Math.floor(Math.random() * 1000)}`;
    onEdgesChange([...edges, { id, from: connectFrom, to: node.id, loop: pendingLoop }]);
    setConnectFrom(null);
  }

  function addNode(kind) {
    const id = `n${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const count = nodes.length;
    const newNode = {
      id,
      kind,
      label: kind === "stock" ? "New Stock" : "New Flow",
      x: 120 + (count % 4) * 240,
      y: 100 + Math.floor(count / 4) * 160,
    };
    onNodesChange([...nodes, newNode]);
    setEditingId(id);
  }

  function deleteNode(id) {
    onNodesChange(nodes.filter((n) => n.id !== id));
    onEdgesChange(edges.filter((e) => e.from !== id && e.to !== id));
  }

  function deleteEdge(id) {
    onEdgesChange(edges.filter((e) => e.id !== id));
  }

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const loopCounts = { reinforcing: 0, balancing: 0 };
  edges.forEach((e) => {
    if (e.loop === "balancing") loopCounts.balancing += 1;
    else loopCounts.reinforcing += 1;
  });
  let reinforcingSeen = 0;
  let balancingSeen = 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-md px-2 py-1.5">
          <button
            onClick={() => {
              setMode("select");
              setConnectFrom(null);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded ${
              mode === "select" ? "bg-primary text-white" : "hover:bg-surface-container"
            }`}
            title="Select / drag"
          >
            <Icon name="near_me" className="text-[18px]" />
          </button>
          <button
            onClick={() => setMode("connect")}
            className={`w-8 h-8 flex items-center justify-center rounded ${
              mode === "connect" ? "bg-primary text-white" : "hover:bg-surface-container"
            }`}
            title="Connect nodes"
          >
            <Icon name="auto_graph" className="text-[18px]" />
          </button>
          <div className="w-px h-5 bg-outline-variant mx-1" />
          <button
            onClick={() => zoomBy(-0.1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container"
            title="Zoom out"
          >
            <Icon name="remove" className="text-[18px]" />
          </button>
          <span className="text-xs font-semibold text-on-surface-variant w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => zoomBy(0.1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container"
            title="Zoom in"
          >
            <Icon name="add" className="text-[18px]" />
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container"
            title="Reset view"
          >
            <Icon name="center_focus_strong" className="text-[18px]" />
          </button>
        </div>

        {mode === "connect" && (
          <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-md px-3 py-1.5">
            <span className="text-xs text-on-surface-variant">
              {connectFrom ? "Click the target node…" : "Click a source node, then a target"}
            </span>
            <div className="flex bg-surface-container rounded-full p-0.5">
              <button
                onClick={() => setPendingLoop("reinforcing")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  pendingLoop === "reinforcing" ? "bg-primary text-white" : "text-on-surface-variant"
                }`}
              >
                Reinforcing
              </button>
              <button
                onClick={() => setPendingLoop("balancing")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  pendingLoop === "balancing" ? "bg-secondary text-white" : "text-on-surface-variant"
                }`}
              >
                Balancing
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => addNode("stock")}
            className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-md text-sm font-semibold"
          >
            <Icon name="inventory_2" className="text-[16px]" />
            Add Stock
          </button>
          <button
            onClick={() => addNode("flow")}
            className="flex items-center gap-2 bg-secondary text-white px-3 py-2 rounded-md text-sm font-semibold"
          >
            <Icon name="precision_manufacturing" className="text-[16px]" />
            Add Flow
          </button>
        </div>
      </div>

      <div
        onMouseDown={onBackgroundMouseDown}
        onWheel={onWheel}
        className="relative w-full h-[560px] bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(11,28,48,0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-sm px-8 text-center pointer-events-none">
            Add a stock or flow node, then use Connect to draw reinforcing/balancing loops between
            them.
          </div>
        )}
        <div
          onMouseDown={onBackgroundMouseDown}
          className="absolute top-0 left-0"
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <svg width={WORLD_WIDTH} height={WORLD_HEIGHT} className="absolute top-0 left-0">
            <defs>
              <marker id="lc-arrow-primary" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#041627" />
              </marker>
              <marker id="lc-arrow-secondary" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#006970" />
              </marker>
            </defs>
            {edges
              .filter((e) => nodeById[e.from] && nodeById[e.to])
              .map((e) => {
                const from = nodeById[e.from];
                const to = nodeById[e.to];
                const x1 = from.x + NODE_W / 2;
                const y1 = from.y + NODE_H / 2;
                const x2 = to.x + NODE_W / 2;
                const y2 = to.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2 - 30;
                const isBalancing = e.loop === "balancing";
                if (isBalancing) balancingSeen += 1;
                else reinforcingSeen += 1;
                const label = isBalancing ? `B${balancingSeen}` : `R${reinforcingSeen}`;
                const color = isBalancing ? "#006970" : "#041627";
                return (
                  <g key={e.id}>
                    <path
                      d={`M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="4"
                      fill="none"
                      markerEnd={`url(#lc-arrow-${isBalancing ? "secondary" : "primary"})`}
                    />
                    <g
                      className="cursor-pointer"
                      onClick={() => deleteEdge(e.id)}
                      style={{ pointerEvents: "auto" }}
                    >
                      <circle cx={mx} cy={my} r="12" fill="white" stroke={color} strokeWidth="1.5" />
                      <text
                        x={mx}
                        y={my + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill={color}
                      >
                        {label}
                      </text>
                    </g>
                  </g>
                );
              })}
          </svg>

          {nodes.map((node) => {
            const connecting = mode === "connect";
            const isSource = connectFrom === node.id;
            return (
              <div
                key={node.id}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                onClick={() => onNodeClick(node)}
                onDoubleClick={() => setEditingId(node.id)}
                style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
                className={`absolute bg-white rounded-xl shadow-sm border-2 px-3 py-2.5 select-none ${
                  isSource
                    ? "border-secondary node-active"
                    : connecting
                    ? "border-outline-variant hover:border-secondary cursor-pointer"
                    : "border-outline-variant cursor-move"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon
                    name={node.kind === "stock" ? "inventory_2" : "precision_manufacturing"}
                    className="text-[16px] text-on-surface-variant"
                  />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    {node.kind}
                  </span>
                </div>
                {editingId === node.id ? (
                  <textarea
                    autoFocus
                    defaultValue={node.label}
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      updateNode(node.id, { label: e.target.value || "Untitled" });
                      setEditingId(null);
                    }}
                    className="w-full text-sm outline-none resize-none bg-transparent"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm font-semibold text-primary leading-snug pr-4">
                    {node.label}
                  </p>
                )}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high"
                  title="Delete node"
                >
                  <Icon name="close" className="text-[13px]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
