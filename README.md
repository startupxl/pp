# Principle Pitch

A full-stack strategic-thinking app: pick a mental model, run a guided workshop (starting
with SWOT), and get an AI-style strategic dashboard out the other end.

Deployed on **Hostinger Node.js Web Apps Hosting** via GitHub auto-deploy from
[startupxl/principlepitch](https://github.com/startupxl/principlepitch). See `DEPLOY.md`
for the exact Hostinger setup.

## Structure

- `client/` — React + Vite + Tailwind CSS v4 frontend
- `server/` — Express API + static file server (serves the built client and handles
  `/api/*` routes)
- Root `package.json` — the single entry point Hostinger builds and runs. `npm run build`
  builds the client; `npm start` runs the Express server, which serves both the built
  frontend and the API from one process (this matches Hostinger's one-process-per-app
  Node.js hosting model).

### Data layer

`server/store.js` picks between two implementations automatically:

- **MySQL** (`server/mysqlStore.js`) — used whenever `DB_HOST`, `DB_USER`, and `DB_NAME`
  env vars are set. This is what runs in production on Hostinger, against a real MySQL
  database created in hPanel. Schema lives in `server/schema.sql` and is also applied
  automatically on server startup.
- **JSON file** (`server/jsonStore.js`, backed by `server/data/db.json`) — used when no
  database env vars are set, so you can run the app locally without installing MySQL.
  Not recommended for production (see `DEPLOY.md`) since a fresh deploy can reset it.

Check which one is active via `GET /api/health` — it returns
`{"ok":true,"dataStore":"mysql"}` or `{"ok":true,"dataStore":"json-file"}`.

## Running it locally

```bash
npm install
npm --prefix client install
npm --prefix client run build   # builds client/dist
npm start                        # runs the server on http://localhost:4000, serving client/dist
```

Or for active frontend development with hot reload, run these in two terminals instead:

```bash
# Terminal 1 — API server (http://localhost:4000)
npm start

# Terminal 2 — frontend dev server (http://localhost:5173)
npm --prefix client run dev
```

The Vite dev server proxies `/api/*` to the Express server, so no extra config is needed.

## What's implemented

- **Home / Framework Selector** — goal picker, featured framework, recent sessions
- **Framework Library** — browsable, filterable catalog of frameworks/categories
- **SWOT Workshop** — Context → Analysis → Strategy flow; paste context, generate a
  SWOT breakdown, commit to a strategy
- **Live Analysis Dashboard** — SWOT quadrants, AI-style strategic insights, metrics,
  and an executive summary, all derived from the committed session

The "AI" analysis is a deterministic heuristic engine (`server/analysisEngine.js`) that
turns free-text context into SWOT bullets, metrics, and insights — no external LLM call,
but consistent and easy to swap for a real model call later.

## Next steps if you want to keep building

- Wire `analysisEngine.js` to a real LLM call for genuinely generated insights
- Add auth so sessions belong to real users instead of a single shared store
