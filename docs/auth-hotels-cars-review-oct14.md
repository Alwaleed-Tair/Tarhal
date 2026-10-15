# Auth + Hotels/Cars stabilization and UML handoff

Owner: Mohammed Alasad. Prepared and verified on **15 October 2026** against `main` commit `b4e6d25`.

## Assignment audit

The latest published `Tasks.md` covers **8–14 October** and prohibits new features. Its previous version covers **27 September–1 October**. No separate 2–7 October or 15–21 October assignment was found in the task-file history inspected. This delivery follows the published work rather than inventing assignments for the gaps.

| Assignment | Evidence / status |
| --- | --- |
| Prior plan: pagination, Auth errors, filtering/pagination SRS paragraph | Already merged; preserved and regression-tested against the current schema/seed loader. |
| 8/10: finalize Auth errors and edge cases | Reject control characters in email/username before database access; test malformed payloads, missing configuration, wrong credentials, reset expiry/reuse and concurrency. |
| 9/10: finalize catalog filtering/pagination | Fix literal matching of SQL pattern characters and reject invalid control characters; verify pagination limits, boundaries, totals, ordering and empty results. |
| 10/10: Auth sequence diagram | [Auth diagram](auth-sequence-diagram.md) includes the requested proposed register/login/session design and a separate implemented-login diagram. |
| 11/10: catalog sequence diagram | [Hotels/Cars diagram](hotels-cars-sequence-diagram.md) follows actual validation, transaction, filtering and pagination behavior. |
| 12/10: send diagrams to Mohamed | Files ready to deliver. No teammate message sent; delivery/acceptance needs human confirmation. |
| 13/10: full module regression | 34 unit tests + 24 PostgreSQL integration tests passed; TypeScript and production build passed on 15 October. |
| 14/10: attend final review | Requires Mohammed's own attendance/confirmation; cannot be completed through repository edits. |

The dates are assignment dates, not a retrospective claim of daily execution.

## Defects reproduced and corrected

1. Case-insensitive Prisma equality uses PostgreSQL pattern matching: backslash-containing values failed to match literally, while `%`/`_` can act as wildcards. Escape these characters in city, room type and category filters; database-backed regression tests verify literal matching and a standalone `%` returns no unrelated records.
2. NUL/control characters in account identifiers and catalog text reached PostgreSQL, resulting in HTTP 500. Validate them before database access and return the existing HTTP 400 error contract.
3. The team's new required `User.dateOfBirth` field made the duplicate-name test fixture incomplete. Update only that synthetic test user; retain the team's schema, migration and seed loader.

## Verification

- `npm test`: **34 passed**.
- `TEST_DATABASE_URL=... npm run test:integration`: **24 passed**, running the current seed loader in a new disposable local PostgreSQL schema with both migrations.
- `npm run build`: passed, including Next.js TypeScript checks and all existing API routes.
- Mermaid syntax validation: both Auth diagrams and the catalog diagram parsed successfully.
- Project dependencies, flight/booking code, schema, migrations and seed source files are unchanged.
- The regression suite uses 8 committed hotels and 5 cars, plus temporary test fixtures. Expanded persistent catalog data has not appeared yet.
- Database failure responses are fault-injected; this is backend integration testing, not a browser/user-session E2E test or production load audit.

## Documentation/code conflicts and pending decisions

- The README and requested Auth diagram describe registration and sessions, but there is no registration route, NextAuth configuration/dependency or session issuance in the current implementation. The diagram explicitly labels those steps as planned. Adding them during the freeze would violate the no-new-features instruction; the architecture owner should confirm a later implementation plan.
- Main changed reset authenticators from HMAC to scrypt in commit `75ffd68`. This delivery preserves that behavior and corrects the outdated HMAC description. Existing token expiry/reuse tests pass; a token from the older HMAC implementation must be reissued through support.
- `dateOfBirth` is now required. The existing migration adds it without a default, so a database owner must handle backfilling before applying it to a populated User table. Clean-schema regression success does not establish safe migration of existing production records. This delivery does not alter Saud's migration.
- Support recovery still needs a monitored inbox and configured secret. No email, ticket or session is created automatically.

## Files for submission

- `app/api/auth/login/route.ts`, `lib/auth-http.ts`: account identifier validation.
- `lib/catalog-filters.ts`: literal pattern escaping and control-character validation.
- `tests/endpoints.integration.ts`: new edge cases and fixture alignment with the schema.
- `docs/auth-hotels-cars.md`: corrected current API/security/verification notes.
- `docs/auth-sequence-diagram.md`, `docs/hotels-cars-sequence-diagram.md`: UML handoff artifacts.
- `docs/auth-hotels-cars-review-oct14.md`: this scope and verification report.

The personal meeting notes are not a project dependency and should not be submitted.
