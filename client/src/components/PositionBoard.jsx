import { useCallback, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * Reusable free-drag positioning board. Items are placed by percentage
 * coordinates (0-100) within a bounded rectangle — no pan/zoom, since the
 * chart itself is the fixed frame (a 3x3 grid, a value/time curve, etc).
 *
 * Items shape: { id, x, y, ...anything else the caller wants to render }.
 * The caller owns rendering each item via `renderItem(item, { dragging })`,
 * so this component only handles the drag mechanics and clamping.
 *
 * Props:
 *  - items, onItemsChange(items)
 *  - renderItem(item) -> React node absolutely positioned by the board
 *  - background -> optional React node rendered behind the items (grid
 *    lines, zone shading, SVG curves, axis labels, etc.)
 *  - height -> CSS height for the board (default 520px)
 *  - onItemClick(item) -> optional click handler (fires when a drag didn't
 *    actually move the pointer, so clicks and drags don't conflict)
 */
export default function PositionBoard({
  items,
  onItemsChange,
  renderItem,
  background = null,
  height = 520,
  onItemClick,
}) {
  const boardRef = useRef(null);
  const dragState = useRef(null); // { id, moved }
  const [draggingId, setDraggingId] = useState(null);

  const updateItem = useCallback(
    (id, patch) => {
      onItemsChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [items, onItemsChange]
  );

  function clamp(v) {
    return Math.min(96, Math.max(2, v));
  }

  function onPointerDown(e, item) {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = { id: item.id, moved: false };
    setDraggingId(item.id);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e) {
    const d = dragState.current;
    if (!d || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100);
    d.moved = true;
    updateItem(d.id, { x, y });
  }

  function onPointerUp() {
    const d = dragState.current;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    setDraggingId(null);
    if (d && !d.moved && onItemClick) {
      const item = items.find((it) => it.id === d.id);
      if (item) onItemClick(item);
    }
    dragState.current = null;
  }

  return (
    <div
      ref={boardRef}
      className="relative w-full rounded-lg overflow-hidden select-none"
      style={{ height }}
    >
      {background}
      {items.map((item) => (
        <div
          key={item.id}
          onPointerDown={(e) => onPointerDown(e, item)}
          className="absolute -translate-x-1/2 -translate-y-1/2 touch-none"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            cursor: draggingId === item.id ? "grabbing" : "grab",
            zIndex: draggingId === item.id ? 30 : 10,
          }}
        >
          {renderItem(item, { dragging: draggingId === item.id })}
        </div>
      ))}
    </div>
  );
}

// Small shared helper so pages don't duplicate the "delete" button markup.
export function BoardItemDeleteButton({ onClick, className = "" }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-error shadow-sm ${className}`}
      title="Remove"
    >
      <Icon name="close" className="text-[12px]" />
    </button>
  );
}
