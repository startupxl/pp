import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import PositionBoard, { BoardItemDeleteButton } from "../components/PositionBoard";
import { api } from "../api";

const ZONES = {
  invest: {
    label: "Invest / Grow",
    color: "bg-secondary",
    text: "text-secondary",
    icon: "trending_up",
    recommendation: (b) =>
      `High attractiveness and strong competitive position. Prioritize investment in "${b.name}".`,
  },
  selectivity: {
    label: "Selectivity",
    color: "bg-outline",
    text: "text-on-surface-variant",
    icon: "balance",
    recommendation: (b) =>
      `Mixed signals for "${b.name}" — invest selectively and monitor before committing further.`,
  },
  harvest: {
    label: "Harvest / Divest",
    color: "bg-error",
    text: "text-error",
    icon: "delete_sweep",
    recommendation: (b) =>
      `Weak position or declining market for "${b.name}". Minimize investment, maximize cash flow.`,
  },
};

// Classic GE/McKinsey diagonal classification: split the 3x3 grid into rows
// (industry attractiveness, y-axis, top = high) and columns (competitive
// strength, x-axis, left = strong), then bucket by row+col.
function classify(x, y) {
  const row = Math.min(2, Math.floor(y / 33.34));
  const col = Math.min(2, Math.floor(x / 33.34));
  const sum = row + col;
  if (sum <= 1) return "invest";
  if (sum === 2) return "selectivity";
  return "harvest";
}

function bubbleSize(revenue) {
  const rev = Number(revenue) || 0;
  return Math.min(140, Math.max(64, 56 + Math.sqrt(rev) * 3));
}

function formatRevenue(revenue) {
  const rev = Number(revenue) || 0;
  if (rev >= 1000) return `$${(rev / 1000).toFixed(1)}M`;
  return `$${rev}K`;
}

