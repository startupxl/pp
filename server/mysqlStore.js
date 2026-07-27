// MySQL-backed store — used automatically when DB_HOST (and friends) are set,
// e.g. on Hostinger via its MySQL Database Connect flow.
// User accounts/passwords live in Firebase Auth, not here — `user_id` below
// is always the Firebase UID string, attached by the requireAuth middleware.
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { frameworks as seedFrameworks } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

function rowToFramework(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    complexity: row.complexity,
    readTime: row.read_time,
    tag: row.tag,
    description: row.description,
    featured: !!row.featured,
    workshop: !!row.workshop,
    isNew: !!row.is_new,
    tool: row.tool || undefined,
  };
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function rowToSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    frameworkId: row.framework_id,
    contextText: row.context_text || "",
    stage: row.stage,
    committed: !!row.committed,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function parseJsonColumn(value) {
  if (value == null) return null;
  if (typeof value === "object") return value; // mysql2 may already parse JSON columns
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function rowToAnalysis(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    quadrants: parseJsonColumn(row.quadrants),
    metrics: parseJsonColumn(row.metrics),
    insights: parseJsonColumn(row.insights),
    executiveSummary: row.executive_summary,
    generatedAt: toIso(row.generated_at),
  };
}

export async function init() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  const statements = schemaSql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await pool.query(stmt);
  }

  // idempotent seed of frameworks
  for (const f of seedFrameworks) {
    await pool.query(
      `INSERT INTO frameworks (id, name, category, complexity, read_time, tag, description, featured, workshop, is_new, tool)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), category = VALUES(category), complexity = VALUES(complexity),
         read_time = VALUES(read_time), tag = VALUES(tag), description = VALUES(description),
         featured = VALUES(featured), workshop = VALUES(workshop), is_new = VALUES(is_new),
         tool = VALUES(tool)`,
      [
        f.id,
        f.name,
        f.category,
        f.complexity,
        f.readTime || null,
        f.tag || null,
        f.description || null,
        f.featured ? 1 : 0,
        f.workshop ? 1 : 0,
        f.isNew ? 1 : 0,
        f.tool || null,
      ]
    );
  }
}

// ---------- Frameworks (global catalog, not user-scoped) ----------
export async function getFrameworks({ category, complexity, q } = {}) {
  const [totalRows] = await pool.query("SELECT COUNT(*) as count FROM frameworks");
  const total = totalRows[0].count;

  let sql = "SELECT * FROM frameworks WHERE 1=1";
  const params = [];
  if (category && category !== "All Frameworks") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (complexity) {
    sql += " AND complexity = ?";
    params.push(complexity);
  }
  if (q) {
    sql += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)";
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like);
  }
  sql += " ORDER BY id ASC";
  const [rows] = await pool.query(sql, params);
  return { frameworks: rows.map(rowToFramework), total };
}

export async function getFramework(id) {
  const [rows] = await pool.query("SELECT * FROM frameworks WHERE id = ?", [id]);
  return rows[0] ? rowToFramework(rows[0]) : null;
}

// ---------- SWOT sessions (user-scoped by Firebase UID) ----------
export async function listSessions(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows.map(rowToSession);
}

export async function createSession({ userId, title, frameworkId, contextText }) {
  const [result] = await pool.query(
    `INSERT INTO sessions (user_id, title, framework_id, context_text, stage, committed)
     VALUES (?, ?, ?, ?, 'context', 0)`,
    [userId, title || "Untitled Session", frameworkId || 1, contextText || ""]
  );
  return getSession(result.insertId, userId);
}

export async function getSession(id, userId) {
  const [rows] = await pool.query("SELECT * FROM sessions WHERE id = ? AND user_id = ?", [
    id,
    userId,
  ]);
  return rows[0] ? rowToSession(rows[0]) : null;
}

export async function getSessionWithAnalysis(id, userId) {
  const session = await getSession(id, userId);
  if (!session) return null;
  const [rows] = await pool.query("SELECT * FROM analyses WHERE session_id = ?", [id]);
  return { ...session, analysis: rows[0] ? rowToAnalysis(rows[0]) : null };
}

export async function updateSession(id, userId, patch) {
  const existing = await getSession(id, userId);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  await pool.query(
    `UPDATE sessions SET title = ?, framework_id = ?, context_text = ?, stage = ?, committed = ?
     WHERE id = ? AND user_id = ?`,
    [
      merged.title,
      merged.frameworkId,
      merged.contextText,
      merged.stage,
      merged.committed ? 1 : 0,
      id,
      userId,
    ]
  );
  return getSession(id, userId);
}

export async function deleteSession(id, userId) {
  const [result] = await pool.query("DELETE FROM sessions WHERE id = ? AND user_id = ?", [
    id,
    userId,
  ]);
  return result.affectedRows > 0;
}

