const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
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
};
