# Auth, Hotels and Cars — API and SRS Handoff

Owner: Mohammed Alasad — Auth & Hotels/Cars.
Week 3 (20–26 September) reviewed and Week 4 (27 September–1 October) implemented and verified on **2 October 2026**, based on `main` commit `e6c0f90`.

## Scope and implementation status

Tarhal uses Next.js/TypeScript, PostgreSQL and Prisma. Week 3's support-assisted password recovery, hashed-password login, hotel/car filtering and SRS paragraph were already merged. This update adds pagination, clearer Auth error responses and regression coverage for Mohammed Alasad's endpoints only. No schema, migration, seed data, flight/booking endpoint, frontend or dependency changes are included.

README describes planned NextAuth/registration features; the existing login endpoint verifies credentials but does not issue a session. Password recovery remains support-assisted, without automatic email delivery.

Saud's `prisma/seed.ts` is now available and was executed inside the integration suite's isolated test schema. Its hotel/car sources still contain **8 hotels and 5 cars**. The tests use those records and the seeded user, plus temporary pagination fixtures that are removed afterward. Expanded persistent catalog data has not been supplied; temporary test records do not replace Saud's task.

## API contract for frontend integration

### Catalogs

- `GET /api/hotels?minPrice=200&maxPrice=600&minRating=4&roomType=Suite&city=Riyadh&page=1&pageSize=10`
- `GET /api/cars?category=SUV&minPrice=100&maxPrice=400&page=1&pageSize=10`

All filters are optional and combined with AND. Prices are SAR per night/day, inclusive, non-negative, at most two decimal places, and limited to `99999999.99` by the existing `Decimal(10,2)` fields. `minPrice` cannot exceed `maxPrice`. `minRating` is an inclusive minimum on the 1–5 scale. Text filters are trimmed, case-insensitive **exact** matches, at most 100 characters. Categories and room types are not hardcoded, so new database values remain searchable. Invalid, empty, duplicate, and unknown filters return HTTP 400.

Successful responses preserve `success` and `data`, and add a `pagination` object. Results are sorted by price ascending, then ID.

- `page`: positive integer, default **1**.
- `pageSize`: integer from **1 to 100**, default **20**.
- Both parameters are optional. Empty, duplicate, fractional, negative, exponential, or excessively large values return 400. The maximum page and computed offset are each limited to 2,147,483,647.
- Filters apply **before** pagination. `total` counts every matching row, not just the current page; `totalPages = ceil(total / pageSize)`.
- A valid page beyond the last page returns 200 with an empty `data` array and the actual totals. With no matches, `totalPages` is 0 and both navigation flags are false. For an out-of-range page with matches, `hasPreviousPage` is true so the client can navigate back; the page number is not silently changed.
- Data and count queries run in one repeatable-read transaction so each response uses a consistent snapshot. Separate page requests may reflect later inventory changes.
- **Frontend update:** requests without pagination now return at most 20 records. Use `pagination` to render navigation; reset `page` to 1 when changing filters.

Example shape (two matching records, one returned on page 1):

```json
{
  "success": true,
  "data": [{ "id": "hotel-id", "name": "Sample hotel", "city": "Riyadh", "pricePerNight": "320", "rating": 4.2, "roomType": "Single" }],
  "pagination": {
    "page": 1,
    "pageSize": 1,
    "total": 2,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```
 No match returns HTTP 200 with `data: []`. Prisma serializes decimal prices as JSON strings, e.g. `"320"`; frontend formatting must account for that. Database failures return a generic HTTP 500. These are sample catalog listings, not live availability or bookings. Use same-origin requests or the frontend's backend proxy for catalog requests.

### Login

`POST /api/auth/login` accepts the existing `{ "username": "Test Traveler", "password": "..." }` contract, or `{ "email": "traveler@example.test", "password": "..." }`. Supply one identity field. Successful responses retain `{ "success": true, "message": "Login successful!", "user": { "id": "...", "name": "..." } }`. Invalid payloads return 400; invalid credentials or ambiguous duplicate names return 401; database failures return 500. Accounts sharing a name must use their unique email. Email lookup follows the existing exact database value.

Reset passwords use salted scrypt hashes. Existing plaintext demo passwords are upgraded on successful login using a conditional update. No account records are deleted. This endpoint still verifies credentials only; session issuance and protected-route authorization remain outside this week's implementation and must not be inferred from a successful login response.

### Auth errors for frontend integration