export default function GeMcKinsey() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newUnit, setNewUnit] = useState("");
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

  function updateData(patch) {
    const nextData = { ...doc.data, ...patch };
    setDoc((d) => ({ ...d, data: nextData }));
    scheduleSave({ data: nextData });
  }

  function onTitleBlur() {
    if (title !== doc.title) scheduleSave({ title });
  }

  function onBubblesChange(bubbles) {
    updateData({ bubbles });
  }

  function addUnit() {
    if (!newUnit.trim()) return;
    const bubbles = doc.data?.bubbles || [];
    updateData({
      bubbles: [
        ...bubbles,
        { id: `b${Date.now()}`, name: newUnit.trim(), revenue: 500, x: 50, y: 50 },
      ],
    });
    setNewUnit("");
  }

  function removeBubble(bid) {
    updateData({ bubbles: (doc.data?.bubbles || []).filter((b) => b.id !== bid) });
  }

  function updateBubble(bid, patch) {
    updateData({
      bubbles: (doc.data?.bubbles || []).map((b) => (b.id === bid ? { ...b, ...patch } : b)),
    });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading portfolio matrix…</div>
      </Layout>
    );
  }

  const bubbles = doc.data?.bubbles || [];
  const classified = bubbles.map((b) => ({ ...b, zone: classify(b.x, b.y) }));
  const totalRevenue = classified.reduce((sum, b) => sum + (Number(b.revenue) || 0), 0);
  const investRevenue = classified
    .filter((b) => b.zone === "invest")
    .reduce((sum, b) => sum + (Number(b.revenue) || 0), 0);
  const harvestRevenue = classified
    .filter((b) => b.zone === "harvest")
    .reduce((sum, b) => sum + (Number(b.revenue) || 0), 0);
  const investPct = totalRevenue ? Math.round((investRevenue / totalRevenue) * 100) : 0;
  const harvestPct = totalRevenue ? Math.round((harvestRevenue / totalRevenue) * 100) : 0;

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              GE McKinsey Matrix
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white border border-outline-variant rounded-xl p-6">
            <div className="flex justify-between items-end mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-primary">Business Portfolio Matrix</h2>
                <p className="text-sm text-on-surface-variant">
                  Drag bubbles to adjust market positioning and competitive strength.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUnit()}
                  placeholder="New business unit…"
                  className="text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary"
                />
                <button
                  onClick={addUnit}
                  disabled={!newUnit.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-primary text-white disabled:opacity-40"
                >
                  <Icon name="add" className="text-[16px]" />
                </button>
              </div>
            </div>

            <div className="flex">
              <div className="w-10 flex items-center justify-center shrink-0">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Industry Attractiveness
                </span>
              </div>
              <div className="flex-1">
                <PositionBoard
                  items={bubbles}
                  onItemsChange={onBubblesChange}
                  height={480}
                  background={
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border-2 border-primary rounded-lg overflow-hidden pointer-events-none">
                      {[0, 1, 2].map((row) =>
                        [0, 1, 2].map((col) => {
                          const zoneKey =
                            row + col <= 1 ? "invest" : row + col === 2 ? "selectivity" : "harvest";
                          const bg =
                            zoneKey === "invest"
                              ? "bg-secondary/5"
                              : zoneKey === "selectivity"
                              ? "bg-surface-container-low"
                              : "bg-surface-container";
                          return (
                            <div
                              key={`${row}-${col}`}
                              className={`border border-outline-variant/60 ${bg} flex items-start p-2`}
                            >
                              <span className="text-[9px] font-bold uppercase opacity-40">
                                {ZONES[zoneKey].label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  }
                  renderItem={(item) => {
                    const zone = classify(item.x, item.y);
                    const size = bubbleSize(item.revenue);
                    return (
                      <div className="relative group">
                        <div
                          className={`${ZONES[zone].color} text-white rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white text-center px-1`}
                          style={{ width: size, height: size }}
                        >
                          <span className="text-[11px] font-semibold leading-tight px-1">
                            {item.name}
                          </span>
                          <span className="text-[9px] opacity-80">
                            {formatRevenue(item.revenue)}
                          </span>
                        </div>
                        <BoardItemDeleteButton
                          onClick={() => removeBubble(item.id)}
                          className="opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    );
                  }}
                />
                <div className="grid grid-cols-3 mt-2">
                  <span className="text-center text-xs font-bold text-on-surface-variant uppercase">
                    Strong
                  </span>
                  <span className="text-center text-xs font-bold text-on-surface-variant uppercase">
                    Average
                  </span>
                  <span className="text-center text-xs font-bold text-on-surface-variant uppercase">
                    Weak
                  </span>
                </div>
                <div className="text-center mt-1">
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Competitive Strength
                  </span>
                </div>
              </div>
            </div>

            {bubbles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-outline-variant">
                <div className="text-xs font-semibold text-on-surface-variant mb-2">
                  Edit revenue (used to size each bubble)
                </div>
                <div className="flex flex-wrap gap-3">
                  {bubbles.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 text-sm">
                      <span className="text-on-surface-variant">{b.name}</span>
                      <input
                        type="number"
                        value={b.revenue}
                        onChange={(e) => updateBubble(b.id, { revenue: Number(e.target.value) })}
                        className="w-24 border border-outline-variant rounded-md px-2 py-1 text-xs outline-none focus:border-secondary"
                      />
                      <span className="text-xs text-on-surface-variant">$K rev</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
              <div className="bg-primary p-4">
                <h3 className="text-white font-semibold">Portfolio Evaluation</h3>
                <p className="text-white/60 text-xs">Grouped by strategic posture</p>
              </div>
              <div className="p-5 space-y-5">
                {Object.entries(ZONES).map(([key, zone]) => {
                  const items = classified.filter((b) => b.zone === key);
                  if (items.length === 0) return null;
                  return (
                    <div key={key} className="space-y-2">
                      <div className={`flex items-center gap-2 ${zone.text}`}>
                        <Icon name={zone.icon} className="text-[18px]" filled />
                        <span className="text-xs font-semibold uppercase">{zone.label}</span>
                      </div>
                      {items.map((b) => (
                        <div
                          key={b.id}
                          className={`rounded-lg p-3 border-l-4 ${
                            key === "invest"
                              ? "bg-secondary/5 border-secondary"
                              : key === "harvest"
                              ? "bg-error-container/20 border-error"
                              : "bg-surface-container-low border-outline"
                          }`}
                        >
                          <h4 className="text-sm font-semibold text-primary">{b.name}</h4>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {zone.recommendation(b)}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {bubbles.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center py-4">
                    Add a business unit to see its strategic classification.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase text-on-surface-variant mb-4">
                Portfolio Balance
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>High Growth (Invest/Grow revenue share)</span>
                    <span className="font-bold text-secondary">{investPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: `${investPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Risk Exposure (Harvest/Divest revenue share)</span>
                    <span className="font-bold text-error">{harvestPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-error" style={{ width: `${harvestPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
