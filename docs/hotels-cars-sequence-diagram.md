# Hotels/Cars search and filter sequence — Mohammed Alasad

Assignment: 11 October 2026. Verified against the implementation on 15 October 2026.
Prepared for Mohamed Elshiekh's combined UML document; delivery/acceptance is not claimed.

Both catalogs use the same interaction pattern. The UI participant describes a consuming client; no completed frontend integration is claimed.

```mermaid
sequenceDiagram
    autonumber
    actor User as Passenger
    participant UI as Catalog client
    participant API as GET /api/hotels or /api/cars
    participant Filters as lib/catalog-filters.ts
    participant DB as Prisma / PostgreSQL
    User->>UI: Choose filters or a page
    Note over User,UI: Reset page to 1 when changing filters
    UI->>API: GET with filters, page and pageSize
    API->>Filters: Parse and validate parameters
    alt Invalid, duplicate or unknown parameter
        Filters-->>API: FilterError
        API-->>UI: 400 with validation message
        UI-->>User: Show correction guidance
    else Valid request
        Filters-->>API: where, skip, take, page, pageSize
        API->>DB: Begin repeatable-read transaction
        API->>DB: Find matching rows ordered by price then ID, with skip/take
        API->>DB: Count all rows with the same filters
        alt Query failure
            DB-->>API: Transaction fails
            API-->>UI: 500 generic catalog error
            UI-->>User: Show retry state
        else Success
            DB-->>API: Commit and return page rows plus total
            API->>API: Calculate totalPages and navigation flags
            alt No matches or page beyond available results
                API-->>UI: 200 with empty data and accurate pagination
                UI-->>User: Show empty state or navigate to an available page
            else Matching page
                API-->>UI: 200 success, data and pagination
                UI-->>User: Render results and page controls
            end
        end
    end
```

- Hotels: inclusive nightly `minPrice`/`maxPrice`, inclusive `minRating`, case-insensitive exact `roomType` and `city`.
- Cars: inclusive daily `minPrice`/`maxPrice`, case-insensitive exact `category`.
- Filters combine with AND. Text is trimmed; SQL pattern characters are literal text, not wildcard searches.
- Default `page=1`, `pageSize=20`; maximum page size is 100. Offset is `(page - 1) * pageSize`.
- `total` counts filtered inventory before pagination; `totalPages = ceil(total / pageSize)`.
- One response uses a consistent transaction snapshot. Separate page requests can reflect changed inventory.
- Decimal prices serialize as strings. Catalogs use stored sample data and perform no booking, availability reservation or payment.

Source trace: `app/api/hotels/route.ts`, `app/api/cars/route.ts`, `lib/catalog-filters.ts`, `lib/prisma.ts`, `tests/endpoints.integration.ts`.
