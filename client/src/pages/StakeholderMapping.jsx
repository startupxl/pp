import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    stakeholders: [
      { id: "s1", name: "CEO Office", role: "Executive Sponsor", power: 85, interest: 30 },
      { id: "s2", name: "Tech Lead", role: "Implementation", power: 65, interest: 80 },
      { id: "s3", name: "Lead Investor", role: "Board", power: 90, interest: 70 },
      { id: "s4", name: "Suppliers", role: "Vendor", power: 25, interest: 20 },
      { id: "s5", name: "Community", role: "End Users", power: 15, interest: 75 },
    ],
  };
}

const QUADRANTS = {
  manage: { label: "Manage Closely", color: "text-secondary", dot: "bg-secondary", desc: "High power, high interest. These are your key players. Focus your efforts here.", tactics: ["Weekly 1-on-1 strategy syncs", "Involve in early decision phases"] },
  satisfy: { label: "Keep Satisfied", color: "text-primary-fixed-dim", dot: "bg-primary", desc: "High power, low interest. Meet their needs but don't overwhelm with detail.", tactics: ["Monthly executive summaries"] },
  inform: { label: "Keep Informed", color: "text-secondary-fixed", dot: "bg-secondary-fixed", desc: "Low power, high interest. Keep them updated to maintain support.", tactics: ["Bi-weekly project newsletter"] },
  monitor: { label: "Monitor", color: "text-on-surface-variant", dot: "bg-outline-variant", desc: "Low power, low interest. Minimum effort required.", tactics: [] },
};

function quadrantFor(power, interest) {
  if (power >= 50 && interest >= 50) return "manage";
  if (power >= 50 && interest < 50) return "satisfy";
  if (power < 50 && interest >= 50) return "inform";
  return "monitor";
}

// Deterministic heuristic — no external LLM call.
function analyzeStakeholders(data) {
  const stakeholders = (data.stakeholders || []).map((s) => ({ ...s, quadrant: quadrantFor(Number(s.power), Number(s.interest)) }));
  const grouped = { manage: [], satisfy: [], inform: [], monitor: [] };
  stakeholders.forEach((s) => grouped[s.quadrant].push(s));
  return { stakeholders, grouped };
}

export default function StakeholderMapping() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState({ name: "", role: "" });
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
        <div className="p-10 text-on-surface-variant">Loading stakeholder map…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeStakeholders(data);

  function updateStakeholder(sid, patch) {
    updateData({ stakeholders: data.stakeholders.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  }

  function removeStakeholder(sid) {
    updateData({ stakeholders: data.stakeholders.filter((s) => s.id !== sid) });
  }

  function addStakeholder() {
    if (!draft.name.trim()) return;
    updateData({ stakeholders: [...data.stakeholders, { id: `s${Date.now()}`, name: draft.name.trim(), role: draft.role.trim(), power: 50, interest: 50 }] });
    setDraft({ name: "", role: "" });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Stakeholder Mapping</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="font-bold text-primary">Power / Interest Matrix</h2>
                <p className="text-sm text-on-surface-variant">Drag the sliders below to position each stakeholder.</p>
              </div>
            </div>
            <div className="relative bg-white rounded-2xl border border-outline-variant shadow-sm aspect-[16/10] overflow-hidden">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">
                Power High ・ Power Low
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">
                Interest Low ・ Interest High
              </div>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-outline-variant/50" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-outline-variant/50" />
              <div className="absolute inset-0 m-10">
                {analysis.stakeholders.map((s) => (
                  <div
                    key={s.id}
                    title={`${s.name} — ${QUADRANTS[s.quadrant].label}`}
                    className="absolute flex flex-col items-center -translate-x-1/2 translate-y-1/2"
                    style={{ left: `${Number(s.interest)}%`, bottom: `${Number(s.power)}%` }}
                  >
                    <div className={`w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold ${QUADRANTS[s.quadrant].dot}`}>
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="mt-1 bg-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow border border-outline-variant whitespace-nowrap">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <h3 className="font-bold text-primary mb-4">Stakeholders</h3>
              <div className="space-y-4 mb-4">
                {data.stakeholders.map((s) => (
                  <div key={s.id} className="group grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 rounded-lg border border-outline-variant">
                    <div>
                      <input value={s.name} onChange={(e) => updateStakeholder(s.id, { name: e.target.value })} className="font-medium text-sm bg-transparent outline-none w-full" />
                      <input value={s.role} onChange={(e) => updateStakeholder(s.id, { role: e.target.value })} placeholder="Role" className="text-xs text-on-surface-variant bg-transparent outline-none w-full" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-on-surface-variant w-14">Power</span>
                      <input type="range" min="0" max="100" value={s.power} onChange={(e) => updateStakeholder(s.id, { power: Number(e.target.value) })} className="w-24 accent-primary" />
                      <span className="w-8 text-right">{s.power}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-on-surface-variant w-14">Interest</span>
                      <input type="range" min="0" max="100" value={s.interest} onChange={(e) => updateStakeholder(s.id, { interest: Number(e.target.value) })} className="w-24 accent-secondary" />
                      <span className="w-8 text-right">{s.interest}</span>
                    </div>
                    <button onClick={() => removeStakeholder(s.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error justify-self-end"><Icon name="close" className="text-[16px]" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} placeholder="Stakeholder name" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
                <input value={draft.role} onChange={(e) => setDraft((v) => ({ ...v, role: e.target.value }))} placeholder="Role" className="w-40 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
                <button onClick={addStakeholder} className="px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-1 text-sm"><Icon name="person_add" className="text-[16px]" /> Add</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <Icon name="strategy" className="text-secondary" />
              <h3 className="font-bold text-primary">Engagement Strategies</h3>
            </div>
            <div className="space-y-6">
              {Object.entries(QUADRANTS).map(([key, q]) => (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-2 h-2 rounded-full ${q.dot}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{q.label}</h4>
                    <span className="ml-auto text-xs text-on-surface-variant">{analysis.grouped[key].length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant mb-2 leading-relaxed">{q.desc}</p>
                    {analysis.grouped[key].length > 0 && (
                      <p className="text-xs font-medium text-primary mb-2">{analysis.grouped[key].map((s) => s.name).join(", ")}</p>
                    )}
                    {q.tactics.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs mt-1">
                        <Icon name="check_circle" className="text-secondary text-[14px] mt-0.5" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
