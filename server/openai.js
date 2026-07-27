// Minimal OpenAI Chat Completions wrapper using native fetch — no SDK
// dependency, matching the rest of this backend's dependency-light approach
// (see auth.js). Reads OPENAI_API_KEY / OPENAI_MODEL from env; every AI
// route in ai.js calls this and surfaces a clear "not configured" error
// instead of crashing when the key isn't set yet.
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export class AIConfigError extends Error {}
export class AIUpstreamError extends Error {}

export function isAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * messages: [{ role: "system"|"user"|"assistant", content: string }]
 * Returns { text, tokensIn, tokensOut }.
 */
export async function chatComplete(messages, { maxTokens = 600, temperature = 0.5 } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "AI features are not configured yet — set OPENAI_API_KEY on the server."
    );
  }
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  let res;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });
  } catch (err) {
    throw new AIUpstreamError(`Could not reach OpenAI: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AIUpstreamError(`OpenAI request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || "";
  return {
    text,
    tokensIn: json.usage?.prompt_tokens || null,
    tokensOut: json.usage?.completion_tokens || null,
  };
}
