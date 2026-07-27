import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import FrameworkGuide from "../components/FrameworkGuide";
import { api } from "../api";

function defaultData() {
  return {
    runwayMonths: 18.4,
    capTable: [
      { id: "c1", holder: "Founders", pct: 52.4 },
      { id: "c2", holder: "Lead Investors", pct: 28.1 },
      { id: "c3", holder: "Angel Syndicate", pct: 11.5 },
      { id: "c4", holder: "ESOP Pool", pct: 8.0 },
    ],
    updateSections: [
      { id: "u1", name: "Executive Summary", note: "Auto-generated from high-level milestones", done: true },
      { id: "u2", name: "Key Metrics & KPIs", note: "Active users, MRR, Churn (synced)", done: true },
      { id: "u3", name: "The Ask", note: "Where you need investor help", done: false },
    ],
    documents: [
      { id: "d1", name: "Series A Term Sheet", type: "pdf" },
      { id: "d2", name: "Articles of Incorporation", type: "doc" },
      { id: "d3", name: "Q3 Board Deck - Final", type: "slides" },
      { id: "d4", name: "Consolidated Financials FY24", type: "sheet" },
    ],
    activity: [
      { id: "a1", name: "Sarah Chen", org: "Blue Chip Ventures", action: "Accessed Vault: Series A Deck", date: "Oct 12, 2026", status: "Verified" },
      { id: "a2", name: "Marcus Bloom", org: "Bloom Angels", action: "Signed: Consent for Board Action", date: "Oct 10, 2026", status: "Signed" },
    ],
  };
}

const DOC_ICONS = { pdf: "picture_as_pdf", doc: "description", slides: "slideshow", sheet: "table_chart" };

// Deterministic heuristic — no external LLM call.
function analyzeInvestorRelations(data) {
  const capTable = data.capTable || [];
  const totalPct = capTable.reduce((s, c) => s + Number(c.pct || 0), 0);
  const founderPct = capTable.find((c) => /founder/i.test(c.holder))?.pct || 0;
  const dilutionRisk = founderPct < 50 ? "high" : founderPct < 60 ? "moderate" : "low";
  const updateProgress = data.updateSections.length
    ? Math.round((data.updateSections.filter((s) => s.done).length / data.updateSections.length) * 100)
    : 0;
  const runwayFlag = data.runwayMonths < 6 ? "critical" : data.runwayMonths < 12 ? "watch" : "healthy";
  return { totalPct, founderPct, dilutionRisk, updateProgress, runwayFlag };
}

export default function InvestorRelations() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draftDoc, setDraftDoc] = useState({ name: "", type: "pdf" });
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
        <div className="p-10 text-on-surface-variant">Loading investor relations hub…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeInvestorRelations(data);

  function updateCapRow(cid, patch) {
    updateData({ capTable: data.capTable.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });
  }

  function toggleSection(sid) {
    updateData({ updateSections: data.updateSections.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)) });
  }

  function addDocument() {
    if (!draftDoc.name.trim()) return;
    updateData({ documents: [...data.documents, { id: `d${Date.now()}`, name: draftDoc.name.trim(), type: draftDoc.type }] });
    setDraftDoc({ name: "", type: "pdf" });
  }

  function removeDocument(did) {
    updateData({ documents: data.documents.filter((d) => d.id !== did) });
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Investor Relations</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <FrameworkGuide toolKey="investor_relations" className="mb-6 max-w-2xl" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Runway</p>
            <p className={`text-3xl font-bold ${analysis.runwayFlag === "critical" ? "text-error" : "text-primary"}`}>{data.runwayMonths}mo</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Founder Ownership</p>
            <p className="text-3xl font-bold text-primary">{analysis.founderPct}%</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Update Progress</p>
            <p className="text-3xl font-bold text-secondary">{analysis.updateProgress}%</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Documents</p>
            <p className="text-3xl font-bold text-primary">{data.documents.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <h3 className="font-bold text-primary mb-4">Ownership Summary</h3>
              <div className="space-y-3 mb-2">
                {data.capTable.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <input value={c.holder} onChange={(e) => updateCapRow(c.id, { holder: e.target.value })} className="flex-1 text-sm bg-transparent outline-none" />
                    <input type="range" min="0" max="100" step="0.1" value={c.pct} onChange={(e) => updateCapRow(c.id, { pct: Number(e.target.value) })} className="w-32 accent-primary" />
                    <span className="w-14 text-right text-sm font-bold">{Number(c.pct).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              {Math.abs(analysis.totalPct - 100) > 0.5 && (
                <p className="text-xs text-error mt-2">Ownership totals {analysis.totalPct.toFixed(1)}% — adjust to reach 100%.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <h3 className="font-bold text-primary mb-4">Monthly Update Builder</h3>
              <div className="space-y-3">
                {data.updateSections.map((s) => (
                  <div key={s.id} onClick={() => toggleSection(s.id)} className="flex items-center gap-4 p-3 rounded-xl border border-outline-variant cursor-pointer hover:border-secondary transition-all">
                    <Icon name={s.done ? "check_circle" : "radio_button_unchecked"} className={s.done ? "text-secondary" : "text-outline-variant"} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-on-surface-variant">{s.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
              <h3 className="font-bold text-primary mb-4">Recent Stakeholder Activity</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase">
                    <th className="pb-2">Stakeholder</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {data.activity.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-on-surface-variant">{a.org}</p>
                      </td>
                      <td className="py-3 text-xs">{a.action}</td>
                      <td className="py-3 text-xs text-on-surface-variant">{a.date}</td>
                      <td className="py-3">
                        <span className="text-[10px] font-bold uppercase bg-secondary-container/40 text-on-secondary-container px-2 py-1 rounded">{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="verified_user" className="text-secondary" />
              <h3 className="font-bold text-primary">Secure Document Vault</h3>
            </div>
            <div className="space-y-2 mb-4">
              {data.documents.map((d) => (
                <div key={d.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low border border-transparent hover:border-outline-variant transition-all">
                  <div className="flex items-center gap-3">
                    <Icon name={DOC_ICONS[d.type] || "description"} className="text-on-surface-variant text-[20px]" />
                    <span className="text-sm">{d.name}</span>
                  </div>
                  <button onClick={() => removeDocument(d.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[16px]" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={draftDoc.name} onChange={(e) => setDraftDoc((v) => ({ ...v, name: e.target.value }))} placeholder="Document name" className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary" />
              <select value={draftDoc.type} onChange={(e) => setDraftDoc((v) => ({ ...v, type: e.target.value }))} className="text-sm border border-outline-variant rounded-lg px-2 py-2 outline-none">
                <option value="pdf">PDF</option>
                <option value="doc">Doc</option>
                <option value="slides">Slides</option>
                <option value="sheet">Sheet</option>
              </select>
              <button onClick={addDocument} className="px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-1 text-sm"><Icon name="upload" className="text-[16px]" /></button>
            </div>
            {analysis.dilutionRisk === "high" && (
              <div className="mt-6 p-3 rounded-lg bg-error-container/20 border border-error/20 text-xs text-error">
                Founder ownership below 50% — dilution risk is high. Review upcoming rounds carefully.
              </div>
            )}
            {analysis.runwayFlag === "critical" && (
              <div className="mt-3 p-3 rounded-lg bg-error-container/20 border border-error/20 text-xs text-error">
                Runway under 6 months — prioritize fundraising outreach.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
