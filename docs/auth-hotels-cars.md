# Auth, Hotels and Cars — API and SRS Handoff

Owner: Mohammed Alasad — Week 3 (20–26 September 2026).
Implementation and verification recorded on 25 September 2026.

## Scope and implementation status

Tarhal is a Next.js/TypeScript travel application backed by PostgreSQL through Prisma. This delivery covers **Mohammed Alasad's Auth + Hotels/Cars assignments only**, based on `main` commit `70913774d971de553308636624f7c81ed06f4288`.

The current migration already creates `Hotel` and `Car`, so no schema or migration changes were needed. Catalog routes and password recovery did not exist. Login compared plaintext passwords and returned a user ID/name, but did not create a session. README and Week 2 documents describe planned NextAuth/registration features; these are not implemented in this baseline. This week's work preserves the login response contract and does not add registration, sessions, flight/booking changes, frontend pages, or other teammates' assignments.

The September 20–26 branch and latest `main` contain the same original **8 hotels and 5 cars**. Saud's expanded fixtures mentioned in the plan are not available there yet. These committed fixtures were used for the database tests; no claim is made to have tested unavailable data.

## API contract for frontend integration

### Catalogs

- `GET /api/hotels?minPrice=200&maxPrice=600&minRating=4&roomType=Suite&city=Riyadh`
- `GET /api/cars?category=SUV&minPrice=100&maxPrice=400`

All filters are optional and combined with AND. Prices are SAR per night/day, inclusive, non-negative, at most two decimal places, and limited to `99999999.99` by the existing `Decimal(10,2)` fields. `minPrice` cannot exceed `maxPrice`. `minRating` is an inclusive minimum on the 1–5 scale. Text filters are trimmed, case-insensitive **exact** matches, at most 100 characters. Categories and room types are not hardcoded, so new database values remain searchable. Invalid, empty, duplicate, and unknown filters return HTTP 400.

Successful responses use `{ "success": true, "data": [...] }`, sorted by price ascending, then ID. No match returns HTTP 200 with `data: []`. Prisma serializes decimal prices as JSON strings, e.g. `"320"`; frontend formatting must account for that. Database failures return a generic HTTP 500. These are sample catalog listings, not live availability or bookings. Use same-origin requests or the frontend's backend proxy for catalog requests.

### Login

`POST /api/auth/login` accepts the existing `{ "username": "Test Traveler", "password": "..." }` contract, or `{ "email": "traveler@example.test", "password": "..." }`. Supply one identity field. Successful responses retain `{ "success": true, "message": "Login successful!", "user": { "id": "...", "name": "..." } }`. Invalid payloads return 400; invalid credentials or ambiguous duplicate names return 401; database failures return 500. Accounts sharing a name must use their unique email. Email lookup follows the existing exact database value.

Reset passwords use salted scrypt hashes. Existing plaintext demo passwords are upgraded on successful login using a conditional update. No account records are deleted. This endpoint still verifies credentials only; session issuance and protected-route authorization remain outside this week's implementation and must not be inferred from a successful login response.

### Support-assisted password recovery (explicit MVP simplification)

There is no mail provider or recovery UI in the current project. The task explicitly allows an MVP simplification. This flow is operational through the API and an operator command, and does not pretend to send email:

1. Client calls `POST /api/auth/forgot-password` with `{ "email": "traveler@example.test" }`.
2. It returns identical support instructions for known/unknown emails and the configured support address. No email is sent and no support ticket is created automatically. Invalid input returns 400; missing configuration returns 503.
3. The user contacts support. An authorized operator verifies account ownership using the team's support process. **Possession of an email address alone is not proof of ownership.** After verification, from the trusted backend environment run:

   ```sh
   npm run auth:reset-token -- traveler@example.test --identity-verified
   ```

4. Deliver the printed token privately to the verified owner. Do not put it in tickets, shared logs, Git, or URLs. The operator command is not exposed as a public endpoint.
5. Client calls `POST /api/auth/reset-password` with `{ "token": "...", "newPassword": "a new password of 12–128 characters" }`. A valid reset returns 200; an invalid, expired, or used token returns 400. Then sign in with the new password.

Tokens are HMAC-signed, expire after 15 minutes, and are bound to the user's current password using a keyed fingerprint. An atomic conditional database update allows exactly one concurrent redemption. Any password change, including legacy-password upgrade at login, invalidates older tokens. No new database columns are required. Responses are not cached. Login/recovery retain the existing unauthenticated JSON CORS contract; these endpoints do not issue cookies. Automatic email delivery, a recovery form, session revocation, and production abuse/rate-limit controls require separate deployment/frontend work and are not claimed here.

