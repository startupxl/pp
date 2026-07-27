// Picks the MySQL store when Hostinger's DB env vars are present, otherwise
// falls back to the local JSON file store (dev convenience only — see
// DEPLOY.md for why this isn't recommended in production).
//
// Both stores are imported statically (not via a top-level `await import()`)
// on purpose: some hosts (Hostinger's LiteSpeed Node runner among them) load
// the app's entry point with `require()`, and Node refuses to `require()` any
// ESM module that has top-level await anywhere in its import graph
// (ERR_REQUIRE_ASYNC_MODULE). mysqlStore's connection pool is created lazily
// and never actually connects until a query runs, so importing it
// unconditionally here is safe even when MySQL env vars aren't set.
import * as mysqlStore from "./mysqlStore.js";
import * as jsonStore from "./jsonStore.js";

const useMysql = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
const impl = useMysql ? mysqlStore : jsonStore;

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
  getSubscription,
  getSubscriptionByPaypalId,
  upsertSubscription,
  getUsage,
  incrementUsage,
  addAddonActions,
  logAIUsage,
} = impl;
