import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as store from "./store.js";
import { goals as seedGoals } from "./seed.js";
import { generateSwot } from "./analysisEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Small helper so route handlers can stay readable without try/catch everywhere.
function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// ---------- Frameworks ----------
app.get(
  "/api/frameworks",
  asyncRoute(async (req, res) => {
    const { category, complexity, q } = req.query;
    const result = await store.getFrameworks({ category, complexity, q });
    res.json(result);
  })
);

app.get(
  "/api/frameworks/:id",
  asyncRoute(async (req, res) => {
    const framework = await store.getFramework(req.params.id);
    if (!framework) return res.status(404).json({ error: "Not found" });
    res.json(framework);
  })
);

app.get("/api/goals", (req, res) => {
  res.json({ goals: seedGoals });
});

// ---------- Sessions (SWOT Workshop instances) ----------
app.get(
  "/api/sessions",
  asyncRoute(async (req, res) => {
    const sessions = await store.listSessions();
    res.json({ sessions });
  })
);

app.post(
  "/api/sessions",
  asyncRoute(async (req, res) => {
    const { title, frameworkId, contextText } = req.body;
    const session = await store.createSession({ title, frameworkId, contextText });
    res.status(201).json(session);
  })
);

app.get(
  "/api/sessions/:id",
  asyncRoute(async (req, res) => {
    const result = await store.getSessionWithAnalysis(req.params.id);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  })
);

app.patch(
  "/api/sessions/:id",
  asyncRoute(async (req, res) => {
    const session = await store.updateSession(req.params.id, req.body);
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  })
);

app.delete(
  "/api/sessions/:id",
  asyncRoute(async (req, res) => {
    await store.deleteSession(req.params.id);
    res.status(204).end();
  })
);

// ---------- Analysis generation ----------
app.post(
  "/api/sessions/:id/generate",
  asyncRoute(async (req, res) => {
    const existing = await store.getSession(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const contextText = req.body.contextText ?? existing.contextText;
    const session = await store.updateSession(req.params.id, {
      contextText,
      stage: "analysis",
    });

    const result = generateSwot(contextText);
    const analysis = await store.saveAnalysis(req.params.id, result);

    res.json({ session, analysis });
  })
);

app.post(
  "/api/sessions/:id/commit",
  asyncRoute(async (req, res) => {
    const session = await store.updateSession(req.params.id, {
      stage: "strategy",
      committed: true,
    });
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  })
);

app.get("/api/health", async (req, res) => {
  res.json({ ok: true, dataStore: store.usingMysql ? "mysql" : "json-file" });
});

// ---------- Generic tool documents (Issue Tree, MECE, Pyramid, SCQA) ----------
app.get(
  "/api/documents",
  asyncRoute(async (req, res) => {
    const { type } = req.query;
    if (!type) return res.status(400).json({ error: "type query param is required" });
    const documents = await store.listDocuments(type);
    res.json({ documents });
  })
);

app.post(
  "/api/documents",
  asyncRoute(async (req, res) => {
    const { type, title, data } = req.body;
    if (!type) return res.status(400).json({ error: "type is required" });
    const doc = await store.createDocument({ type, title, data });
    res.status(201).json(doc);
  })
);

app.get(
  "/api/documents/:id",
  asyncRoute(async (req, res) => {
    const doc = await store.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  })
);

app.patch(
  "/api/documents/:id",
  asyncRoute(async (req, res) => {
    const doc = await store.updateDocument(req.params.id, req.body);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  })
);

app.delete(
  "/api/documents/:id",
  asyncRoute(async (req, res) => {
    await store.deleteDocument(req.params.id);
    res.status(204).end();
  })
);

// ---------- Serve the built React app (production) ----------
// In local dev, Vite runs its own server on :5173 and proxies /api here, so this
// block only matters once `client/dist` exists (i.e. after `npm run build`).
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: any non-API route serves index.html so React Router can
  // handle client-side routes like /workshop/3 or /dashboard/3 on refresh.
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res
      .status(200)
      .send(
        "Principle Pitch API is running, but client/dist was not found. Run `npm run build` to build the frontend."
      );
  });
}

// Basic error handler so a failed DB query returns JSON, not a stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  await store.init();
  app.listen(PORT, () => {
    console.log(
      `Principle Pitch listening on http://localhost:${PORT} (data store: ${
        store.usingMysql ? "MySQL" : "JSON file"
      })`
    );
  });
}

start().catch((err) => {
  console.error("Failed to start Principle Pitch server:", err);
  process.exit(1);
});
