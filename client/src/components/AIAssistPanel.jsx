import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { api } from "../api";

/**
 * Collapsible AI coach panel scoped to a single framework. Two modes:
 *  - "coach": free-form chat, answers are restricted server-side to this tool
 *  - "narrative": one-click narrative/pitch draft generated from documentData
 * Usage is metered server-side against the user's plan; a 402 response
 * (AI_QUOTA_EXCEEDED) surfaces an inline upgrade prompt instead of erroring.
 */
export default function AIAssistPanel({
  toolKey,
  frameworkName,
  documentData,
  documentTitle,
  defaultOpen = false,
  className = "",
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("coach");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError("");
    const history = [...messages, { role: "user", content: text }];
    setMessages(history);
    setBusy(true);
    try {
      const res = await api.aiCoach({ tool: toolKey, message: text, history: messages });
      setMessages([...history, { role: "assistant", content: res.text }]);
    } catch (err) {
      if (err.status === 402) setQuotaExceeded(true);
      else setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function generateNarrative() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.aiNarrative({
        tool: toolKey,
        documentData: documentData || {},
        title: documentTitle,
      });
      setNarrative(res.text);
    } catch (err) {
      if (err.status === 402) setQuotaExceeded(true);
      else setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`border border-secondary/30 rounded-lg bg-secondary-container/10 ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
        type="button"
      >
        <Icon name="auto_awesome" className="text-secondary text-[18px]" />
        <span className="text-sm font-semibold text-primary flex-1">
          AI coach{frameworkName ? ` — ${frameworkName}` : ""}
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-on-surface-variant text-[20px]" />
      </button>

      {open && (
        <div className="px-4 pb-4">
          {documentData && (
            <div className="flex gap-1 mb-3 border-b border-outline-variant">
              <button
                type="button"
                onClick={() => setTab("coach")}
                className={`px-3 py-1.5 text-xs font-semibold ${tab === "coach" ? "text-secondary border-b-2 border-secondary" : "text-on-surface-variant"}`}
              >
                Ask a question
              </button>
              <button
                type="button"
                onClick={() => setTab("narrative")}
                className={`px-3 py-1.5 text-xs font-semibold ${tab === "narrative" ? "text-secondary border-b-2 border-secondary" : "text-on-surface-variant"}`}
              >
                Generate narrative
              </button>
            </div>
          )}

          {quotaExceeded && (
            <div className="mb-3 p-3 rounded-lg bg-error-container/20 border border-error/20 text-xs text-error">
              You've used this month's AI-assist allowance.{" "}
              <Link to="/billing" className="font-semibold underline">
                Upgrade your plan
              </Link>{" "}
              or add an AI-assist pack for more.
            </div>
          )}
          {error && !quotaExceeded && (
            <div className="mb-3 p-3 rounded-lg bg-error-container/20 border border-error/20 text-xs text-error">
              {error}
            </div>
          )}

          {(!documentData || tab === "coach") && (
            <>
              <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 mb-3">
                {messages.length === 0 && (
                  <p className="text-xs text-on-surface-variant italic">
                    Ask how to fill this framework out, what a section means, or how to apply it to your
                    situation. Scoped to {frameworkName || "this framework"} only.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
                      m.role === "user"
                        ? "bg-primary text-white ml-auto"
                        : "bg-white border border-outline-variant text-on-surface"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {busy && tab === "coach" && (
                  <div className="text-xs text-on-surface-variant italic">Thinking…</div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask the AI coach…"
                  className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary"
                  disabled={busy}
                />
                <button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  type="button"
                  className="px-3 py-2 bg-secondary text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  <Icon name="send" className="text-[16px]" />
                </button>
              </div>
            </>
          )}

          {documentData && tab === "narrative" && (
            <div>
              {!narrative ? (
                <button
                  onClick={generateNarrative}
                  disabled={busy}
                  type="button"
                  className="w-full py-2.5 bg-secondary text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Icon name="auto_awesome" className="text-[16px]" />
                  {busy ? "Generating…" : "Generate a narrative from this workspace"}
                </button>
              ) : (
                <div>
                  <p className="text-sm text-on-surface whitespace-pre-wrap bg-white border border-outline-variant rounded-lg p-3 mb-2">
                    {narrative}
                  </p>
                  <button
                    onClick={() => setNarrative("")}
                    type="button"
                    className="text-xs font-semibold text-secondary"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-on-surface-variant mt-3 opacity-70">
            AI-assist is optional and clearly labeled — this framework's scoring stays deterministic.
          </p>
        </div>
      )}
    </div>
  );
}
