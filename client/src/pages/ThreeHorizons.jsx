import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import PositionBoard, { BoardItemDeleteButton } from "../components/PositionBoard";
import { api } from "../api";

const HORIZONS = {
  h1: { label: "H1: Current Core", color: "bg-primary", text: "text-primary", target: 70 },
  h2: { label: "H2: Growth Ventures", color: "bg-secondary", text: "text-secondary", target: 20 },
  h3: { label: "H3: Visionary Options", color: "bg-outline", text: "text-outline", target: 10 },
};

// x = time/stretch axis (left = now, right = future); classify into thirds.
function classify(x) {
  if (x < 33.34) return "h1";
  if (x < 66.67) return "h2";
  return "h3";
}

export default function ThreeHorizons() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newInitiative, setNewInitiative] = useState("");
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

  function onInitiativesChange(initiatives) {
    updateData({ initiatives });
  }

  function addInitiative() {
    if (!newInitiative.trim()) return;
    const initiatives = doc.data?.initiatives || [];
    const newItem = {
      id: `h${Date.now()}`,
      name: newInitiative.trim(),
      x: 15,
      y: 30 + Math.random() * 40,
      addedAt: new Date().toISOString(),
    };
    updateData({ initiatives: [newItem, ...initiatives] });
    setNewInitiative("");
  }

  function removeInitiative(iid) {
    updateData({ initiatives: (doc.data?.initiatives || []).filter((i) => i.id !== iid) });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading horizons map…</div>
      </Layout>
    );
  }

  const initiatives = doc.data?.initiatives || [];
  const classified = initiatives.map((i) => ({ ...i, horizon: classify(i.x) }));
  const total = classified.length;
  const counts = { h1: 0, h2: 0, h3: 0 };
  classified.forEach((i) => (counts[i.horizon] += 1));
  const pct = (key) => (total ? Math.round((counts[key] / total) * 100) : 0);

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Three Horizons Framework
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
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <div className="flex justify-between items-end mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-primary">Value vs. Time Horizon Map</h2>
                  <p className="text-sm text-on-surface-variant">
                    Drag initiatives left (now) to right (future) to place them on a horizon.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newInitiative}
                    onChange={(e) => setNewInitiative(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addInitiative()}
                    placeholder="New initiative…"
                    className="text-sm border border-outline-variant rounded-md px-3 py-1.5 outline-none focus:border-secondary"
                  />
                  <button
                    onClick={addInitiative}
                    disabled={!newInitiative.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-primary text-white disabled:opacity-40"
                  >
                    <Icon name="add" className="text-[16px]" />
                  </button>
                </div>
              </div>

              <PositionBoard
                items={initiatives}
                onItemsChange={onInitiativesChange}
                height={420}
                background={
                  <div
                    className="absolute inset-0 border border-outline-variant rounded-lg pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(#e5eeff 1px, transparent 1px), linear-gradient(90deg, #e5eeff 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  >
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 1000 600"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 50,550 Q 150,100 450,450"
                        fill="none"
                        stroke="#041627"
                        strokeWidth="3"
                        opacity="0.5"
                      />
                      <path
                        d="M 250,550 Q 500,50 750,500"
                        fill="none"
                        stroke="#006970"
                        strokeWidth="3"
                        opacity="0.5"
                      />
                      <path
                        d="M 550,550 Q 850,0 950,550"
                        fill="none"
                        stroke="#74777d"
                        strokeWidth="2"
                        strokeDasharray="8 8"
                        opacity="0.5"
                      />
                    </svg>
                    <div className="absolute top-1/3 left-[16.5%] -translate-x-1/2 text-[10px] font-bold text-primary/50 uppercase">
                      H1
                    </div>
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary/60 uppercase">
                      H2
                    </div>
                    <div className="absolute top-1/5 left-[83%] -translate-x-1/2 text-[10px] font-bold text-outline uppercase">
                      H3
                    </div>
                    <div className="absolute bottom-2 right-4 text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                      Time (Horizon Stretch)
                      <Icon name="arrow_forward" className="text-[14px]" />
                    </div>
                    <div className="absolute top-2 left-4 text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                      <Icon name="trending_up" className="text-[14px]" />
                      Value / Strategic Impact
                    </div>
                  </div>
                }
                renderItem={(item) => {
                  const horizon = classify(item.x);
                  return (
                    <div className="relative group">
                      <div
                        className={`${HORIZONS[horizon].color} w-4 h-4 rounded-full border-2 border-white shadow`}
                      />
                      <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-lg border border-outline-variant rounded-lg py-1.5 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className={`text-xs font-bold ${HORIZONS[horizon].text}`}>
                          {item.name}
                        </span>
                        <p className="text-[10px] text-on-surface-variant">
                          {HORIZONS[horizon].label}
                        </p>
                      </div>
                      <BoardItemDeleteButton
                        onClick={() => removeInitiative(item.id)}
                        className="opacity-0 group-hover:opacity-100"
                      />
                    </div>
                  );
                }}
              />

              <div className="flex gap-8 mt-4">
                {Object.entries(HORIZONS).map(([key, h]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${h.color}`} />
                    <span className={`text-sm font-semibold ${h.text}`}>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-outline-variant rounded-xl p-5">
                <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <Icon name="bolt" className="text-[18px]" />
                  H1 Focus
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Extend and defend the core business. Target ~70% of resources for stability.
                </p>
              </div>
              <div className="bg-white border border-outline-variant rounded-xl p-5">
                <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                  <Icon name="rocket_launch" className="text-[18px]" />
                  H2 Focus
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Build emerging businesses. Target ~20% of resources for high-growth scaling.
                </p>
              </div>
              <div className="bg-white border border-outline-variant rounded-xl p-5">
                <h4 className="text-sm font-semibold text-outline mb-2 flex items-center gap-2">
                  <Icon name="auto_awesome" className="text-[18px]" />
                  H3 Focus
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Create viable options for the future. Target ~10% for breakthrough R&D.
                </p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="bg-white border border-outline-variant rounded-xl p-5">
              <h3 className="text-lg font-bold text-primary mb-5">Portfolio Balance</h3>
              <div className="space-y-5">
                {Object.entries(HORIZONS).map(([key, h]) => {
                  const actual = pct(key);
                  const diff = actual - h.target;
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <span className={`text-xs font-bold ${h.text}`}>{h.label}</span>
                        <span className="text-xs font-bold">{actual}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className={`h-full ${h.color}`} style={{ width: `${actual}%` }} />
                      </div>
                      {total > 0 && (
                        <p
                          className={`text-[10px] mt-1 flex items-center gap-1 ${
                            Math.abs(diff) <= 5
                              ? "text-on-surface-variant"
                              : diff > 0
                              ? "text-secondary"
                              : "text-error"
                          }`}
                        >
                          <Icon
                            name={
                              Math.abs(diff) <= 5
                                ? "check"
                                : diff > 0
                                ? "trending_up"
                                : "trending_down"
                            }
                            className="text-[12px]"
                          />
                          {Math.abs(diff) <= 5
                            ? `Balanced (target ${h.target}%)`
                            : diff > 0
                            ? `Overweight (target ${h.target}%)`
                            : `Under target (${h.target}%)`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 bg-white border border-outline-variant rounded-xl p-5 flex flex-col">
              <h3 className="text-lg font-bold text-primary mb-4">Initiatives</h3>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {classified.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${HORIZONS[item.horizon].color} flex items-center justify-center text-white shrink-0`}
                    >
                      <Icon name="flag" className="text-[16px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-primary truncate">{item.name}</h5>
                      <div
                        className={`mt-1 px-2 py-0.5 rounded-full ${HORIZONS[item.horizon].text} bg-surface-container text-[9px] font-bold w-fit uppercase`}
                      >
                        {HORIZONS[item.horizon].label}
                      </div>
                    </div>
                  </div>
                ))}
                {classified.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center py-4">
                    Add an initiative to place it on the horizon map.
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
