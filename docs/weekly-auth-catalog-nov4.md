# Weekly auth and catalog delivery — November 4

Rebased implementation onto main f5609c2 with Saud's complete v3 schema. No duplicate schema migration or placeholder car data is included.

Implemented registration (name, email, phone, password, dateOfBirth), signed HttpOnly session cookies, logout, getCurrentUser, same-origin auth mutations, role protection, and car filters (city, make, minSeats, minYear, transmission, available inventory). Full catalog records include hotel address/imageUrl and car insurancePricePerDay.

Admin APIs now read the authenticated database role instead of trusting x-user-role. Bookings derive userId from the authenticated session. Next.js 16 proxy reads request cookies directly. Password changes invalidate existing sessions; logout clears the browser cookie (copied stateless cookies remain valid until expiration or password change).

Set SESSION_SECRET to at least 32 random bytes, shared across instances. Production requires HTTPS. Registration returns 201 but does not automatically log in; use POST /api/auth/login afterward. POST /api/auth/logout clears the session. Admin requires Role.ADMIN.

Fixed two existing build incompatibilities: flight route params must be awaited, and the performance query now uses insurancePricePerDay instead of removed insuranceOption.

Validation: 53 automated tests pass. Production build/typecheck verified after compatibility fixes. Database integration and deployed regression require a configured test database and deployment URL, neither supplied in this checkout. Frontend listing/auth pages are not implemented as runnable routes on main (admin work is an archive); their browser integration cannot yet be verified.
