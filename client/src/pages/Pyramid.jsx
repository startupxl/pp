import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const EVIDENCE_ICONS = ["bar_chart", "groups", "verified", "savings"];

function defaultData() {
  return {
    answer: "",
    arguments: [
      { id: "a1", label: "Market Opportunity", text: "", evidence: [] },
      { id: "a2", label: "Competitive Advantage", text: "", evidence: [] },
      { id: "a3", label: "Financial Feasibility", text: "", evidence: [] },
    ],
  };
}

function computeAudit(data) {
  const args = data.arguments || [];
  const texts = args.map((a) => (a.text || "").trim().toLowerCase()).filter(Boolean);
  const mutuallyExclusive = new Set(texts).size === texts.length;
  const filledArgs = args.filter((a) => a.text?.trim());
  const collectivelyExhaustive = filledArgs.length >= 3;
  const hierarchicalGrouping = args.every((a) => !a.text?.trim() || a.evidence.length > 0);
  const gapCount = args.length - filledArgs.length;
  return { mutuallyExclusive, collectivelyExhaustive, hierarchicalGrouping, gapCount };
}

function computeReadiness(data) {
  const args = data.arguments || [];
  let score = data.answer?.trim() ? 25 : 0;
  const perArg = 75 / Math.max(args.length, 1);
  args.forEach((a) => {
    if (a.text?.trim()) score += perArg * 0.5;
    if (a.evidence.length > 0) score += perArg * 0.5;
  });
  return Math.round(Math.min(100, score));
}

export default function Pyramid() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      const data = { ...defaultData(), ...(d.data || {}) };
      setDoc({ ...d, data });
      setTitle(d.title);
    });
  }, [id]);

  function scheduleSave(patch) {
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = await api.updateDocument(id, patch);
      setSaveState("Saved");
    }, 500);
  }

  function updateData(mutator) {
    setDoc((d) => {
      const nextData = mutator(structuredCloneSafe(d.data));
      scheduleSave({ data: nextData });
      return { ...d, data: nextData };
    });
  }

  function structuredCloneSafe(obj) {
    return typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
  }

  function onTitleBlur() {
    if (doc && title !== doc.title) scheduleSave({ title });
  }

  function addEvidence(argId) {
    updateData((data) => {
      const arg = data.arguments.find((a) => a.id === argId);
      arg.evidence.push({ id: `e${Date.now()}`, text: "" });
      return data;
    });
  }

  function updateEvidence(argId, evId, text) {
    updateData((data) => {
      const arg = data.arguments.find((a) => a.id === argId);
      const ev = arg.evidence.find((e) => e.id === evId);
      ev.text = text;
      return data;
    });
  }

  function removeEvidence(argId, evId) {
    updateData((data) => {
      const arg = data.arguments.find((a) => a.id === argId);
      arg.evidence = arg.evidence.filter((e) => e.id !== evId);
      return data;
    });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading pyramid workspace…</div>
      </Layout>
    );
  }

  const audit = computeAudit(doc.data);
  const readiness = computeReadiness(doc.data);

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Pyramid Principle Workspace
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
              Save Draft
            </button>
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
              <Icon name="slideshow" className="text-[18px]" />
              Export Slides
            </button>
          </div>
        </div>

        {/* Level 1 */}
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase text-on-surface-variant mb-2">
            Level 1 — Key Recommendation
          </div>
          <textarea
            value={doc.data.answer}
            onChange={(e) => updateData((data) => ({ ...data, answer: e.target.value }))}
            placeholder="State the single, top-line answer your audience should walk away with…"
            rows={2}
            className="w-full bg-primary text-white placeholder-white/50 rounded-lg p-5 text-lg font-semibold outline-none resize-none"
          />
        </div>

        {/* Level 2 */}
        <div className="mb-3 text-xs font-semibold uppercase text-on-surface-variant">
          Level 2 — Supporting Arguments
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {doc.data.arguments.map((arg, i) => (
            <div key={arg.id} className="bg-white border border-outline-variant rounded-lg p-4">
              <div className="text-sm font-bold mb-2">{arg.label}</div>
              <textarea
                value={arg.text}
                onChange={(e) =>
                  updateData((data) => {
                    data.arguments[i].text = e.target.value;
                    return data;
                  })
                }
                placeholder="Why does this support the recommendation?"
                rows={3}
                className="w-full text-sm outline-none resize-none border border-outline-variant rounded-md p-2"
              />

              {/* Level 3 evidence for this argument */}
              <div className="mt-3 space-y-2">
                {arg.evidence.map((ev, idx) => (
                  <div key={ev.id} className="flex items-start gap-2 bg-surface-container-low rounded-md p-2">
                    <Icon
                      name={EVIDENCE_ICONS[idx % EVIDENCE_ICONS.length]}
                      className="text-secondary text-[16px] mt-0.5"
                    />
                    <input
                      value={ev.text}
                      onChange={(e) => updateEvidence(arg.id, ev.id, e.target.value)}
                      placeholder="Supporting evidence…"
                      className="flex-1 text-xs bg-transparent outline-none"
                    />
                    <button
                      onClick={() => removeEvidence(arg.id, ev.id)}
                      className="text-on-surface-variant hover:text-on-surface"
                    >
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addEvidence(arg.id)}
                  className="w-full text-xs font-semibold text-secondary border border-dashed border-outline-variant rounded-md py-1.5 flex items-center justify-center gap-1"
                >
                  <Icon name="add" className="text-[14px]" />
                  Add Evidence
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-outline-variant rounded-lg p-5">
            <div className="text-sm font-semibold mb-2">Presentation Readiness</div>
            <div className="text-2xl font-bold mb-2">{readiness}%</div>
            <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${readiness}%` }} />
            </div>
          </div>
          <div className="bg-white border border-outline-variant rounded-lg p-5">
            <div className="text-sm font-semibold mb-3">Logical Flow Auditor</div>
            <div className="space-y-2 text-sm">
              <AuditRow label="Mutually Exclusive" pass={audit.mutuallyExclusive} />
              <AuditRow
                label="Collectively Exhaustive"
                pass={audit.collectivelyExhaustive}
                failText={`${audit.gapCount} GAP${audit.gapCount === 1 ? "" : "S"} FOUND`}
              />
              <AuditRow label="Hierarchical Grouping" pass={audit.hierarchicalGrouping} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function AuditRow({ label, pass, failText }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          pass ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        {pass ? "PASSED" : failText || "FAILED"}
      </span>
    </div>
  );
}
