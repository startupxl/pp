import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    frameworks: [
      {
        id: "soc2",
        name: "SOC2 Type II",
        subtitle: "Security & Confidentiality",
        items: [
          { id: "s1", label: "Access control policy review", done: true },
          { id: "s2", label: "Encryption at rest verification", done: true },
          { id: "s3", label: "Vendor risk assessment", done: false },
          { id: "s4", label: "Intrusion detection log export", done: false },
        ],
      },
      {
        id: "gdpr",
        name: "GDPR Privacy",
        subtitle: "EU Data Compliance",
        items: [
          { id: "g1", label: "DPA with sub-processors", done: true },
          { id: "g2", label: "Updated Cookie Policy", done: false },
          { id: "g3", label: "Data Subject Access Requests", done: true },
          { id: "g4", label: "Right to be forgotten workflow", done: false },
        ],
      },
    ],
    documents: [
      { id: "d1", name: "Information Security Policy.pdf", owner: "Sarah Chen", status: "Verified" },
      { id: "d2", name: "AWS Environment Logs Q3.csv", owner: "System", status: "Verified" },
      { id: "d3", name: "HR Background Checks", owner: "Alex Rivera", status: "Pending" },
    ],
    deadlines: [
      { id: "dl1", label: "Annual Privacy Impact Assessment", urgency: "Overdue" },
      { id: "dl2", label: "CCPA Data Mapping Update", urgency: "Next 7 Days" },
      { id: "dl3", label: "SOC2 Audit Kickoff", urgency: "Next Month" },
    ],
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeCompliance(data) {
  const frameworks = data.frameworks || [];
  const withProgress = frameworks.map((f) => {
    const done = f.items.filter((i) => i.done).length;
    const total = f.items.length;
    return { ...f, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  });
  const totalItems = withProgress.reduce((s, f) => s + f.total, 0);
  const totalDone = withProgress.reduce((s, f) => s + f.done, 0);
  const readinessScore = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;
  const overdueCount = (data.deadlines || []).filter((d) => d.urgency === "Overdue").length;
  return { withProgress, readinessScore, overdueCount };
}

export default function ComplianceHub() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
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
        <div className="p-10 text-on-surface-variant">Loading compliance hub…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeCompliance(data);

  function toggleItem(fid, iid) {
    updateData({
      frameworks: data.frameworks.map((f) =>
        f.id !== fid ? f : { ...f, items: f.items.map((i) => (i.id === iid ? { ...i, done: !i.done } : i)) }
      ),
    });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Legal & Compliance Hub</div>
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
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="text-xs uppercase text-on-surface-variant mb-2">Audit Readiness</div>
            <div className="text-5xl font-bold text-primary mb-4">{analysis.readinessScore}%</div>
            <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${analysis.readinessScore}%` }} />
            </div>
            {analysis.overdueCount > 0 && (
              <p className="text-xs text-error mt-4">{analysis.overdueCount} deadline(s) overdue.</p>
            )}
          </div>
          {analysis.withProgress.map((f) => (
            <div key={f.id} className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-primary text-sm">{f.name}</h3>
                  <p className="text-xs text-on-surface-variant">{f.subtitle}</p>
                </div>
                <span className="text-xs text-on-surface-variant">{f.done}/{f.total}</span>
              </div>
              <ul className="space-y-3">
                {f.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 cursor-pointer" onClick={() => toggleItem(f.id, i.id)}>
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${i.done ? "border-secondary bg-secondary" : "border-outline-variant"}`}>
                      {i.done && <Icon name="check" className="text-[14px] text-white" />}
                    </span>
                    <span className={`text-sm ${i.done ? "text-primary" : "text-on-surface-variant"}`}>{i.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant">
              <h3 className="font-bold text-primary">Document Vault</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Document</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Owner</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {data.documents.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-primary">{d.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{d.owner}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${d.status === "Verified" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-6 flex items-center gap-2"><Icon name="event" className="text-secondary" /> Regulatory Deadlines</h3>
            <div className="space-y-4">
              {data.deadlines.map((dl) => (
                <div key={dl.id} className="pl-4 border-l-2 border-secondary">
                  <p className={`text-[10px] font-bold uppercase ${dl.urgency === "Overdue" ? "text-error" : "text-secondary"}`}>{dl.urgency}</p>
                  <p className="text-sm font-medium text-primary">{dl.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
