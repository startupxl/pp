# Principle Pitch — Continuity Notes

Read this first in any new chat about this project. It captures everything needed to keep building without re-deriving context.

## What this project is

"Principle Pitch" (originally called DeepThink) is a full-stack strategy/execution workshop app. Users pick a framework (SWOT, Issue Tree, OKRs, Critical Path, etc.) and get a dedicated interactive tool with live-saving documents and deterministic "AI insight" panels computed client-side from their own data (no external LLM calls).

Stack: React 19 + Vite 8 + Tailwind CSS v4 + react-router-dom v7 (client), Express 4 + ESM (server), Firebase Auth, generic `tool_documents` store (MySQL with local JSON fallback).

## Where things live

- **Scratch working copy**: does NOT persist across sessions/chats — the old `outputs/deepthink-app/` path from earlier notes is gone once a chat ends. Each new chat must rebuild its own scratch copy (see updated workflow below: copy `client/` + `server/` out of the live PP folder into the sandbox's local, non-FUSE home dir, e.g. `/sessions/<session>/build/`, install/build there, then copy only the edited source files back to the live PP folder for commit).
- **Live project folder** (synced copy, git repo, what the user sees): `/Users/edy/Desktop/My Projects/PP`. Bash path: `/sessions/<session>/mnt/PP/`. **Not mounted by default** — call `mcp__cowork__request_cowork_directory` with this exact path at the start of any build session before anything else will work.
- **Source mockups** ("PP V2" imported Claude.ai project): a `docs/` folder containing HTML mockup files named `acode.html`...`zcode.html` and `1code.html`...`Ncode.html` (44 files as of this note: 26 letter-files + 18 numbered files). Each new chat, re-check this folder via the imported project's file listing (`.project-cache/<id>/docs/*.html`, readable directly with Read/Glob — no bash needed) — the user periodically adds new mockup files here, and the recurring instruction is: *"Lets get building based on the new items added to the project PP V2."* That means: scan `docs/*.html`, diff against tools already built (see list below), read any new ones, and build them following the pattern below.

**Status as of this note: all 44 files in the docs folder have been consumed** — 43 built as tools, 1 (`13code.html`, "SCQA Strategy Workspace") skipped as a duplicate of the already-built `scqa` tool (same Situation-Complication-Question-Answer structure). Files `15code.html`–`18code.html` (BLUF Workshop, Executive Decision SIR, Tell → Show → Tell Workshop, Initiative Workshop) were the latest new batch, built in commit `6dc1a43`. If the user says the recurring build phrase again, the first step is re-listing `docs/*.html` to check whether new files have been added since (currently up to `18code.html`).

## The 5-touchpoint pattern for every new tool

Every workshop tool requires exactly these edits — never fewer:

1. New page file in `client/src/pages/YourTool.jsx`.
2. Import + `<Route>` entry in `client/src/App.jsx`, wrapped in `<ProtectedRoute>`.
3. `TOOL_CONFIG` entry in `client/src/startTool.js` with `route` and a `buildData()` default-data factory.
4. Framework catalog object in `server/seed.js` (`id`, `name`, `category`, `complexity`, `readTime`, `tag`, `description`, `workshop: true`, `isNew: true`, `tool: "<key>"`). IDs are sequential — check the highest existing `id` before adding.
5. `DOCUMENT_TYPES` entry in `client/src/pages/Home.jsx` (`{ type, route, label }`) so it surfaces in the "Recent Work" feed.

Every page itself follows the same internal scaffold: `useParams()` → `api.getDocument(id)` on mount → local `title`/`doc`/`saveState` state → debounced `scheduleSave`/`updateData` (500ms `setTimeout`) → `Layout` wrapper → `Icon` component (`../components/Icon`) → title inline-edit-on-blur. "AI insight" panels are hand-written deterministic heuristic functions (e.g. `analyzeCompetencies`, `computeCPM`, `computeEconomics`) that read the document's own data — never a real LLM call.

## Tools built so far (46 framework catalog entries, ids 1–46)

Core/early batch: SWOT, Issue Tree, MECE, Pyramid, SCQA, Logic Tree, Systems Thinking, First Principles, Hypothesis-Driven Thinking.

Strategy batch: GE McKinsey Matrix, Three Horizons, Porter's Generic Strategies, Strategic Choice Cascade, Core Competency Auditor, Lean Canvas, VRIO Analysis.

Execution/ops batch: OKR Workshop, Product Roadmap, Project Charter, RACI Matrix, Retrospective, Sprint Planning, Critical Path Analysis (real CPM forward/backward pass), Project Workspace (Gantt).

Financial/people batch: Burn Rate & Runway, Capacity Planning, Skill Matrix, Unit Economics (LTV/CAC).

Latest batch before this one (ids 36–42, commit `48bf323`): 360-Degree Feedback Workshop, Competitive Benchmarking, Market Sizing Workshop, Performance Review, Communication Audit Dashboard, PREP Framework Workspace, STAR Framework Workspace.

Latest batch (ids 43–46, commit `6dc1a43`): BLUF Workshop (`BlufWorkshop.jsx`, route `bluf-workshop`, tool key `bluf_workshop`), Executive Decision SIR (`SirWorkshop.jsx`, route `decision-sir`, tool key `decision_sir`), Tell → Show → Tell Workshop (`TellShowTell.jsx`, route `tell-show-tell`, tool key `tell_show_tell`), Initiative Workshop / What→Why→How (`InitiativeWorkshop.jsx`, route `initiative-workshop`, tool key `initiative_workshop`).

Full field-by-field data shapes for each tool are in the corresponding page file — check `client/src/pages/*.jsx` directly rather than re-deriving from memory.

## Sandbox quirks (all confirmed repeatedly — don't relearn these the hard way)

- Every `mcp__workspace__bash` call is an isolated process/network namespace/container. A server started in one call is unreachable in a later call, and any background/`nohup`'d process dies when the call ends (the bwrap container is torn down) — **always start the server and run all curl checks in the same single bash call.**
- **The PP folder is not mounted by default** — the session starts with no folder access. Call `mcp__cowork__request_cowork_directory` with path `/Users/edy/Desktop/My Projects/PP` before anything else.
- The FUSE-mounted live `PP` folder doesn't support `unlink()`/`rm` — only `mv` works, and even `mv` of large directory trees (e.g. an old `node_modules`) can exceed the 45s call budget and must be left in place or moved in the background. Before `npm run build` directly on the PP mount, `mv dist dist.old_$(date +%s)` if `dist/` exists. Before any `git add`/`commit`, if you see `Unable to create '.../index.lock'`, run `mv .git/index.lock .git/index.lock.stale_$(date +%s)` (and same for `.git/HEAD.lock`) — sometimes needed twice per commit attempt. The `warning: unable to unlink '.git/objects/.../tmp_obj_...'` noise during commit is harmless. The repo accumulates stale `.lock.bak_*`/`.lock.stale_*` files over time from repeated sessions — harmless clutter, ignore them.
- **Do `npm install` and `npm run build` in the sandbox's local, non-FUSE filesystem, never directly on the PP mount.** Copy `client/`, `server/`, and root `package.json` out via `tar --exclude=node_modules --exclude=dist -cf - client server package.json | (cd <local dir> && tar -xf -)` (much faster than `cp -r` over FUSE), then `npm install`/`npm run build` there. Only copy the final edited *source* files back to the PP mount for `git add`/commit — `dist/` and `node_modules/` are both gitignored and never need to go back.
- **npm installs routinely get interrupted mid-write by the 45s call timeout**, which can leave large native `.node` binary addons (rolldown, lightningcss, oxlint, etc.) truncated/corrupted (they'll be a suspiciously uniform ~3MB regardless of true size) even though `npm install` reports success on a later run (it doesn't re-verify existing files). Symptom: `vite build` or `vite --version` dies with `Bus error (core dumped)` and no other message. Fix: `file <path>.node` will show `missing section headers` confirming truncation; compare `ls -la` size against `npm view <pkg> dist.unpackedSize --registry=https://registry.npmjs.org`; if mismatched, `curl -sL -o /tmp/pkg.tgz "https://registry.npmjs.org/<pkg>/-/<name>-<version>.tgz"` (raw registry downloads are fast, several MB/s — it's `npm install`'s own multi-package concurrency that gets killed mid-stream), `tar -xzf /tmp/pkg.tgz -C /tmp/pkgextract`, then `cp -f /tmp/pkgextract/package/*.node <node_modules dir>/`. Also: leftover `.pkgname-<hash>` temp swap directories from an interrupted install cause `ENOTEMPTY` errors on the next `npm install` attempt — clean with `find node_modules -maxdepth 2 -type d -name ".*-*" -exec rm -rf {} \;` before retrying. Just retrying `npm install` 2-4 times in a row (each call is a fresh 45s budget) generally gets a clean install eventually; a full `rm -rf node_modules package-lock.json` + fresh install can also resolve subtler corruption (missing files like `react-router/dist/development/dom-export.mjs`) but costs a resolution pass (~1 wasted 45s call with zero visible progress) before it starts writing.
- **This repo's dependency layout splits across three `package.json` files**: root (`dotenv`, `jose`, `mysql2`, `express`, `cors` — imported by `server/index.js` via Node's upward `node_modules` resolution), `client/package.json` (React/Vite/Tailwind toolchain), and `server/package.json` (only `express`+`cors` listed, relying on the root install for the rest). **Always run `npm install` at the root of the copied tree, not just inside `server/`** — installing only in `server/` will leave `dotenv`/`jose`/`mysql2` missing and `node server/index.js` will crash with `ERR_MODULE_NOT_FOUND`.
- Server boot needs `sleep 15-20` under this sandbox's disk pressure — shorter sleeps produce empty/connection-refused curl output. If a first attempt comes back empty, retry with a longer sleep in one fresh call.
- **The server listens on port 4000**, not 3001 — `server/index.js` logs `Principle Pitch listening on http://localhost:4000`. Always verify against the actual log rather than assuming a port. The server expects `client/dist` at `<server's parent dir>/client/dist` (i.e. sibling `client/` and `server/` dirs), so build the client at the same relative layout in the local scratch copy.
- `bash` tool `timeout_ms` has a hard cap of 45000 (45s) — don't request more.