## Setup and repeatable verification

Use **Node.js 22.18+** (native TypeScript execution for scripts/tests). Existing dependency versions are unchanged.

```sh
npm ci
npx prisma generate
cp .env.example .env
# Set DATABASE_URL to the team's approved database; use the database team's migration process.
# Set PASSWORD_RESET_SUPPORT_EMAIL to a monitored inbox.
# Generate PASSWORD_RESET_SECRET and put the result in .env (never commit it):
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm test
npm run typecheck
npm run build
```

If your package manager disables dependency lifecycle scripts, ensure Prisma generation succeeds explicitly. The recovery operator command loads `.env`; Next.js loads it when the app runs. There is intentionally no fabricated support email or committed secret.

For integration testing, create a **dedicated local PostgreSQL test database**, then run:

```sh
TEST_DATABASE_URL='postgresql://postgres:password@127.0.0.1:5432/tarhal_test' npm run test:integration
```

The suite creates a random schema in that database, applies the existing migration, loads the committed hotel/car fixtures plus synthetic test users, executes route handlers against real Prisma/PostgreSQL, and drops only its own schema afterward. It does not use `DATABASE_URL` from your application or write to the team's existing data. Database failure responses are fault-injected. A stopped/crashed test process can leave its generated `tarhal_test_*` schema; remove only that test schema if needed. Tests are not a browser E2E session.

Verified on 25 September with Node 24.19, Prisma 6.19.3, Next 16.3.5, and a disposable local PostgreSQL 18.4 instance:

- `npm test`: **20 passed** — price/rating/text validation, hashing, expiry, signature tampering and password binding.
- `npm run test:integration`: **14 passed** — all five Auth/Hotels/Cars routes, actual catalog queries, legacy password upgrade, wrong credentials, reset/re-login, concurrent reuse, missing configuration, malformed input and generic database errors.
- TypeScript: passed.
- Production build: passed; Next discovers all five module routes and the existing flight/booking routes.
- Prisma schema and migration unchanged.

## SRS paragraph — ready to copy

The system shall filter the stored hotel and car catalogs using optional query parameters applied together at the database layer. Hotels support inclusive minimum and maximum nightly prices in SAR, an inclusive minimum rating from 1 to 5, a room type, and a city. Cars support a category and inclusive minimum and maximum daily prices in SAR. Text matching shall ignore letter case and match the complete trimmed value. Prices shall be non-negative, contain at most two decimal places, and remain within the existing database precision; the minimum shall not exceed the maximum. Invalid, empty, repeated, or unsupported parameters shall return a validation error. Matching records shall be ordered by price, then identifier; valid searches without matches shall return an empty list. Catalog data is illustrative and does not represent live inventory, reservations, or final insurance pricing.

## Implementation files

| Files | Implementation |
| --- | --- |
| `app/api/hotels/route.ts`, `app/api/cars/route.ts` | Database-backed catalog endpoints and error responses. |
| `lib/catalog-filters.ts` | Shared validation and Prisma filter construction. |
| `lib/prisma.ts` | Reused Prisma client for this module, including development reloads. |
| `app/api/auth/login/route.ts` | Validate credentials, support reset hashes, retain username contract, accept unique email, upgrade legacy passwords. |
| `app/api/auth/forgot-password/route.ts`, `app/api/auth/reset-password/route.ts` | Support instructions and one-use password reset. |
| `lib/passwords.ts`, `lib/password-reset.ts`, `lib/auth-http.ts` | Password hashing, signed recovery tokens, shared JSON validation/response handling. |
| `scripts/issue-password-reset.ts` | Operator-only token issuance after identity verification. |
| `tests/auth-catalog.test.ts`, `tests/endpoints.integration.ts` | Unit and isolated PostgreSQL integration coverage. |
| `.env.example` | Required recovery settings and example test/application database connections. |
| `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore` | Test/operator commands, Node prerequisite, direct TypeScript imports, ignore generated typecheck cache. No dependency version changes. |
| `docs/auth-hotels-cars.md` | API contract, setup, verification results and filtering requirements for the SRS. |

## Remaining integration dependencies

- Saud must supply the expanded fixtures; then rerun the integration suite and check new values/cities. This is the outstanding part of the 23/9 acceptance condition.
- Configure a monitored support inbox and a strong shared recovery secret in the backend and operator environments.
- Frontend integration and joint testing remain to be completed by the relevant owners.
