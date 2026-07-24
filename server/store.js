// Picks the MySQL store when Hostinger's DB env vars are present, otherwise
// falls back to the local JSON file store (dev convenience only — see
// DEPLOY.md for why this isn't recommended in production).
const useMysql = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

const impl = useMysql ? await import("./mysqlStore.js") : await import("./jsonStore.js");

export const usingMysql = useMysql;
export const {
  init,
  getFrameworks,
  getFramework,
  listSessions,
  createSession,
  getSession,
  getSessionWithAnalysis,
  updateSession,
  deleteSession,
  saveAnalysis,
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
} = impl;
