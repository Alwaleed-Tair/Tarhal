# Tarhal — Running and Deploying

> **Updated:** 7 Nov 2026. Everything below except the Netlify account steps was tested locally (PostgreSQL 16, production `next build` + `next start`, real browser login).

## 1. How the pieces fit

```
                 one domain (e.g. tarhal.netlify.app)
 ┌──────────────────────────────────────────────────────────────┐
 │ Next.js (this repo root)                                     │
 │   /api/*            → API routes (auth, flights, bookings,   │
 │                       hotels, cars, admin, AI chat)          │
 │   /_site/*          → built React frontend files             │
 │   any other path    → /_site/index.html (client router)      │
 └───────────────┬──────────────────────────────────────────────┘
                 │ Prisma
          PostgreSQL (Neon)            DeepSeek API (AI chat)
```

- The React app in `tarhal-admin-vscode/` (public site + admin dashboard) is built into `public/_site` by `npm run build:frontend`, with `VITE_API_BASE_URL=/api`.
- `next.config.mjs` sends every non-API, non-file path to `/_site/index.html`, so `/`, `/login`, `/stays`, `/dashboard`… all work on refresh.
- **The frontend must be on the same domain as the API.** The API rejects cross-origin `POST`/`PATCH` (`403 INVALID_ORIGIN`) and the session cookie is `SameSite=Lax`. Do not deploy the frontend as a separate site.

## 2. Local development

**Day to day (hot reload on both sides):**
```bash
cp .env.example .env                 # fill DATABASE_URL, SESSION_SECRET (and DEEPSEEK_API_KEY for the chat)
npm install
npx prisma migrate reset             # local database only: applies all migrations + seed
npm run dev                          # API on http://localhost:3000

cd tarhal-admin-vscode
npm install
npm run dev                          # frontend on http://localhost:5173, /api is proxied to :3000
```

**Same setup as production (one origin):**
```bash
npm run build:frontend               # builds the React app into public/_site
npm run dev                          # open http://localhost:3000
```

**Generate secrets:** `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`

**Seed accounts:** `admin@tarhal.com`, `traveler1@tarhal.com`, `traveler2@tarhal.com`, password `hashed_password_123` (plain text in the seed; hashed automatically on first login).

## 3. Tests

| Command | What it checks | Needs |
|---|---|---|
| `npm test` | Unit tests (auth, catalog filters, sessions, AI helpers) | nothing |
| `BASE_URL=http://localhost:3000 npm run test:e2e` | Full flow: register → login → search → book → my bookings → cancel → admin → logout, plus security checks (28 checks) | running server + seeded database |
| `npm run test:integration` / `npm run test:ai` | Endpoint and AI integration tests | `TEST_DATABASE_URL` (local test DB) |

Run `test:e2e` before every demo and after merging backend changes. Never point it at production.

## 4. Deploying to Netlify

### 4.1 Database (Neon), once
1. **Change the Neon password first.** The old connection string was committed to this public repository (`prisma/.env`, Sep 8 – Oct 15) and is still in the git history, so treat it as public.
2. Use a fresh, empty database (or branch) for the schema v3 deployment. Schema v3 adds required columns and only migrates **empty** tables.
3. From your machine, with `DATABASE_URL` pointing at Neon:
   ```bash
   npx prisma migrate deploy          # creates all tables
   npx prisma db seed                 # demo data
   ```
   (`npx prisma migrate reset` does both but deletes all data: only on a database with test data.)
4. Log in as `admin@tarhal.com` once and change its password, or set a strong one in the seed before seeding.

### 4.2 Netlify site, once
1. Netlify → *Add new site* → *Import from Git* → `Alwaleed-Tair/Tarhal`, branch `main`.
2. Build settings come from `netlify.toml` (`npm run build:netlify`, publish `.next`, Node 22). Netlify detects Next.js and adds its runtime automatically.
3. *Site settings → Environment variables*:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string (pooled), with `?sslmode=require` |
| `SESSION_SECRET` | yes | 32+ random bytes; changing it logs everyone out |
| `DEEPSEEK_API_KEY` | for AI chat | without it the chat returns an error, the rest works |
| `PASSWORD_RESET_SECRET`, `PASSWORD_RESET_SUPPORT_EMAIL` | optional | password recovery returns `503` until both are set |

4. Deploy. Then run the end-to-end test against the live site **only if it uses a demo database**: `BASE_URL=https://<site>.netlify.app npm run test:e2e`.

### 4.3 Every later deploy
Merging to `main` redeploys automatically. If the PR adds a migration, run `npx prisma migrate deploy` against Neon **before** merging.

## 5. Known limits and troubleshooting

| Symptom | Cause / fix |
|---|---|
| `403 INVALID_ORIGIN` on login or booking | Frontend served from another domain or port. Use the same origin (section 1), or the Vite dev proxy locally |
| Login works but the next request is `401` | Cookie not sent: use `credentials: 'include'`; on `http://` the cookie is not `Secure`, which is fine locally |
| Admin pages show a yellow "Demo data" badge | API call failed: open DevTools → Network for the status code |
| Prisma error about the query engine on Netlify | `binaryTargets` in `prisma/schema.prisma` must include `rhel-openssl-3.0.x` (it does) and `prisma generate` must run in the build (it does) |
| AI chat times out on Netlify | Netlify functions stop after 10 s by default (26 s maximum on paid plans). Web-search answers can take longer; keep `TARHAL_WEB_SEARCH` off for the demo if this happens |
| Images missing (hotels, cars, airline logos) | The seed points to `/images/...` files that are not in `public/` yet |
| Prices look wrong | `Decimal` fields arrive as strings (`"420"`); convert with `Number()` |
