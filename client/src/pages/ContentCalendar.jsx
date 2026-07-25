import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const CHANNELS = [
  { id: "blog", label: "Blog", color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  { id: "social", label: "Social", color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
  { id: "email", label: "Email", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  { id: "video", label: "Video", color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
];

function defaultData() {
  return {
    objectives: [
      { id: "o1", title: "Brand Authority", description: "Establish the product as the #1 tool for solopreneurs." },
      { id: "o2", title: "Product Launch", description: "Drive signups for the new module." },
      { id: "o3", title: "Retention", description: "Increase active daily usage through education." },
    ],
    items: [
      { id: "i1", title: "Scaling Fast", channel: "blog", date: "", status: "scheduled" },
      { id: "i2", title: "System Tease", channel: "social", date: "", status: "scheduled" },
      { id: "i3", title: "10m Workflow", channel: "video", date: "", status: "draft" },
      { id: "i4", title: "Weekly Intel", channel: "email", date: "", status: "published" },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeCalendar(data) {
  const items = data.items || [];
  const byChannel = CHANNELS.map((c) => ({ ...c, count: items.filter((i) => i.channel === c.id).length }));
  const published = items.filter((i) => i.status === "published").length;
  const scheduled = items.filter((i) => i.status === "scheduled").length;
  const draft = items.filter((i) => i.status === "draft").length;
  const completion = items.length ? (published / items.length) * 100 : 0;
  const busiestChannel = byChannel.reduce((max, c) => (max === null || c.count > max.count ? c : max), null);
  return { byChannel, published, scheduled, draft, completion, busiestChannel, total: items.length };
}

const STATUS_ORDER = ["draft", "scheduled", "published"];
const STATUS_META = {
  draft: { label: "Draft", color: "bg-surface-container text-on-surface-variant" },
  scheduled: { label: "Scheduled", color: "bg-secondary-container text-on-secondary-container" },
  published: { label: "Published", color: "bg-green-100 text-green-700" },
};

export default function ContentCalendar() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draftItem, setDraftItem] = useState({ title: "", channel: "blog", date: "" });
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc({ ...d, data: { ...defaultData(), ...(d.data || {}) } });
      setTitle(d.title);
    });
  }, [id]);

  function scheduleSave(patch) {
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.updateDocument(id, patch);
      setSaveState("Saved");
    }, 500);
  }

  function updateData(patch) {
    setDoc((d) => {
      const data = { ...d.data, ...patch };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function onTitleBlur() {
    if (doc && title !== doc.title) scheduleSave({ title });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading content calendar…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeCalendar(data);

  function cycleStatus(iid) {
    updateData({
      items: data.items.map((i) =>
        i.id !== iid ? i : { ...i, status: STATUS_ORDER[(STATUS_ORDER.indexOf(i.status) + 1) % STATUS_ORDER.length] }
      ),
    });
  }

  function addItem() {
    if (!draftItem.title.trim()) return;
    updateData({ items: [...data.items, { id: `i${Date.now()}`, status: "draft", ...draftItem }] });
    setDraftItem({ title: "", channel: "blog", date: "" });
  }

  function removeItem(iid) {
    updateData({ items: data.items.filter((i) => i.id !== iid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Content Calendar Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
              <h3 className="font-bold text-primary mb-3 text-sm">Campaign Objectives</h3>
              <div className="space-y-3">
                {data.objectives.map((o) => (
                  <div key={o.id} className="p-3 bg-surface-container-low rounded-lg border-l-4 border-secondary">
                    <p className="text-sm font-medium text-primary">{o.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{o.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center border border-outline-variant shadow-sm">
                <div className="text-2xl font-bold text-secondary">{analysis.scheduled}</div>
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">Scheduled</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center border border-outline-variant shadow-sm">
                <div className="text-2xl font-bold text-primary">{analysis.draft}</div>
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">Draft</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm">
              <h3 className="font-bold text-primary mb-3 text-sm">Completion</h3>
              <div className="text-2xl font-bold text-primary mb-2">{analysis.completion.toFixed(0)}%</div>
              <div className="bg-surface-container-low rounded-full h-2 overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: `${analysis.completion}%` }} />
              </div>
              {analysis.busiestChannel && analysis.busiestChannel.count > 0 && (
                <p className="text-xs text-on-surface-variant mt-3">
                  <strong>{analysis.busiestChannel.label}</strong> is your busiest channel with {analysis.busiestChannel.count} items.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-9 bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-primary flex items-center gap-2"><Icon name="calendar_month" className="text-secondary" /> Content Items</h3>
              <div className="flex items-center gap-4 text-xs font-bold text-on-surface-variant uppercase">
                {CHANNELS.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${c.color}`} /> {c.label} ({analysis.byChannel.find((b) => b.id === c.id)?.count || 0})</div>
                ))}
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {data.items.map((item) => {
                const ch = CHANNELS.find((c) => c.id === item.channel) || CHANNELS[0];
                return (
                  <div key={item.id} className="group flex items-center gap-4 p-3 rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors">
                    <span className={`w-2.5 h-2.5 rounded-full ${ch.color} shrink-0`} />
                    <span className="flex-1 text-sm font-medium text-primary">{item.title}</span>
                    <span className="text-xs text-on-surface-variant">{item.date || "No date"}</span>
                    <button
                      onClick={() => cycleStatus(item.id)}
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_META[item.status].color}`}
                    >
                      {STATUS_META[item.status].label}
                    </button>
                    <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-4 border-t border-outline-variant/30">
              <input
                value={draftItem.title}
                onChange={(e) => setDraftItem((v) => ({ ...v, title: e.target.value }))}
                placeholder="Content title"
                className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
              />
              <select
                value={draftItem.channel}
                onChange={(e) => setDraftItem((v) => ({ ...v, channel: e.target.value }))}
                className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
              >
                {CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <input
                value={draftItem.date}
                onChange={(e) => setDraftItem((v) => ({ ...v, date: e.target.value }))}
                placeholder="Date"
                type="date"
                className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary"
              />
              <button onClick={addItem} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
