import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

const COLUMNS = [
  { key: "start", label: "Start", icon: "play_arrow", classes: "bg-secondary-container text-secondary" },
  { key: "stop", label: "Stop", icon: "stop", classes: "bg-error-container text-error" },
  { key: "continue", label: "Continue", icon: "sync", classes: "bg-surface-container-highest text-primary" },
];

function analyzeRetro(columns, actionItems) {
  const totalNotes = COLUMNS.reduce((s, c) => s + (columns[c.key] || []).length, 0);
  if (totalNotes === 0) {
    return { insight: "Add sticky notes to Start, Stop, and Continue to begin the retrospective." };
  }
  const allNotes = COLUMNS.flatMap((c) => (columns[c.key] || []).map((n) => ({ ...n, column: c.label })));
  const topVoted = [...allNotes].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
  const doneActions = actionItems.filter((a) => a.done).length;
  const insight = `Most-voted item: "${topVoted.text}" (${topVoted.votes || 0} votes) in ${topVoted.column}. ${
    actionItems.length > 0
      ? `${doneActions}/${actionItems.length} action items completed so far.`
      : "Convert top-voted items into action items to close the loop."
  }`;
  return { insight, topVoted };
}

export default function Retrospective() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [newNote, setNewNote] = useState({});
  const [newAction, setNewAction] = useState("");
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

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading retrospective board…</div>
      </Layout>
    );
  }

  const columns = doc.data?.columns || { start: [], stop: [], continue: [] };
  const actionItems = doc.data?.actionItems || [];

  function addNote(colKey) {
    const text = (newNote[colKey] || "").trim();
    if (!text) return;
    updateData({
      columns: {
        ...columns,
        [colKey]: [...(columns[colKey] || []), { id: `n${Date.now()}`, text, votes: 0 }],
      },
    });
    setNewNote((v) => ({ ...v, [colKey]: "" }));
  }

  function vote(colKey, noteId, delta) {
    updateData({
      columns: {
        ...columns,
        [colKey]: (columns[colKey] || []).map((n) =>
          n.id === noteId ? { ...n, votes: Math.max(0, (n.votes || 0) + delta) } : n
        ),
      },
    });
  }

  function removeNote(colKey, noteId) {
    updateData({
      columns: { ...columns, [colKey]: (columns[colKey] || []).filter((n) => n.id !== noteId) },
    });
  }

  function addAction() {
    if (!newAction.trim()) return;
    updateData({
      actionItems: [...actionItems, { id: `a${Date.now()}`, text: newAction.trim(), done: false, priority: false }],
    });
    setNewAction("");
  }

  function toggleAction(aid) {
    updateData({ actionItems: actionItems.map((a) => (a.id === aid ? { ...a, done: !a.done } : a)) });
  }

  function togglePriority(aid) {
    updateData({ actionItems: actionItems.map((a) => (a.id === aid ? { ...a, priority: !a.priority } : a)) });
  }

  function removeAction(aid) {
    updateData({ actionItems: actionItems.filter((a) => a.id !== aid) });
  }

  const analysis = analyzeRetro(columns, actionItems);

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">
              Retrospective Workshop
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

        <p className="text-on-surface-variant max-w-2xl mb-6">
          Framework: Start, Stop, Continue. Vote on the notes that matter most, then convert them
          into action items.
        </p>

        <div className="bg-white border border-secondary/20 rounded-xl p-4 mb-8 flex items-center gap-3">
          <Icon name="auto_awesome" filled className="text-secondary" />
          <p className="text-sm text-on-surface">{analysis.insight}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${col.classes}`}>
                    <Icon name={col.icon} className="text-[20px]" />
                  </div>
                  <h3 className="text-lg font-bold text-primary">{col.label}</h3>
                </div>
                <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs font-semibold text-primary">
                  {(columns[col.key] || []).length}
                </span>
              </div>
              {(columns[col.key] || [])
                .slice()
                .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                .map((note) => (
                  <div key={note.id} className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm group">
                    <p className="text-sm text-on-surface mb-3">{note.text}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => vote(col.key, note.id, -1)}
                          className="text-on-surface-variant hover:text-error"
                        >
                          <Icon name="remove" className="text-[16px]" />
                        </button>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full border border-outline-variant text-xs">
                          <Icon name="thumb_up" className="text-[14px]" />
                          {note.votes || 0}
                        </span>
                        <button
                          onClick={() => vote(col.key, note.id, 1)}
                          className="text-on-surface-variant hover:text-secondary"
                        >
                          <Icon name="add" className="text-[16px]" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeNote(col.key, note.id)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                      >
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    </div>
                  </div>
                ))}
              <div className="flex gap-2">
                <input
                  value={newNote[col.key] || ""}
                  onChange={(e) => setNewNote((v) => ({ ...v, [col.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addNote(col.key)}
                  placeholder={`Add to ${col.label.toLowerCase()}...`}
                  className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
                />
                <button
                  onClick={() => addNote(col.key)}
                  disabled={!(newNote[col.key] || "").trim()}
                  className="px-3 py-2 bg-secondary text-white rounded-md text-sm disabled:opacity-40"
                >
                  <Icon name="add" className="text-[16px]" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="task_alt" className="text-secondary" />
            <h4 className="text-sm font-semibold text-primary">Summary Action Items</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {actionItems.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/50 group ${a.done ? "opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={a.done}
                  onChange={() => toggleAction(a.id)}
                  className="w-4 h-4 rounded border-outline-variant text-secondary"
                />
                <span className={`text-sm flex-1 ${a.done ? "line-through" : ""}`}>{a.text}</span>
                <button
                  onClick={() => togglePriority(a.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    a.priority ? "bg-secondary-container/40 text-secondary" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {a.priority ? "PRIORITY" : "mark priority"}
                </button>
                <button
                  onClick={() => removeAction(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              </div>
            ))}
            {actionItems.length === 0 && (
              <p className="text-sm text-on-surface-variant md:col-span-2">No action items yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAction()}
              placeholder="Add action item"
              className="flex-1 text-sm border border-outline-variant rounded-md px-3 py-2 outline-none focus:border-secondary"
            />
            <button
              onClick={addAction}
              disabled={!newAction.trim()}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
