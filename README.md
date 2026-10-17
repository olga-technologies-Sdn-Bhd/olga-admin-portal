# OL-GA Admin Portal

Internal admin panel for the **OL-GA** event-networking platform. Operators use it to manage events, venues, members, moderation reports and privacy requests.

![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![Azure](https://img.shields.io/badge/Azure-Static%20Web%20Apps-0078d4)

---

## Contents

- [Environments and links](#environments-and-links)
- [Quick start](#quick-start)
- [Switching between dev and prod](#switching-between-dev-and-prod)
- [Features](#features)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Branching](#branching)

---

## Environments and links

| Environment | Admin panel (deployed) | Olga.Core API | Swagger |
|---|---|---|---|
| **Dev** | _Not deployed yet_ | `https://ca-olga-core-api-dev.agreeableocean-8bb4ca77.malaysiawest.azurecontainerapps.io` | [Open](https://ca-olga-core-api-dev.agreeableocean-8bb4ca77.malaysiawest.azurecontainerapps.io/swagger/index.html) |
| **Prod** | _Not deployed yet_ | `https://ca-olga-core-api-prod.blueground-4e984cd4.malaysiawest.azurecontainerapps.io` | [Open](https://ca-olga-core-api-prod.blueground-4e984cd4.malaysiawest.azurecontainerapps.io/swagger/index.html) |

> The admin panel's hosting is provisioned by `Olga.Infrastructure` as `stapp-olga-admin-<suffix>`. Add each Terraform `admin_static_web_app_url` output to the table above.

The API URLs live in one place: [`environments.json`](environments.json). Local runs and deploys both read it.

---

## Quick start

**Prerequisites:** Node.js 20+ (tested on 22) and Git. You don't need a local backend.

```bash
git clone https://github.com/olga-technologies-Sdn-Bhd/olga-admin-portal.git
cd olga-admin-portal
git checkout develop
npm install
npm run dev
```

Open **http://localhost:5173** and sign in with username **`olgaadmin`**. Ask the team for the password; it isn't stored in this repo.

> **Theme:** dark by default. Switch with the ☀/☾ button in the sidebar or on the login page.

---

## Switching between dev and prod

Pick the API with the npm script you start. You don't need to edit any files.

| Command | Talks to | Sidebar badge |
|---|---|---|
| `npm run dev` | **Dev** Olga.Core | `Local → Dev` |
| `npm run dev:prod` | **Prod** Olga.Core | `Local → Prod` + red warning banner |
| `npm run dev:local` | Your own Olga.Core (`CORE_API_PROXY_TARGET`, default `http://localhost:5000`) | `Local` |

To switch, stop the server (`Ctrl+C`) and start it with the other command. Check where you are with the sidebar badge or **Settings → Core API URL**.

> ⚠️ **`dev:prod` uses live production data.** Anything you create, edit or suspend there affects real users. Use it for checks and real admin tasks only, never for testing.

<details>
<summary>How it works</summary>

The browser always calls same-origin paths (`/v1`, `/ready`, `/health`). The Vite dev server proxies them to the API picked by `--mode` (`dev` or `prod`) from `environments.json`. Because of this, Olga.Core needs no CORS setup for local runs. With `dev:local`, set `CORE_API_PROXY_TARGET` in a gitignored `.env.local` (see `.env.example`).

</details>

---

## Features

| Screen | What you can do |
|---|---|
| **Dashboard** | Platform totals and upcoming events |
| **Events** | Create, edit, cancel and suspend events; add a venue inline |
| **Venues** | Manage venues |
| **Members** | Search, filter, paginate; suspend or reinstate members |
| **Moderation** | Review, action or dismiss member reports |
| **Privacy requests** | Track export and delete requests against their due dates |
| **Settings** | Environment, API target, API readiness, signed-in user and app version |

The panel also includes:
- a login page
- dark and light themes
- per-environment runtime config
- code-split routes, an error boundary, toasts and confirm dialogs
- request timeouts
- security headers (CSP, HSTS, framing)
- CI and automated deploys

**Stack:** React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · MSAL (Entra ID) · Vitest · ESLint

---

## Deployment

**One build, deployed to every environment.** Only `config.json`, which the browser loads at startup, differs per environment.

| Branch | GitHub Environment | Deploys to |
|---|---|---|
| `develop` | `dev` | Dev admin panel → dev Olga.Core |
| `main` | `prd` | Prod admin panel → prod Olga.Core |

Pull requests run linting, type checking, tests, and a production build. Pushes to `develop` and `main` run the same checks, then `scripts/write-config.mjs` writes the environment-specific `config.json` and security headers before the build artifact is uploaded to Azure Static Web Apps. Manual runs can deploy either `dev` or `prd`.

### Login modes

| `auth.mode` | How it works | Allowed in |
|---|---|---|
| `none` | No login | local, dev |
| `basic` | One fixed username/password. `config.json` holds only its SHA-256 hash | local, dev |
| `entra` | Microsoft Entra ID sign-in plus the `Olga.Admin` app role | everywhere (**required** in production) |

> Dev deployments currently default to `none` so the portal can be opened before the admin Entra registration exists. Production remains fail-closed and requires `entra`. `basic` is a convenience gate, not real security: the check runs in the browser.

To change the basic-mode password, put the new hash in `auth.passwordSha256`:

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<new-password>"
```

### One-time setup per environment

1. **Azure:** enable the admin Static Web App in `Olga.Infrastructure` and copy its deployment token.
2. **Entra ID:** register the admin SPA:
   - Redirect URI: `https://<swa-host>`
   - App role: `Olga.Admin`, assigned to the admins
   - Delegated Olga.Core scope
3. **GitHub → Settings → Environments** (`dev`, `prd`):

   For `prd`, require reviewers and restrict deployment branches to `main`. The workflow also rejects any manual production deployment not dispatched from `main`.

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token |
   | Variable | `ADMIN_API_BASE_URL` | Core API URL from the table above (optional; defaults to `environments.json`) |
   | Variable | `ADMIN_AUTH_AUTHORITY` | `https://login.microsoftonline.com/<tenant-id>` (required for `prd`) |
   | Variable | `ADMIN_AUTH_CLIENT_ID` | Admin SPA client ID (required for `prd`) |
   | Variable | `ADMIN_AUTH_API_SCOPES` | `api://<api-client-id>/access_as_user` (required for `prd`) |
   | Variable | `ADMIN_AUTH_REQUIRED_ROLE` | `Olga.Admin` (optional, this is the default) |

4. **Olga.Core:**
   - allow CORS from the admin panel's origin
   - return an `etag` on mutable admin resources and require that value in `If-Match` for updates
   - implement `POST /v1/admin/reports/{reportId}/suspend-member` so member suspension and the report's transition to `ACTIONED` commit in one database transaction

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Local panel against the **dev** API |
| `npm run dev:prod` | Local panel against the **prod** API |
| `npm run dev:local` | Local panel against your own Olga.Core |
| `npm run build` | Type-check and build into `dist/` |
| `npm run lint` | ESLint, where any warning fails |
| `npm run typecheck` | TypeScript only |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run preview` | Serve the production build |

The `build-test-deploy` workflow runs linting, type checking, tests, and a build on every PR and every push to `develop` and `main`.

---

## Project structure

```
├── .github/workflows/         # build-test-deploy.yml
├── environments.json          # dev + prod Olga.Core URLs (single source of truth)
├── public/config.json         # runtime config for local runs (replaced on deploy)
├── scripts/write-config.mjs   # writes config.json + security headers for an environment
├── staticwebapp.config.json   # SPA fallback, caching, security headers
└── src/
    ├── api/                   # fetch client, admin API, types, mocks
    ├── auth/                  # login page, basic auth, MSAL / Entra
    ├── components/            # layout, UI primitives, toasts, dialogs
    ├── pages/                 # one file per screen
    ├── config.ts              # runtime config loader + validation
    └── main.tsx               # bootstrap: config → auth → app
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Olga Admin couldn't start" | `config.json` is invalid; the message lists what's wrong |
| Settings shows **Unreachable** | The API is down, or you started the wrong script. Check **Settings → Core API URL** |
| Changes went to the wrong environment | Check the sidebar badge. `npm run dev` = dev, `npm run dev:prod` = prod |
| "Too many failed attempts" | Wait 30 seconds or close the tab |
| "Access denied" after Entra sign-in | Your account lacks the `Olga.Admin` app role |
| Port 5173 in use | `npm run dev -- --port 5174` |

---

## Branching

- **`main`** is production. It changes only through PRs from `develop`.
- **`develop`** is the integration branch and deploys to dev.
- Branch features off `develop` as `feature/<name>` and open PRs back into `develop`.
