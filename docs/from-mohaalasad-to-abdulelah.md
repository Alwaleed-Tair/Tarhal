
## Field contract for Abdulelah

All listed business fields are required and use the exact names in the 9/9 assignment. Additional `id` primary keys follow the existing UUID convention; the JSON includes stable UUIDs so a future loader can upsert by ID without duplicating records.

| Model | Field | Prisma type | Meaning / validation for the loader and later API |
| --- | --- | --- | --- |
| Hotel | id | String, UUID primary key | Stable sample identifier; database generates a UUID when omitted |
| Hotel | name | String | Non-empty sample hotel name |
| Hotel | city | String | Non-empty city name |
| Hotel | pricePerNight | Decimal(10,2) | Positive SAR amount per night for the listed room type; at most two decimal places |
| Hotel | rating | Float | Sample rating from 1 to 5, not a certified star classification |
| Hotel | roomType | String | One representative room type per hotel: Single, Double, Twin, Family, or Suite in this dataset |
| Car | id | String, UUID primary key | Stable sample identifier; database generates a UUID when omitted |
| Car | category | String | Economy, Compact, Sedan, SUV, or Luxury in this dataset |
| Car | pricePerDay | Decimal(10,2) | Positive SAR daily base price; at most two decimal places |
| Car | insuranceOption | Boolean | `true` means optional insurance is offered, not that the user selected or paid for it |

`roomType` stays singular to match the exact table contract. The eight sample hotels cover multiple room types across the catalog; multiple independently priced rooms per property would need a later model change. `insuranceOption` describes availability only; this scope does not invent a premium or coverage terms. These bounded seed conventions can be revised at review without changing the other modules.

New catalog prices use PostgreSQL fixed-precision decimals to preserve monetary values. Existing flight/booking Float prices remain untouched. JSON prices are numbers accepted as Prisma Decimal inputs. A future API should define how decimal values are serialized for the frontend. Required fields/types are represented in the schema; positive-price, rating-range, and non-empty-string rules must also be enforced by the future loader/API.

The JSON files are plain arrays whose keys match their Prisma models, ready for `prisma.hotel` and `prisma.car` insertion after the database owner completes setup. For a repeatable loader, validate the full dataset first, then upsert by `id` in a transaction without deleting any existing inventory. No loader, migration, database connection, or hotel/car booking relationship is included in the current assignment. The existing `Booking` remains flight-specific.
