# Hotel and car seed source — Week 2

Owner: Mohammed Alasad. Decision finalized and fixtures checked on **15 September 2026** for the **14/9** assignment in [Tasks.md](../../Tasks.md).

## Decision

Use the existing [hotels.json](hotels.json) and [cars.json](cars.json) as the MVP hotel/car data source. They contain **8 fictional hotels** and **5 sample car categories**, ready for database loading. Reuse the prior week's fixtures and stable IDs; no data rewrite is needed.

The previous milestone's public-provider investigation did not establish a working authenticated hotel/car source. Week 2 explicitly permits seed data, so this decision finalizes that option rather than depending on an unverified integration. No provider key or live endpoint is required for these fixtures. The decision does not claim that no suitable provider exists or that a new provider investigation was conducted this week.

## Data contract

| File | Business fields | Semantics |
| --- | --- | --- |
| hotels.json | name, city, pricePerNight, rating, roomType | One representative room type per hotel; nightly price in SAR; sample rating on a 1–5 scale |
| cars.json | category, pricePerDay, insuranceOption | Daily base price in SAR; boolean indicates whether optional insurance is offered, not purchased |

Both files also include fixed UUID `id` values matching the primary keys in [schema.prisma](../schema.prisma). Prices are positive JSON numbers with at most two decimal places, stored in PostgreSQL `Decimal(10,2)` columns. Names, locations, prices, ratings, and insurance availability are illustrative catalog data, not supplier-backed quotes. There is no insurance premium, live inventory, reservation processing, or payment processing in this module's current scope.

The [field handoff](../../docs/from-mohaalasad-to-abdulelah.md) specifies every type and validation rule for Saud and Abdulelah.

## Loading handoff

After the database team finishes its schema review and test migration:

1. Parse and validate both arrays before writing: exact keys, unique UUIDs, non-empty text, positive prices within Decimal(10,2), rating range, and real booleans.
2. Use the generated Prisma Hotel/Car models and upsert each record by its stable `id` in a transaction; do not delete other inventory.
3. Check all eight hotel IDs and five car IDs exist and have the expected values. Existing inventory may make total table counts larger than 8 and 5.
4. Rerun the loader and confirm the same IDs are updated without duplicates; report the test database result to Mohammed.

No database write or migration was performed here. The current repository has no runnable application, package manifest, or seed loader; Week 2 assigns database implementation/migration to Saud under Abdulelah's supervision. Future browser access must go through the project's API routes.
