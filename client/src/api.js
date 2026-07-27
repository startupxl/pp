const BASE = "/api";

// AuthContext registers a token-getter here on mount so this plain module
// (outside React) can attach a fresh Firebase ID token to every request
// without importing React/AuthContext directly.
let getAuthToken = async () => null;
export function setAuthTokenGetter(fn) {
  getAuthToken = fn;
}

async function request(path, options = {}) {
  const token = await getAuthToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    const err = new Error(body?.error || `API error ${res.status}: ${text}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getFrameworks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/frameworks${qs ? `?${qs}` : ""}`);
  },
  getFramework: (id) => request(`/frameworks/${id}`),
  getGoals: () => request("/goals"),

  getSessions: () => request("/sessions"),
  getSession: (id) => request(`/sessions/${id}`),
  createSession: (payload) =>
    request("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  updateSession: (id, payload) =>
    request(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  generateAnalysis: (id, contextText) =>
    request(`/sessions/${id}/generate`, {
      method: "POST",
      body: JSON.stringify({ contextText }),
    }),
  commitSession: (id) => request(`/sessions/${id}/commit`, { method: "POST" }),

  // Generic documents: Issue Tree Builder, MECE Workspace, Pyramid, SCQA
  listDocuments: (type) => request(`/documents?type=${encodeURIComponent(type)}`),
  createDocument: (payload) =>
    request("/documents", { method: "POST", body: JSON.stringify(payload) }),
  getDocument: (id) => request(`/documents/${id}`),
  updateDocument: (id, payload) =>
    request(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),

  // AI-assist (draft content, coach, narrative, recommendations) — every
  // paid/free tier gets a monthly allowance, enforced server-side.
  getAIUsage: () => request("/ai/usage"),
  aiDraft: (payload) => request("/ai/draft", { method: "POST", body: JSON.stringify(payload) }),
  aiCoach: (payload) => request("/ai/coach", { method: "POST", body: JSON.stringify(payload) }),
  aiNarrative: (payload) =>
    request("/ai/narrative", { method: "POST", body: JSON.stringify(payload) }),
  aiRecommend: (payload) =>
    request("/ai/recommend", { method: "POST", body: JSON.stringify(payload) }),

  // Billing (PayPal subscriptions)
  getBillingConfig: () => request("/billing/config"),
  getBillingStatus: () => request("/billing/status"),
  subscribeToPlan: (plan) =>
    request("/billing/subscribe", { method: "POST", body: JSON.stringify({ plan }) }),
  confirmSubscription: (subscriptionId) =>
    request("/billing/confirm", { method: "POST", body: JSON.stringify({ subscriptionId }) }),
  cancelSubscription: () => request("/billing/cancel", { method: "POST" }),
};
