import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { api } from "../api";

/**
 * Small inline "Draft with AI" button for a single field. Calls onInsert(text)
 * with a generated starter draft the caller can drop into its own state.
 * Counts as one AI-assist action against the user's monthly plan allowance.
 */
export default function AIDraftButton({ toolKey, fieldLabel, context, onInsert, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setError("");
    setQuotaExceeded(false);
    try {
      const res = await api.aiDraft({ tool: toolKey, fieldLabel, context });
      onInsert?.(res.text);
    } catch (err) {
      if (err.status === 402) setQuotaExceeded(true);
      else setError(err.message || "Could not generate a draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline disabled:opacity-50"
      >
        <Icon name="auto_awesome" className="text-[14px]" />
        {busy ? "Drafting…" : `Draft ${fieldLabel ? `"${fieldLabel}"` : "this"} with AI`}
      </button>
      {quotaExceeded && (
        <span className="text-[11px] text-error">
          AI allowance used up.{" "}
          <Link to="/billing" className="underline font-semibold">
            Upgrade
          </Link>
        </span>
      )}
      {error && !quotaExceeded && <span className="text-[11px] text-error">{error}</span>}
    </span>
  );
}
