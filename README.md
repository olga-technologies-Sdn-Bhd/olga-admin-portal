# Olga Admin

Internal admin panel for the **Olga** professional networking platform. Operators use it to manage members, events, moderation reports, and GDPR privacy requests.

![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![Azure](https://img.shields.io/badge/Azure-Static%20Web%20Apps-0078d4)

---

## Features

| Screen | What you can do |
|---|---|
| **Dashboard** | Platform totals and the next upcoming events |
| **Members** | Search, filter by status, paginate, and suspend or reinstate members (with confirmation) |
| **Events** | All events with timings, registrations, live-mode flag, and status |
| **Moderation** | Triage member reports: review, action, or dismiss |
| **Privacy requests** | Track GDPR export and delete requests against their due dates; overdue ones are flagged |
| **Settings** | Environment, API target, data source, API readiness, signed-in user, and app version |

**Production features:** a login page (fixed credentials for local/dev, Entra ID with an app-role check for production), dark and light themes, runtime per-environment config, route code-splitting, an error boundary, toasts, confirm dialogs, request timeouts, 401 → re-login, security headers (CSP, HSTS, framing), CI, and automated deploys.

## Tech stack

React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · MSAL (Entra ID) · Vitest + Testing Library · ESLint

---

## Run locally

### 1. Prerequisites

- **Node.js 20+** (tested on 22) and **Git**
- *Optional:* **.NET SDK**, only for running Olga.Core to get live data

### 2. Install

```bash
git clone https://github.com/jigarce007/olga-admin.git
cd olga-admin
git checkout develop
npm install
```

### 3. Start

```bash
npm run dev
```

Open **http://localhost:5173** and sign in as **`olgaadmin`**. Get the password from the team; it isn't stored in this repo. By default the panel runs on **built-in sample data**, so you don't need a backend.

> **Theme:** dark by default. Switch with the ☀/☾ button in the sidebar or on the login page; your choice is remembered per browser.

### 4. Optional: live data from Olga.Core

1. In the `Olga.Core` repo, run `dotnet run --project src/Olga.Core.Api` and note the URL it prints (for example `http://localhost:5000`).
2. Copy `.env.example` to `.env` and set `CORE_API_PROXY_TARGET` to that URL.
3. Create **`public/config.local.json`** (it's gitignored) to override `public/config.json`:
   ```json
   { "environment": "local", "apiBaseUrl": "", "useMocks": false }
   ```
4. Restart `npm run dev`. The **Settings** page should show *Core API readiness: Ready*.

> With mocks off, only **Events** has data today. The other screens need the `/v1/admin/*` endpoints listed under [Backend integration status](#backend-integration-status).

---

## Environments: from dev to production

**Build once, deploy anywhere.** Every environment gets the same build. Only `config.json`, which the browser loads at startup, changes per environment, so going from dev to production is a configuration change, not a code change.

| Setting (`config.json`) | Local | Dev | Production |
|---|---|---|---|
| `environment` | `local` | `dev` | `production` |
| `apiBaseUrl` | `""` (Vite proxy) | dev Core API URL | prod Core API URL |
| `useMocks` | `true` | `false` | `false` |
| `auth.mode` | `basic` | `basic` or `entra` | `entra` (enforced) |

The app **refuses to start** in dev or production if mocks are on, auth is `none`, or the API isn't `https`. In staging and production it also refuses anything but `entra`. That stops a misconfigured deploy from going live. An environment badge in the sidebar always shows where you are.

### Login modes

| `auth.mode` | How it works | Allowed in |
|---|---|---|
| `none` | No login | local |
| `basic` | One fixed username and password. `config.json` holds only a SHA-256 hash of the password. Sessions last 8 hours, and 5 failed attempts lock sign-in for 30 seconds | local, dev |
| `entra` | Microsoft Entra ID sign-in plus the `Olga.Admin` app role | everywhere (required in staging and production) |

> ⚠️ `basic` mode is a **convenience gate, not real security**: the check runs in the browser, and anyone can download `config.json`. A short password's hash can be brute-forced. Use it only while Olga.Core admin endpoints stay behind Entra ID or aren't publicly exposed.

To change the basic-mode password, put the new hash in `auth.passwordSha256`:

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<new-password>"
```

### Deployment pipeline

| Branch | GitHub Environment | Azure resource |
|---|---|---|
| `develop` | `dev` | `stapp-olga-admin-<dev-suffix>` |
| `main` | `production` | `stapp-olga-admin-<prd-suffix>` |

The Azure Static Web Apps are already defined in `Olga.Infrastructure` (`enable_admin_static_web_app`). On each push, `.github/workflows/deploy.yml` lints, tests, builds, writes `config.json` from the environment's variables, and deploys.

### One-time setup per environment

1. **Entra ID app registration** for the admin SPA:
   - Platform: *Single-page application*, with redirect URI `https://<swa-host>`
   - Define an app role **`Olga.Admin`** and assign it to the admins
   - Grant it the delegated Olga.Core API scope (`api://<api-client-id>/access_as_user`)
2. **GitHub → Settings → Environments** (`dev`, `production`). Add a protection rule (required reviewers) on `production`.

   | Kind | Name | Example |
   |---|---|---|
   | Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token from the SWA resource |
   | Variable | `ADMIN_ENVIRONMENT` | `dev` / `production` |
   | Variable | `ADMIN_API_BASE_URL` | `https://<core-api-host>` |
   | Variable | `ADMIN_AUTH_AUTHORITY` | `https://login.microsoftonline.com/<tenant-id>` |
   | Variable | `ADMIN_AUTH_CLIENT_ID` | Admin SPA client ID |
   | Variable | `ADMIN_AUTH_API_SCOPES` | `api://<api-client-id>/access_as_user` |
   | Variable | `ADMIN_AUTH_REQUIRED_ROLE` | `Olga.Admin` *(optional, this is the default)* |

   The deploy job skips itself until `ADMIN_API_BASE_URL` is set, so it's safe to merge before Azure is ready.
3. **Olga.Core:** enable JWT validation, enforce the `Olga.Admin` role on `/v1/admin/*`, and allow CORS from the SWA origin.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run lint` | ESLint, where any warning fails |
| `npm run typecheck` | TypeScript only |
| `npm test` | Run the unit and component tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run preview` | Serve the production build |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, and build on every PR and push to `develop` and `main`.

## Project structure

```
├── .github/workflows/     # ci.yml, deploy.yml
├── public/config.json     # runtime config (local defaults; replaced per environment on deploy)
├── scripts/write-config.mjs   # builds config.json and security headers for an environment
├── staticwebapp.config.json   # SPA fallback, caching, security headers
└── src/
    ├── api/               # fetch client, admin API, types, lazy-loaded mocks
    ├── auth/              # MSAL setup, AuthGate (sign-in and role check)
    ├── components/        # Layout, UI primitives, toasts, confirm dialog, pagination
    ├── pages/             # one file per screen (code-split)
    ├── config.ts          # runtime config loader and validation
    └── main.tsx           # bootstrap: config → auth → app
```

## Backend integration status

| Screen | Endpoint | Status |
|---|---|---|
| Events | `GET /v1/events` | Exists |
| Dashboard | `GET /v1/admin/stats` | Proposed |
| Members | `GET /v1/admin/members`, `PATCH /v1/admin/members/{id}` | Proposed |
| Moderation | `GET /v1/admin/reports`, `PATCH /v1/admin/reports/{id}` | Proposed |
| Privacy | `GET /v1/admin/privacy-requests`, `PATCH /v1/admin/privacy-requests/{id}` | Proposed |

Every request sends `Authorization: Bearer <token>` when auth is on. Writes also send a fresh `Idempotency-Key`, which Olga.Core requires. Lists currently paginate in the browser; switch to server-side paging when the admin endpoints are built.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Olga Admin couldn't start" | `config.json` is invalid; the message lists what's wrong |
| Settings shows **Unreachable** | Olga.Core isn't running, or `CORE_API_PROXY_TARGET` is wrong. Restart `npm run dev` after editing `.env` |
| `404` errors with mocks off | That `/v1/admin/*` endpoint doesn't exist yet |
| "Too many failed attempts" | Wait 30 seconds, or close the tab (the lockout is per browser tab session) |
| "Access denied" after sign-in | Your account lacks the `Olga.Admin` app role |
| Port 5173 is already in use | `npm run dev -- --port 5174` |

## Branching

- **`main`** is production and is updated only via PRs from `develop`.
- **`develop`** is the integration branch and deploys to dev.
- Branch features off `develop` (`feature/<name>`) and open PRs back into `develop`.
