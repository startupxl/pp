// MySQL-backed store — used automatically when DB_HOST (and friends) are set,
// e.g. on Hostinger via its MySQL Database Connect flow.
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

function rowToSession(row) {
  return {
    id: row.id,
    title: row.title,
    frameworkId: row.framework_id,
    contextText: row.context_text || "",
    stage: row.stage,
    committed: !!row.committed,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
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
    generatedAt:
      row.generated_at instanceof Date ? row.generated_at.toISOString() : row.generated_at,
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

export async function listSessions() {
  const [rows] = await pool.query("SELECT * FROM sessions ORDER BY updated_at DESC");
  return rows.map(rowToSession);
}

export async function createSession({ title, frameworkId, contextText }) {
  const [result] = await pool.query(
    `INSERT INTO sessions (title, framework_id, context_text, stage, committed)
     VALUES (?, ?, ?, 'context', 0)`,
    [title || "Untitled Session", frameworkId || 1, contextText || ""]
  );
  return getSession(result.insertId);
}

export async function getSession(id) {
  const [rows] = await pool.query("SELECT * FROM sessions WHERE id = ?", [id]);
  return rows[0] ? rowToSession(rows[0]) : null;
}

export async function getSessionWithAnalysis(id) {
  const session = await getSession(id);
  if (!session) return null;
  const [rows] = await pool.query("SELECT * FROM analyses WHERE session_id = ?", [id]);
  return { ...session, analysis: rows[0] ? rowToAnalysis(rows[0]) : null };
}

export async function updateSession(id, patch) {
  const existing = await getSession(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  await pool.query(
    `UPDATE sessions SET title = ?, framework_id = ?, context_text = ?, stage = ?, committed = ?
     WHERE id = ?`,
    [
      merged.title,
      merged.frameworkId,
      merged.contextText,
      merged.stage,
      merged.committed ? 1 : 0,
      id,
    ]
  );
  return getSession(id);
}

export async function deleteSession(id) {
  const [result] = await pool.query("DELETE FROM sessions WHERE id = ?", [id]);
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

// ---------- Generic tool documents (Issue Tree, MECE, Pyramid, SCQA) ----------
function rowToDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    data: parseJsonColumn(row.data),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export async function listDocuments(type) {
  const [rows] = await pool.query(
    "SELECT * FROM tool_documents WHERE type = ? ORDER BY updated_at DESC",
    [type]
  );
  return rows.map(rowToDocument);
}

export async function createDocument({ type, title, data }) {
  const [result] = await pool.query(
    "INSERT INTO tool_documents (type, title, data) VALUES (?, ?, ?)",
    [type, title || "Untitled", JSON.stringify(data ?? {})]
  );
  return getDocument(result.insertId);
}

export async function getDocument(id) {
  const [rows] = await pool.query("SELECT * FROM tool_documents WHERE id = ?", [id]);
  return rows[0] ? rowToDocument(rows[0]) : null;
}

export async function updateDocument(id, patch) {
  const existing = await getDocument(id);
  if (!existing) return null;
  const merged = {
    title: patch.title ?? existing.title,
    data: patch.data ?? existing.data,
  };
  await pool.query("UPDATE tool_documents SET title = ?, data = ? WHERE id = ?", [
    merged.title,
    JSON.stringify(merged.data ?? {}),
    id,
  ]);
  return getDocument(id);
}

export async function deleteDocument(id) {
  const [result] = await pool.query("DELETE FROM tool_documents WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
