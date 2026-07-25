import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return { draftText: "", subjectLine: "" };
}

const ASK_WORDS = ["approve", "decide", "please", "need", "request", "recommend", "sign off", "confirm", "review by", "action required"];
const HEDGE_WORDS = ["might", "maybe", "perhaps", "sort of", "kind of", "i think", "possibly", "somewhat", "just wanted to", "i was wondering"];

// Deterministic heuristic — no external LLM call.
function analyzeBluf(data) {
  const text = (data.draftText || "").trim();
  if (!text) {
    return {
      hasContent: false,
      impact: 0,
      verbosity: "—",
      actionability: "—",
      bluf: "",
      subject: "",
      wordCount: 0,
      sentenceCount: 0,
    };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const wordCount = words.length;
  const sentenceCount = sentences.length || 1;
  const avgSentenceLen = wordCount / sentenceCount;

  const lower = text.toLowerCase();
  const askHits = ASK_WORDS.filter((w) => lower.includes(w)).length;
  const hedgeHits = HEDGE_WORDS.filter((w) => lower.includes(w)).length;

  // Verbosity: based on average sentence length & total length.
  let verbosity = "Tight";
  if (avgSentenceLen > 28 || wordCount > 220) verbosity = "Heavy";
  else if (avgSentenceLen > 18 || wordCount > 120) verbosity = "Moderate";

  // Actionability: presence of ask words, minus hedging.
  const actionScore = askHits * 2 - hedgeHits;
  let actionability = "Low";
  if (actionScore >= 3) actionability = "High";
  else if (actionScore >= 1) actionability = "Moderate";

  // Impact score: rewards a short lead sentence containing an ask, penalizes hedging & length.
  let impact = 50;
  const firstSentence = sentences[0] || "";
  const firstHasAsk = ASK_WORDS.some((w) => firstSentence.toLowerCase().includes(w));
  if (firstHasAsk) impact += 20;
  impact += Math.min(20, askHits * 7);
  impact -= Math.min(25, hedgeHits * 8);
  if (avgSentenceLen > 30) impact -= 15;
  else if (avgSentenceLen < 20) impact += 10;
  if (wordCount > 250) impact -= 10;
  impact = Math.max(5, Math.min(98, Math.round(impact)));

  // BLUF extraction: pick the sentence most likely to carry the ask (has ask word, or first sentence),
  // then lead with it.
  let leadSentence = sentences.find((s) => ASK_WORDS.some((w) => s.toLowerCase().includes(w)));
  if (!leadSentence) leadSentence = firstSentence;
  const bluf = `BLUF: ${leadSentence.trim().replace(/^bluf:\s*/i, "")}`;

  // Suggested subject line: first 8 significant words of the lead sentence, upper-cased prefix.
  const stripped = leadSentence
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(" ");
  const prefix = actionScore >= 1 ? "ACTION REQUIRED" : "FYI";
  const subject = data.subjectLine?.trim() || `${prefix}: ${stripped}`;

  return {
    hasContent: true,
    impact,
    verbosity,
    actionability,
    bluf,
    subject,
    wordCount,
    sentenceCount,
    askHits,
    hedgeHits,
  };
}

export default function BlufWorkshop() {
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

  function updateField(key, value) {
    setDoc((d) => {
      const data = { ...d.data, [key]: value };
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
        <div className="p-10 text-on-surface-variant">Loading BLUF workshop…</div>
      </Layout>
    );
  }

  const analysis = analyzeBluf(doc.data);

  function copyBluf() {
    navigator.clipboard?.writeText(analysis.bluf);
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">BLUF Workshop</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>
        <p className="text-on-surface-variant max-w-2xl mb-8">
          Bottom Line Up Front. Paste your draft, and get a deterministic read on clarity,
          verbosity, and actionability — plus a BLUF-first rewrite lead and subject line.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="edit_note" className="text-secondary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Initial Draft</h3>
                </div>
                <span className="text-xs text-outline">Words: {analysis.wordCount}</span>
              </div>
              <textarea
                value={doc.data.draftText}
                onChange={(e) => updateField("draftText", e.target.value)}
                rows={14}
                placeholder="Paste your email, memo, or proposal here…"
                className="w-full text-sm border border-outline-variant rounded-lg p-4 outline-none focus:border-secondary resize-none leading-relaxed"
              />
              <label className="block mt-4">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Subject line (optional override)</span>
                <input
                  value={doc.data.subjectLine}
                  onChange={(e) => updateField("subjectLine", e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full mt-1 text-sm border border-outline-variant rounded-lg p-2.5 outline-none focus:border-secondary"
                />
              </label>
            </div>

            {analysis.hasContent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
                  <div className="text-xs font-semibold uppercase text-outline mb-2">Before (Original)</div>
                  <p className="text-sm text-on-surface-variant italic whitespace-pre-wrap">{doc.data.draftText}</p>
                </div>
                <div className="bg-white rounded-xl border border-secondary/30 shadow-sm p-6">
                  <div className="text-xs font-semibold uppercase text-secondary mb-2">After (BLUF-Enhanced)</div>
                  <p className="text-sm text-on-surface whitespace-pre-wrap">
                    {analysis.bluf}
                    {"\n\n"}
                    {doc.data.draftText}
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4 h-fit sticky top-24">
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Clarity Analysis</p>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Impact Score</span>
                  <span className="font-bold text-secondary text-xl">{analysis.impact}%</span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary transition-all duration-500"
                    style={{ width: `${analysis.impact}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30">
                  <span className="text-xs text-outline block mb-1">Verbosity</span>
                  <span className="font-bold text-sm">{analysis.verbosity}</span>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30">
                  <span className="text-xs text-outline block mb-1">Actionability</span>
                  <span className="font-bold text-sm">{analysis.actionability}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="tips_and_updates" className="text-secondary" filled />
                <h4 className="text-sm font-bold text-primary uppercase">Optimized BLUF</h4>
              </div>
              <div className="bg-white p-3 rounded-lg border-l-4 border-secondary text-sm text-on-surface min-h-[80px]">
                {analysis.hasContent ? analysis.bluf : "Your optimized message will appear here. Focus on the 'Why' and the 'Ask' immediately."}
              </div>
              {analysis.hasContent && (
                <button onClick={copyBluf} className="mt-3 flex items-center gap-1 text-secondary text-sm font-semibold hover:underline">
                  <Icon name="content_copy" className="text-[16px]" />
                  Copy BLUF
                </button>
              )}
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="mail" className="text-secondary" />
                <h4 className="text-sm font-bold text-primary uppercase">Suggested Subject</h4>
              </div>
              <div className="bg-white p-3 rounded-lg border border-outline-variant text-sm select-all cursor-pointer">
                {analysis.hasContent ? analysis.subject : "Waiting for input…"}
              </div>
            </div>

            <div className="p-5 bg-primary-container rounded-xl text-on-primary">
              <div className="flex items-start gap-3">
                <Icon name="info" className="text-secondary-fixed" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">BLUF Pro Tip</h4>
                  <p className="text-xs opacity-80">Executives read the first paragraph then skim for the 'How'. Put your conclusion first, then support it.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
