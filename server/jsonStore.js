// JSON-file-backed store — used for local development when no DB_HOST env var
// is set. NOT recommended for production on Hostinger: see DEPLOY.md for why.
import { readDB, writeDB, nextId } from "./db.js";
import { frameworks as seedFrameworks } from "./seed.js";

export async function init() {
  const db = readDB();
  if (!db.frameworks) db.frameworks = [];
  // Upsert by id so editing seed.js (new frameworks, new/removed fields like
  // `tool`) always takes effect, instead of only seeding once when empty.
  // Framework metadata is fully replaced (not merged) so removed fields
  // (e.g. dropping `workshop: true`) actually disappear on reload.
  const byId = new Map(db.frameworks.map((f) => [f.id, f]));
  for (const seedFramework of seedFrameworks) {
    byId.set(seedFramework.id, seedFramework);
  }
  db.frameworks = Array.from(byId.values()).sort((a, b) => a.id - b.id);
  writeDB(db);
}

export async function getFrameworks({ category, complexity, q } = {}) {
  const db = readDB();
  let results = db.frameworks;
  if (category && category !== "All Frameworks") {
    results = results.filter((f) => f.category === category);
  }
  if (complexity) {
    results = results.filter((f) => f.complexity === complexity);
  }
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(
      (f) =>
        f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
    );
  }
  return { frameworks: results, total: db.frameworks.length };
}

export async function getFramework(id) {
  const db = readDB();
  return db.frameworks.find((f) => f.id === Number(id)) || null;
}

export async function listSessions() {
  const db = readDB();
  return [...db.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createSession({ title, frameworkId, contextText }) {
  const db = readDB();
  const id = nextId(db.sessions);
  const now = new Date().toISOString();
  const session = {
    id,
    title: title || "Untitled Session",
    frameworkId: frameworkId || 1,
    contextText: contextText || "",
    stage: "context",
    createdAt: now,
    updatedAt: now,
    committed: false,
  };
  db.sessions.push(session);
  writeDB(db);
  return session;
}

export async function getSession(id) {
  const db = readDB();
  return db.sessions.find((s) => s.id === Number(id)) || null;
}

export async function getSessionWithAnalysis(id) {
  const db = readDB();
  const session = db.sessions.find((s) => s.id === Number(id));
  if (!session) return null;
  const analysis = db.analyses.find((a) => a.sessionId === session.id);
  return { ...session, analysis: analysis || null };
}

export async function updateSession(id, patch) {
  const db = readDB();
  const session = db.sessions.find((s) => s.id === Number(id));
  if (!session) return null;
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  writeDB(db);
  return session;
}

export async function deleteSession(id) {
  const db = readDB();
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.id !== Number(id));
  db.analyses = db.analyses.filter((a) => a.sessionId !== Number(id));
  writeDB(db);
  return db.sessions.length < before;
}

export async function saveAnalysis(sessionId, analysisResult) {
  const db = readDB();
  let analysis = db.analyses.find((a) => a.sessionId === Number(sessionId));
  if (!analysis) {
    analysis = { id: nextId(db.analyses), sessionId: Number(sessionId) };
    db.analyses.push(analysis);
  }
  Object.assign(analysis, analysisResult);
  writeDB(db);
  return analysis;
}

// ---------- Generic tool documents (Issue Tree, MECE, Pyramid, SCQA) ----------
export async function listDocuments(type) {
  const db = readDB();
  return db.documents
    .filter((d) => d.type === type)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createDocument({ type, title, data }) {
  const db = readDB();
  const now = new Date().toISOString();
  const doc = {
    id: nextId(db.documents),
    type,
    title: title || "Untitled",
    data: data ?? {},
    createdAt: now,
    updatedAt: now,
  };
  db.documents.push(doc);
  writeDB(db);
  return doc;
}

export async function getDocument(id) {
  const db = readDB();
  return db.documents.find((d) => d.id === Number(id)) || null;
}

export async function updateDocument(id, patch) {
  const db = readDB();
  const doc = db.documents.find((d) => d.id === Number(id));
  if (!doc) return null;
  Object.assign(doc, patch, { updatedAt: new Date().toISOString() });
  writeDB(db);
  return doc;
}

export async function deleteDocument(id) {
  const db = readDB();
  const before = db.documents.length;
  db.documents = db.documents.filter((d) => d.id !== Number(id));
  writeDB(db);
  return db.documents.length < before;
}