## Git / deploy state

- Live repo: `/Users/edy/Desktop/My Projects/PP`, remotes `origin` → `https://github.com/startupxl/pp.git` and `principlepitch` → `https://github.com/startupxl/principlepitch.git`.
- Latest commit on `main`: `6dc1a43` ("Add BLUF Workshop, Executive Decision SIR, Tell-Show-Tell, and Initiative Workshop").
- **No GitHub push credentials exist in this sandbox.** `git push` will always fail with `fatal: could not read Username for 'https://github.com'`. Never attempt workarounds — always tell the user to run `git push origin main` themselves (with a personal access token, since GitHub no longer accepts password auth).
- Deploy target is Hostinger via a single-app Node setup; see `DEPLOY.md` in the repo root for exact steps if that ever needs revisiting.
- There is a stray, untracked `continuity.md` at the PP repo root (this file) — it's the working copy of these notes, kept in sync manually with the "PP V2" Claude.ai project's `docs/continuity.md`, which is read-only from inside a session. Update this repo-root copy at the end of a build session; the user re-syncs it into the project knowledge separately.

## Standard workflow for a new batch (once new mockups appear)

1. Call `mcp__cowork__request_cowork_directory` with path `/Users/edy/Desktop/My Projects/PP` (not mounted by default).
2. Read `docs/continuity.md` from the imported "PP V2" project knowledge (`.project-cache/<id>/docs/continuity.md`) for full history, then list/title-grep `docs/*.html` there to find files not yet represented among built tools.
3. Read each new file in full.
4. Design a data shape + a deterministic insight function per tool (check for duplicates against existing tools first, as was done for SCQA).
5. Look at an existing simple tool page (e.g. `PrepFramework.jsx`) directly in the live PP repo as the scaffold template — no need for a separate scratch copy to *read* from, since the PP folder is directly readable/editable via Read/Write/Edit.
6. Write each new page file directly into `client/src/pages/` in the live PP repo via Write (Edit/Write work fine on the FUSE mount — it's `npm`/`git`'s many small atomic renames that struggle there, not simple file writes).
7. Wire all 5 touchpoints (routes in `App.jsx`, `TOOL_CONFIG` in `startTool.js`, `seed.js` catalog ids continuing from the highest existing, `Home.jsx` DOCUMENT_TYPES).
8. Copy `client/`, `server/`, root `package.json` out to a local non-FUSE scratch dir via `tar` (see sandbox quirks above), `npm install` + `npm run build` there, boot the server there, curl-check health/frameworks/SPA-routes/bundle-content for each new tool — all in one bash call with `sleep 15-20`.
9. Back on the PP mount: move aside any stale `.git/index.lock`/`.git/HEAD.lock`, `git add` the specific changed/new source files (not `-A`, to avoid picking up stray scratch artifacts), commit with a descriptive message.
10. Update this `continuity.md` file in the repo root with the new tool list/ids/commit hash.
11. Remind the user to `git push origin main` themselves, and to re-sync this `continuity.md` into the Claude.ai "PP V2" project knowledge if they want future sessions to see the update automatically.
