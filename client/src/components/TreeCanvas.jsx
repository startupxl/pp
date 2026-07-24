import { useCallback, useRef, useState } from "react";
import Icon from "./Icon";

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 2200;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2;

/**
 * Reusable pan/zoom/drag tree canvas. Nodes are plain objects:
 *   { id, text, x, y, parentId }
 * `x`/`y` are in "world" coordinates (unaffected by pan/zoom).
 *
 * Props:
 *  - nodes, onNodesChange(nodes)
 *  - accentClass (tailwind text/border color class for the active node accent)
 *  - renderBadge(node) -> optional React node rendered inside each node card
 *  - onAddChild(parentId), onDeleteNode(id) -- if omitted, sensible defaults are used
 */
export default function TreeCanvas({
  nodes,
  onNodesChange,
  accentClass = "border-secondary",
  emptyHint = "Click a node, then “Add Node” to branch out.",
}) {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? null);
  const [editingId, setEditingId] = useState(null);
  const viewportRef = useRef(null);
  const dragState = useRef(null); // { type: 'pan'|'node', nodeId?, startX, startY, origin }

  const updateNode = useCallback(
    (id, patch) => {
      onNodesChange(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    },
    [nodes, onNodesChange]
  );

  function onBackgroundMouseDown(e) {
    if (e.target !== e.currentTarget) return; // let node handlers deal with their own events
    dragState.current = { type: "pan", startX: e.clientX, startY: e.clientY, origin: pan };
    document.addEventListener("mousemove", onDocMouseMove);
    document.addEventListener("mouseup", onDocMouseUp);
  }

  function onNodeMouseDown(e, node) {
    e.stopPropagation();
    setSelectedId(node.id);
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
      updateNode(d.nodeId, {
        x: d.origin.x + dx / scale,
        y: d.origin.y + dy / scale,
      });
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

  function addChild(parentId) {
    const parent = nodes.find((n) => n.id === parentId);
    const siblings = nodes.filter((n) => n.parentId === parentId);
    const id = `n${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const newNode = {
      id,
      text: "New node",
      parentId,
      x: (parent?.x ?? 0) + 260,
      y: (parent?.y ?? 0) + siblings.length * 110,
    };
    onNodesChange([...nodes, newNode]);
    setSelectedId(id);
    setEditingId(id);
  }

  function deleteNode(id) {
    // cascade delete descendants
    const toDelete = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (toDelete.has(n.parentId) && !toDelete.has(n.id)) {
          toDelete.add(n.id);
          changed = true;
        }
      }
    }
    onNodesChange(nodes.filter((n) => !toDelete.has(n.id)));
    if (selectedId && toDelete.has(selectedId)) setSelectedId(null);
  }

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const NODE_W = 220;
  const NODE_H = 72;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-md px-2 py-1.5">
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
          <div className="w-px h-5 bg-outline-variant mx-1" />
          <button
            onClick={resetView}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container"
            title="Reset view"
          >
            <Icon name="center_focus_strong" className="text-[18px]" />
          </button>
        </div>
        <button
          onClick={() => addChild(selectedId ?? nodes[0]?.id)}
          disabled={!nodes.length}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-40"
        >
          <Icon name="add_circle" className="text-[18px]" />
          Add Node
        </button>
      </div>

      <div
        ref={viewportRef}
        onMouseDown={onBackgroundMouseDown}
        onWheel={onWheel}
        className="relative w-full h-[560px] bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(11,28,48,0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-sm px-8 text-center">
            {emptyHint}
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
          <svg
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            className="absolute top-0 left-0 pointer-events-none"
          >
            {nodes
              .filter((n) => n.parentId && nodeById[n.parentId])
              .map((n) => {
                const p = nodeById[n.parentId];
                const x1 = p.x + NODE_W;
                const y1 = p.y + NODE_H / 2;
                const x2 = n.x;
                const y2 = n.y + NODE_H / 2;
                const midX = (x1 + x2) / 2;
                return (
                  <path
                    key={n.id}
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    stroke="#c4c6cd"
                    strokeWidth={2}
                    fill="none"
                  />
                );
              })}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => onNodeMouseDown(e, node)}
              onDoubleClick={() => setEditingId(node.id)}
              style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
              className={`absolute bg-white rounded-lg shadow-sm border-2 px-3 py-2 select-none ${
                selectedId === node.id ? accentClass : "border-outline-variant"
              }`}
            >
              {editingId === node.id ? (
                <textarea
                  autoFocus
                  defaultValue={node.text}
                  onMouseDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    updateNode(node.id, { text: e.target.value || "Untitled" });
                    setEditingId(null);
                  }}
                  className="w-full text-sm outline-none resize-none bg-transparent"
                  rows={2}
                />
              ) : (
                <div className="text-sm font-medium leading-snug pr-5">{node.text}</div>
              )}
              {node.parentId && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => deleteNode(node.id)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high"
                  title="Delete node"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => addChild(node.id)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-secondary text-white shadow hover:opacity-90"
                title="Add child node"
              >
                <Icon name="add" className="text-[14px]" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