Errors retain the existing string `error` and HTTP status, with additive `code` and optional `field` properties. The UI can display `error` directly or use `code` for its own translation. Success payloads remain unchanged.

```json
{ "success": false, "error": "Enter a valid email address, such as name@example.com.", "code": "INVALID_EMAIL", "field": "email" }
```

| Code | Status | Meaning / next action |
| --- | --- | --- |
| `INVALID_BODY` | 400 | Send a JSON object, not malformed JSON, null or an array. |
| `IDENTITY_CONFLICT` | 400 | Supply email or username, not both. |
| `INVALID_EMAIL`, `INVALID_USERNAME`, `INVALID_PASSWORD` | 400 | Correct the indicated field. Existing login passwords need not meet the new-password minimum length. |
| `INVALID_CREDENTIALS` | 401 | Check credentials, try email if a name is shared, or use recovery. Identical response for absent accounts, shared names and wrong passwords. |
| `CREDENTIALS_CHANGED` | 401 | Sign in again with the current password. |
| `RESET_TOKEN_REQUIRED` | 400 | Enter the token received from support. |
| `INVALID_NEW_PASSWORD` | 400 | Choose a password of 12–128 characters. |
| `INVALID_RESET_TOKEN` | 400 | Request a new token; the old one may be expired, used or invalid. |
| `RECOVERY_UNAVAILABLE` | 503 | Retry later or contact the administrator. Configuration details are not exposed. |
| `LOGIN_UNAVAILABLE`, `RESET_UNAVAILABLE` | 500 | Retry later; database details are not exposed. |

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

The suite creates a random schema in that database, applies the existing migration, runs Saud's committed `prisma/seed.ts` and adds temporary pagination/test records, executes route handlers against real Prisma/PostgreSQL, and drops only its own schema afterward. It does not use `DATABASE_URL` from your application or write to the team's existing data. Database failure responses are fault-injected. A stopped/crashed test process can leave its generated `tarhal_test_*` schema; remove only that test schema if needed. The seed loader deletes table contents, so the suite passes only its newly created test schema to it. Do not run that loader against a populated application database. Tests are not a browser E2E session.

Verified on 2 October with Node 24.19, Prisma 6.19.3, Next 16.3.5, and a disposable local PostgreSQL 18.4 instance:

- `npm test`: **34 passed** — filtering and pagination validation, offsets/metadata, hashing, expiry, signature tampering and password binding.
- `npm run test:integration`: **20 passed** — all five Auth/Hotels/Cars routes with the current seed loader, page traversal, defaults/limits, filtered totals, equal-price ordering, empty/out-of-range pages, legacy login upgrade, structured errors, reset/re-login and concurrent reuse.
- TypeScript: passed.
- Production build: passed; Next discovers all five module routes and the existing flight/booking routes.
- Prisma schema and migration unchanged.

## SRS paragraph — ready to copy

The system shall filter the stored hotel and car catalogs using optional query parameters applied together at the database layer. Hotels support inclusive minimum and maximum nightly prices in SAR, an inclusive minimum rating from 1 to 5, a room type, and a city. Cars support a category and inclusive minimum and maximum daily prices in SAR. Text matching shall ignore letter case and match the complete trimmed value. Prices shall be non-negative, contain at most two decimal places, and remain within the existing database precision; the minimum shall not exceed the maximum. Invalid, empty, repeated, or unsupported parameters shall return a validation error. Matching records shall be ordered by price, then identifier, and paginated using a positive page number and a page size from 1 to 100, defaulting to page 1 and 20 records. Filtering shall precede pagination. Each successful response shall include the matching total, total page count and navigation flags alongside the page records. Invalid pagination shall return a validation error; valid searches without matches or pages beyond the available results shall return an empty list with accurate totals. Catalog data is illustrative and does not represent live inventory, reservations, or final insurance pricing.

## Implementation files

| Files | Implementation |
| --- | --- |
| `app/api/hotels/route.ts`, `app/api/cars/route.ts` | Database-backed filtering/pagination with consistent row counts and error responses. |
| `lib/catalog-filters.ts` | Shared filter/pagination validation, offsets, metadata and Prisma filter construction. |
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

- The current seed loader has been tested successfully. Rerun against expanded hotel/car fixtures when Saud supplies them; the committed catalogs still contain 8/5 records.
- Configure a monitored support inbox and a strong shared recovery secret in the backend and operator environments.
- Frontend integration and joint testing remain to be completed by the relevant owners.