export async function saveAnalysis(sessionId, analysisResult) {
  await pool.query(
    `INSERT INTO analyses (session_id, quadrants, metrics, insights, executive_summary, generated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       quadrants = VALUES(quadrants), metrics = VALUES(metrics), insights = VALUES(insights),
       executive_summary = VALUES(executive_summary), generated_at = VALUES(generated_at)`,
    [
      sessionId,
      JSON.stringify(analysisResult.quadrants),
      JSON.stringify(analysisResult.metrics),
      JSON.stringify(analysisResult.insights),
      analysisResult.executiveSummary,
      new Date(analysisResult.generatedAt),
    ]
  );
  const [rows] = await pool.query("SELECT * FROM analyses WHERE session_id = ?", [sessionId]);
  return rowToAnalysis(rows[0]);
}

// ---------- Generic tool documents (user-scoped by Firebase UID) ----------
function rowToDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    data: parseJsonColumn(row.data),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listDocuments(type, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM tool_documents WHERE type = ? AND user_id = ? ORDER BY updated_at DESC",
    [type, userId]
  );
  return rows.map(rowToDocument);
}

export async function createDocument({ userId, type, title, data }) {
  const [result] = await pool.query(
    "INSERT INTO tool_documents (user_id, type, title, data) VALUES (?, ?, ?, ?)",
    [userId, type, title || "Untitled", JSON.stringify(data ?? {})]
  );
  return getDocument(result.insertId, userId);
}

export async function getDocument(id, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM tool_documents WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return rows[0] ? rowToDocument(rows[0]) : null;
}

export async function updateDocument(id, userId, patch) {
  const existing = await getDocument(id, userId);
  if (!existing) return null;
  const merged = {
    title: patch.title ?? existing.title,
    data: patch.data ?? existing.data,
  };
  await pool.query("UPDATE tool_documents SET title = ?, data = ? WHERE id = ? AND user_id = ?", [
    merged.title,
    JSON.stringify(merged.data ?? {}),
    id,
    userId,
  ]);
  return getDocument(id, userId);
}

export async function deleteDocument(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM tool_documents WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}

// ---------- Subscriptions (one row per user; missing row = free plan) ----------
function rowToSubscription(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    seats: row.seats,
    paypalSubscriptionId: row.paypal_subscription_id,
    paypalPlanId: row.paypal_plan_id,
    currentPeriodEnd: toIso(row.current_period_end),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function getSubscription(userId) {
  const [rows] = await pool.query("SELECT * FROM subscriptions WHERE user_id = ?", [userId]);
  return rowToSubscription(rows[0]);
}

export async function getSubscriptionByPaypalId(paypalSubscriptionId) {
  const [rows] = await pool.query(
    "SELECT * FROM subscriptions WHERE paypal_subscription_id = ?",
    [paypalSubscriptionId]
  );
  return rowToSubscription(rows[0]);
}

export async function upsertSubscription(userId, patch) {
  const existing = await getSubscription(userId);
  const merged = {
    plan: patch.plan ?? existing?.plan ?? "free",
    status: patch.status ?? existing?.status ?? "active",
    seats: patch.seats ?? existing?.seats ?? 1,
    paypalSubscriptionId: patch.paypalSubscriptionId ?? existing?.paypalSubscriptionId ?? null,
    paypalPlanId: patch.paypalPlanId ?? existing?.paypalPlanId ?? null,
    currentPeriodEnd: patch.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null,
  };
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, seats, paypal_subscription_id, paypal_plan_id, current_period_end)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       plan = VALUES(plan), status = VALUES(status), seats = VALUES(seats),
       paypal_subscription_id = VALUES(paypal_subscription_id),
       paypal_plan_id = VALUES(paypal_plan_id),
       current_period_end = VALUES(current_period_end)`,
    [
      userId,
      merged.plan,
      merged.status,
      merged.seats,
      merged.paypalSubscriptionId,
      merged.paypalPlanId,
      merged.currentPeriodEnd,
    ]
  );
  return getSubscription(userId);
}

// ---------- AI usage (per user, per calendar-month period "YYYY-MM") ----------
export async function getUsage(userId, period) {
  const [rows] = await pool.query(
    "SELECT * FROM ai_usage WHERE user_id = ? AND period = ?",
    [userId, period]
  );
  if (!rows[0]) return { userId, period, used: 0, addonBalance: 0 };
  return { userId, period, used: rows[0].used, addonBalance: rows[0].addon_balance };
}

export async function incrementUsage(userId, period, amount = 1) {
  await pool.query(
    `INSERT INTO ai_usage (user_id, period, used, addon_balance)
     VALUES (?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE used = used + VALUES(used)`,
    [userId, period, amount]
  );
  return getUsage(userId, period);
}

export async function addAddonActions(userId, period, amount) {
  await pool.query(
    `INSERT INTO ai_usage (user_id, period, used, addon_balance)
     VALUES (?, ?, 0, ?)
     ON DUPLICATE KEY UPDATE addon_balance = addon_balance + VALUES(addon_balance)`,
    [userId, period, amount]
  );
  return getUsage(userId, period);
}

export async function logAIUsage({ userId, feature, tool, tokensIn, tokensOut }) {
  await pool.query(
    "INSERT INTO ai_usage_log (user_id, feature, tool, tokens_in, tokens_out) VALUES (?, ?, ?, ?, ?)",
    [userId, feature, tool || null, tokensIn || null, tokensOut || null]
  );
}
