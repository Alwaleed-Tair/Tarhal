# End-to-End Test Report — 7 Nov 2026

**Scope:** full MVP flow on `main` (72e3fff) + open PRs, local PostgreSQL 16, seed data, production `next build`.
**Tool:** `scripts/e2e-flow.mjs` (`BASE_URL=http://localhost:3000 npm run test:e2e`), 28 checks, plus a real-browser check of the admin UI.

## Result
| | Checks passed |
|---|---|
| Before fixes (`main`) | **23 / 28** |
| After fixes (PR #36) | **28 / 28**, run twice in a row (second run re-books a cancelled seat) |
| Production build, one origin (PR #35 + #36 + #37) | **28 / 28**; browser login as admin → live flights and bookings |
| Unit tests (`npm test`) | 53 / 53 |

## Bugs found

### Fixed (in open PRs, need review)
| # | Severity | Bug | Fix | PR | Reviewer |
|---|---|---|---|---|---|
| 1 | 🔴 High | `GET /api/bookings?userId=X` showed any user's bookings to any logged-in user | Uses the session user only | #36 | Abdulelah |
| 2 | 🔴 High | Cancelling a booking needed no login and no ownership | `POST /api/bookings/:id/cancel` checks login and owner | #36 | Abdulelah |
| 3 | 🔴 High | `GET /api/admin/bookings` returned password hashes | Safe user fields only | #36 | Saud |
| 4 | 🟠 Medium | A cancelled seat could never be booked again (500) | Seat keeps traveler history; unique key removed, index added | #36 | Abdulelah |
| 5 | 🟠 Medium | No schema v3 migration; `migrate deploy` created the old schema | `20261107120000_schema_v3`, verified against a fresh v3 build | #36 | Saud |
| 6 | 🟡 Low | Admin flights table showed `$0` for every price | Frontend reads `basePrice` | #37 | Omar |
| 7 | 🟠 Medium | `next build` fails on `main` (duplicate admin copies under `app/`) | Remove copies | #35 | Omar |

### Open
| # | Severity | Bug / gap | Owner |
|---|---|---|---|
| 8 | 🔴 High | Database password in the public git history (`prisma/.env`, Sep 8 – Oct 15) — rotate it in Neon | Alwaleed (repo owner), Saud |
| 9 | 🔴 High | Passenger frontend (`app/User - trial`) makes no API calls; 7 pages are empty files (seat selection, bookings, booking success, hotels, cars, travel guide, city places) | Tariq |
| 10 | 🟠 Medium | Two separate frontends (Tariq's Vite app and Omar's Vite app). Only `tarhal-admin-vscode` is wired into the build and deployment. Decide: move the passenger pages into it | Team |
| 11 | 🟠 Medium | No seat-hold endpoint: seats go straight to `BOOKED` at checkout (hold logic is only used inside booking) | Abdulelah |
| 12 | 🟡 Low | Seed has only 2 flights / 5 seats — too small for a demo | Saud |
| 13 | 🟡 Low | Seeded image paths (`/images/hotels/*.jpg`, `/images/cars/*.jpg`, `/images/airlines/*.png`) do not exist in `public/` | Saud, Omar |
| 14 | 🟡 Low | Admin dashboard cards (bookings, revenue, users) are hardcoded demo numbers; currency shows USD | Omar |
| 15 | 🟡 Low | Response formats differ between endpoint groups (see API docs §0) | Backend team |
| 16 | 🟡 Low | Seed passwords are plain text (`hashed_password_123`), upgraded on first login — change the admin password on any shared database | Saud |

## How to reproduce
```bash
createdb tarhal_e2e
DATABASE_URL=postgresql://localhost/tarhal_e2e npx prisma migrate reset --force
DATABASE_URL=... SESSION_SECRET=<32+ bytes> npm run dev
BASE_URL=http://localhost:3000 npm run test:e2e
```
