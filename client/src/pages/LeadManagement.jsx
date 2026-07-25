import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const SOURCES = ["LinkedIn", "Referral", "Organic", "Other"];
const STATUSES = ["Hot", "Warm", "Cold"];

function defaultData() {
  return {
    leads: [
      { id: "l1", name: "Jordan Dorsey", company: "CloudScale", status: "Hot", source: "LinkedIn", nextAction: "Intro Call" },
      { id: "l2", name: "Sarah Miller", company: "FinTech Solutions", status: "Warm", source: "Referral", nextAction: "Send Case Study" },
      { id: "l3", name: "Marcus King", company: "GreenAgri", status: "Cold", source: "Organic", nextAction: "Follow-up Bump" },
    ],
  };
}

const STATUS_META = {
  Hot: "bg-error-container text-on-error-container",
  Warm: "bg-secondary-container text-on-secondary-container",
  Cold: "bg-surface-container-high text-on-surface-variant",
};

// Deterministic heuristic — no external LLM call.
function analyzeLeads(data) {
  const leads = data.leads || [];
  const bySource = SOURCES.map((s) => ({ source: s, count: leads.filter((l) => l.source === s).length }));
  const maxCount = Math.max(1, ...bySource.map((s) => s.count));
  const hotCount = leads.filter((l) => l.status === "Hot").length;
  const topSource = bySource.reduce((max, s) => (max === null || s.count > max.count ? s : max), null);
  return { bySource, maxCount, hotCount, topSource, total: leads.length };
}

export default function LeadManagement() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draft, setDraft] = useState({ name: "", company: "", status: "Warm", source: "LinkedIn", nextAction: "" });
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
        <div className="p-10 text-on-surface-variant">Loading lead management workspace…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeLeads(data);

  function cycleStatus(lid) {
    updateData({
      leads: data.leads.map((l) => (l.id !== lid ? l : { ...l, status: STATUSES[(STATUSES.indexOf(l.status) + 1) % STATUSES.length] })),
    });
  }

  function addLead() {
    if (!draft.name.trim()) return;
    updateData({ leads: [...data.leads, { id: `l${Date.now()}`, ...draft }] });
    setDraft({ name: "", company: "", status: "Warm", source: "LinkedIn", nextAction: "" });
  }

  function removeLead(lid) {
    updateData({ leads: data.leads.filter((l) => l.id !== lid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Lead Management Workspace</div>
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
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-6">Conversion by Source</h3>
            <div className="flex items-end gap-6 h-40">
              {analysis.bySource.map((s) => (
                <div key={s.source} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-surface-container-low rounded-t-lg relative" style={{ height: "100%" }}>
                    <div className="absolute bottom-0 w-full bg-secondary rounded-t-lg transition-all" style={{ height: `${(s.count / analysis.maxCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant">{s.source}</span>
                  <span className="text-xs text-secondary font-bold">{s.count}</span>
                </div>
              ))}
            </div>
            {analysis.topSource && analysis.topSource.count > 0 && (
              <p className="text-xs text-on-surface-variant mt-4">
                <strong className="text-secondary">{analysis.topSource.source}</strong> is your top-performing source with {analysis.topSource.count} leads.
              </p>
            )}
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-sm text-center">
              <div className="text-2xl font-bold text-primary">{analysis.total}</div>
              <div className="text-[10px] uppercase font-bold text-on-surface-variant">Total Leads</div>
            </div>
            <div className="bg-error-container/20 rounded-2xl p-5 border border-error/20 shadow-sm text-center">
              <div className="text-2xl font-bold text-error">{analysis.hotCount}</div>
              <div className="text-[10px] uppercase font-bold text-error">Hot Leads</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="font-bold text-primary">Active Prospects</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Lead</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Source</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Next Action</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {data.leads.map((l) => (
                <tr key={l.id} className="group">
                  <td className="px-4 py-3">
                    <div className="font-medium text-primary">{l.name}</div>
                    <div className="text-xs text-on-surface-variant">{l.company}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => cycleStatus(l.id)} className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${STATUS_META[l.status]}`}>{l.status}</button>
                  </td>
                  <td className="px-4 py-3">{l.source}</td>
                  <td className="px-4 py-3">{l.nextAction}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeLead(l.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 p-4 border-t border-outline-variant/30 flex-wrap">
            <input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} placeholder="Lead name" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <input value={draft.company} onChange={(e) => setDraft((v) => ({ ...v, company: e.target.value }))} placeholder="Company" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <select value={draft.source} onChange={(e) => setDraft((v) => ({ ...v, source: e.target.value }))} className="text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary">
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={draft.nextAction} onChange={(e) => setDraft((v) => ({ ...v, nextAction: e.target.value }))} placeholder="Next action" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
            <button onClick={addLead} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
