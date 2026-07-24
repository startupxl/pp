# Deploying Principle Pitch on Hostinger

Repo: https://github.com/startupxl/principlepitch

This app is a single Express process that serves both the API (`/api/*`) and the built
React frontend (everything else), which matches Hostinger's Node.js Web Apps model of
one persistent process per app.

## 1. Push this code to GitHub

From the project root:

```bash
git init                     # only if the repo isn't already initialized here
git remote add origin https://github.com/startupxl/principlepitch.git
git add .
git commit -m "Principle Pitch: full-stack app"
git branch -M main
git push -u origin main
```

If the remote already has commits (since it's "already connected"), pull first:

```bash
git pull origin main --allow-unrelated-histories
# resolve any conflicts, then
git push -u origin main
```

## 2. Hostinger hPanel setup (Node.js Web App)

In hPanel → **Websites** → **Add Website** → **Node.js Apps** → **Import Git Repository**,
authorize GitHub, and select `startupxl/principlepitch`.

Hostinger will try to auto-detect the framework. Since this repo has both a frontend
(`client/`) and a backend (`server/`) it may be detected as **"Other"** — that's fine, just
fill in these fields manually if asked:

| Field | Value |
|---|---|
| **Build command** | `npm run build` |
| **Entry file** | `server/index.js` |
| **Output directory** | `client/dist` (informational — the server serves this itself) |
| **Node.js version** | 20.x |
| **Start command** (if asked separately) | `npm start` |

The root `package.json` already defines:
- `"build": "npm install --prefix client && npm run build --prefix client"`
- `"start": "node server/index.js"`

So in most cases Hostinger's default `npm install && npm run build && npm start` flow
will just work without any manual overrides.

## 3. Environment variables

Add these under the app's **Environment Variables** section in hPanel:

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Standard production flag |
| `PORT` | *(leave as Hostinger's default/injected value — don't hardcode)* | Hostinger assigns this; `server/index.js` already reads `process.env.PORT` |
| `DB_HOST` | usually `localhost` on Hostinger | MySQL connection (see step 4) |
| `DB_PORT` | `3306` | MySQL connection |
| `DB_USER` | your MySQL database username | MySQL connection |
| `DB_PASSWORD` | your MySQL database password | MySQL connection |
| `DB_NAME` | your MySQL database name | MySQL connection |

The app auto-detects which data store to use: if `DB_HOST`, `DB_USER`, and `DB_NAME` are
all set, it uses MySQL; otherwise it falls back to the local JSON file (useful for local
dev, not for production — see step 4).

## 4. Database setup (Hostinger MySQL)

This app now ships with a real MySQL-backed data layer (`server/mysqlStore.js`), so SWOT
sessions and analyses survive redeploys instead of living in a JSON file that gets reset
on every rebuild.

**Step 1 — create the database in hPanel:**

1. hPanel → **Databases → MySQL Databases** → **Create Database**
2. Fill in a database name, username, and password — save these somewhere safe
3. Note the host (Hostinger typically uses `localhost` for same-account Node apps)

**Step 2 — set the environment variables** (table above) in the Node.js app's
**Environment Variables** section, then **restart** the app (or redeploy) so it picks
them up.

**Step 3 — schema:** you don't need to do anything manually — `server/index.js` calls
`store.init()` on startup, which creates the `frameworks`, `sessions`, and `analyses`
tables (`CREATE TABLE IF NOT EXISTS`, safe to run repeatedly) and seeds the framework
catalog. If you'd rather run it yourself first, `server/schema.sql` has the same
statements — paste them into phpMyAdmin's SQL tab.

**Step 4 — verify:** after redeploying, hit `/api/health` on the live domain. It should
return `{"ok":true,"dataStore":"mysql"}`. If it says `"dataStore":"json-file"` instead,
the app didn't see all three of `DB_HOST`/`DB_USER`/`DB_NAME` — double check the env vars
and restart again.

**Local dev:** if you don't set these env vars locally, the app automatically falls back
to the JSON file store (`server/data/db.json`) so you don't need a local MySQL install
just to run the app on your machine. Only the deployed Hostinger app needs the real
database.

## 5. Authentication (Firebase)

User accounts are handled entirely by Firebase Authentication — there's no custom
password/session logic in this app, and no Firestore/firebase-admin dependency either.

- **Client side**: `client/src/firebase.js` already has the live `principlepitch` Firebase
  web config baked in (this is the public web API key, safe to ship in the bundle). Email/
  Password and Google are the two enabled sign-in providers — confirm both are turned on
  under Firebase Console → Authentication → Sign-in method.
- **Server side**: `server/auth.js` verifies the Firebase ID token on every
  `/api/sessions*` and `/api/documents*` request by checking the JWT signature against
  Google's public JWKS and validating the `issuer`/`audience` claims — no service account
  key or `firebase-admin` package needed. `FIREBASE_PROJECT_ID` defaults to `principlepitch`
  already, so **no extra environment variable is required** unless you point this app at a
  different Firebase project, in which case set `FIREBASE_PROJECT_ID` in hPanel to match.
- **Data**: sessions/documents are tagged with the Firebase UID (`user_id` / `userId`) so
  each user only ever sees their own work. There's no separate `users` table — Firebase is
  the single source of truth for accounts.
- After deploying, confirm `/signin` and `/signup` load, and that creating an account /
  signing in redirects into the app and lets you start a workshop.

## 6. After deploying

- Visit the live URL and confirm the home page loads (title should read "Principle Pitch")
- Click through Home → Library → start a Workshop session → Generate → Commit → Dashboard
- Refresh on a deep link like `/workshop/1` or `/dashboard/1` — it should **not** 404
  (the server's SPA fallback route handles this; if you see a raw 404 or Hostinger's
  default error page instead, check that `.htaccess` was generated under `public_html`
  as described in Hostinger's Node.js docs, and that the Node process is listed as
  "Running" in the app dashboard)
- Check `/api/health` on the live domain returns `{"ok":true}`

## 7. Troubleshooting

- **"Failed to build the application"** — check the build log in hPanel; most likely
  cause is a missing dependency. Re-run `npm run build` locally first to confirm it's
  clean.
- **App builds but shows a blank page** — check that `client/dist` was actually produced
  and that `server/index.js`'s static-serving branch (`if (fs.existsSync(CLIENT_DIST))`)
  is being hit; check runtime logs in hPanel for errors.
- **API calls fail from the deployed frontend** — the frontend calls relative `/api/...`
  paths (not `localhost:4000`), so this should work automatically in production since
  everything is served from the same origin. If you see CORS errors, something is
  misconfigured (e.g. the frontend is being hosted separately from the API).
- **"Access denied for user"** — double-check `DB_USER`/`DB_PASSWORD` match what you set
  when creating the MySQL database, and that the user is assigned to that database in
  hPanel.
- **App crashes on startup with a MySQL connection error** — confirm `DB_HOST` is
  `localhost` (or whatever hPanel shows for your database) and `DB_PORT` is `3306`; also
  check the runtime logs for the exact error code (`ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR`,
  etc.) to narrow it down.
- **`/api/health` shows `"dataStore":"json-file"` in production** — one of `DB_HOST`,
  `DB_USER`, or `DB_NAME` isn't set (or the app hasn't restarted since you added them).
