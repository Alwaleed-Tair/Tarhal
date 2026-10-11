
## Week 2 field contract for Saud Mohammed and Abdulelah Alshareef

From: Mohammed Alasad — Auth & Hotels/Cars. Prepared and checked on 15 September 2026 for the 15/9 assignment in [Tasks.md](../Tasks.md). This existing filename is retained so earlier handoff links still work; the document now addresses both database teammates.

All listed business fields are required. Additional `id` primary keys follow the existing UUID convention; the JSON includes stable UUIDs so a future loader can upsert by ID without duplicating records. Both models are already present in [schema.prisma](../prisma/schema.prisma); preserve and review them when integrating Saud's schema work rather than creating duplicate tables.

Data source: finalized fictional seed catalogs, [hotels.json](../prisma/seeds/hotels.json) and [cars.json](../prisma/seeds/cars.json). See the [source decision and loading contract](../prisma/seeds/README.md).

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

The JSON files are plain arrays whose keys match their Prisma models, ready for `prisma.hotel` and `prisma.car` insertion after the database owner completes setup. For a repeatable loader, validate the full dataset first, then upsert by `id` in a transaction without deleting any existing inventory. No loader, migration, database connection, or hotel/car booking relationship is included in Mohammed's current assignment. The existing `Booking` remains flight-specific.

## Auth dependency to resolve during schema review

The registration flow and proposal paragraph require a phone number, but `User` still has no `phone` field. Saud and Abdulelah should confirm its representation and how existing users will be handled before registration is implemented. The existing `password` field must eventually store a password hash, and the existing server-assigned default role is `traveler`. This handoff does not alter their User, Flight, Seat, Booking, or BookingTraveler models.

## Requested acknowledgment

- [x] Required Hotel/Car fields exist in the current repository schema and match the JSON keys.
- [ ] Saud confirms receipt and preserves the models in his implementation.
- [ ] Abdulelah confirms review of the fields and seed conventions.
- [ ] Database team confirms the migration/seed-loading result and resolves `User.phone` before runtime authentication work.

Repository verification is complete; delivery to the teammates, their acknowledgment, and database execution are not confirmed. After sharing this file, record the acknowledgment or PR link here.

Suggested message to send with the repository/PR link:

> سعود وعبدالإله، جهزت قائمة حقول الفنادق والسيارات للأسبوع الثاني في هذا الملف. جدولا Hotel وCar موجودان بالفعل في schema.prisma، وملفا البيانات يحتويان على ٨ فنادق و٥ فئات سيارات تجريبية. راجعوا الحقول وحافظوا عليها عند دمج عمل قاعدة البيانات، وأكدوا لي استلامها ومطابقتها. لاحظت أيضًا أن User لا يحتوي على phone رغم أنه مطلوب في التسجيل؛ نحتاج حسمه قبل تنفيذ التسجيل.
