// JSON-file-backed store — used for local development when no DB_HOST env var
// is set. NOT recommended for production on Hostinger: see DEPLOY.md for why.
// User accounts/passwords live in Firebase Auth, not here — `userId` below
// is always the Firebase UID string, attached by the requireAuth middleware.
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

// ---------- Frameworks (global catalog, not user-scoped) ----------
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

// ---------- SWOT sessions (user-scoped by Firebase UID) ----------
export async function listSessions(userId) {
  const db = readDB();
  return db.sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createSession({ userId, title, frameworkId, contextText }) {
  const db = readDB();
  const id = nextId(db.sessions);
  const now = new Date().toISOString();
  const session = {
    id,
    userId,
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

export async function getSession(id, userId) {
  const db = readDB();
  return db.sessions.find((s) => s.id === Number(id) && s.userId === userId) || null;
}

export async function getSessionWithAnalysis(id, userId) {
  const db = readDB();
  const session = db.sessions.find((s) => s.id === Number(id) && s.userId === userId);
  if (!session) return null;
  const analysis = db.analyses.find((a) => a.sessionId === session.id);
  return { ...session, analysis: analysis || null };
}

export async function updateSession(id, userId, patch) {
  const db = readDB();
  const session = db.sessions.find((s) => s.id === Number(id) && s.userId === userId);
  if (!session) return null;
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  writeDB(db);
  return session;
}

export async function deleteSession(id, userId) {
  const db = readDB();
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => !(s.id === Number(id) && s.userId === userId));
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

// ---------- Generic tool documents (user-scoped by Firebase UID) ----------
export async function listDocuments(type, userId) {
  const db = readDB();
  return db.documents
    .filter((d) => d.type === type && d.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createDocument({ userId, type, title, data }) {
  const db = readDB();
  const now = new Date().toISOString();
  const doc = {
    id: nextId(db.documents),
    userId,
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

export async function getDocument(id, userId) {
  const db = readDB();
  return db.documents.find((d) => d.id === Number(id) && d.userId === userId) || null;
}

export async function updateDocument(id, userId, patch) {
  const db = readDB();
  const doc = db.documents.find((d) => d.id === Number(id) && d.userId === userId);
  if (!doc) return null;
  Object.assign(doc, patch, { updatedAt: new Date().toISOString() });
  writeDB(db);
  return doc;
}

export async function deleteDocument(id, userId) {
  const db = readDB();
  const before = db.documents.length;
  db.documents = db.documents.filter((d) => !(d.id === Number(id) && d.userId === userId));
  writeDB(db);
  return db.documents.length < before;
}

// ---------- Subscriptions (one row per user; missing row = free plan) ----------
export async function getSubscription(userId) {
  const db = readDB();
  return db.subscriptions.find((s) => s.userId === userId) || null;
}

export async function getSubscriptionByPaypalId(paypalSubscriptionId) {
  const db = readDB();
  return db.subscriptions.find((s) => s.paypalSubscriptionId === paypalSubscriptionId) || null;
}

export async function upsertSubscription(userId, patch) {
  const db = readDB();
  const now = new Date().toISOString();
  let sub = db.subscriptions.find((s) => s.userId === userId);
  if (!sub) {
    sub = {
      userId,
      plan: "free",
      status: "active",
      seats: 1,
      paypalSubscriptionId: null,
      paypalPlanId: null,
      currentPeriodEnd: null,
      createdAt: now,
    };
    db.subscriptions.push(sub);
  }
  Object.assign(sub, patch, { updatedAt: now });
  writeDB(db);
  return sub;
}

// ---------- AI usage (per user, per calendar-month period "YYYY-MM") ----------
export async function getUsage(userId, period) {
  const db = readDB();
  return (
    db.aiUsage.find((u) => u.userId === userId && u.period === period) || {
      userId,
      period,
      used: 0,
      addonBalance: 0,
    }
  );
}

export async function incrementUsage(userId, period, amount = 1) {
  const db = readDB();
  let row = db.aiUsage.find((u) => u.userId === userId && u.period === period);
  if (!row) {
    row = { userId, period, used: 0, addonBalance: 0 };
    db.aiUsage.push(row);
  }
  row.used += amount;
  writeDB(db);
  return row;
}

export async function addAddonActions(userId, period, amount) {
  const db = readDB();
  let row = db.aiUsage.find((u) => u.userId === userId && u.period === period);
  if (!row) {
    row = { userId, period, used: 0, addonBalance: 0 };
    db.aiUsage.push(row);
  }
  row.addonBalance += amount;
  writeDB(db);
  return row;
}

export async function logAIUsage({ userId, feature, tool, tokensIn, tokensOut }) {
  const db = readDB();
  db.aiUsageLog.push({
    id: nextId(db.aiUsageLog),
    userId,
    feature,
    tool: tool || null,
    tokensIn: tokensIn || null,
    tokensOut: tokensOut || null,
    createdAt: new Date().toISOString(),
  });
  writeDB(db);
}
