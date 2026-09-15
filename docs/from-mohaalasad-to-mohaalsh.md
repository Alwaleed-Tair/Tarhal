
## Week 2 scope handoff for Mohamed Elshiekh

From: Mohammed Alasad — Auth & Hotels/Cars. Prepared on 15 September 2026 for the 16/9 deliverable in [Tasks.md](../Tasks.md), ahead of the 17/9 final review. The paragraph below describes planned MVP behavior, not implemented application functionality. It is ready to copy into the proposal; delivery and inclusion are not yet confirmed.

## MVP paragraph

In the MVP, users will register with their name, phone, email, and password and log in through NextAuth.js Credentials authentication, with server-controlled traveler roles and protected access to their dashboard. Hotels will be browsed from eight seeded sample records showing city, nightly price, rating, and a representative room type. Cars will be browsed from five seeded sample categories showing daily prices and whether optional insurance is offered. Both catalogs will use illustrative stored data with no live pricing or availability, and this module will process no real hotel/car reservations, insurance purchases, or payments.

## Authentication flow — 13/9 deliverable

Reviewed on 15 September 2026 and reused from the earlier milestone because it satisfies the Week 2 assignment. The one-page diagram shows the planned registration and login flows, including the required registration fields and failure handling. Account creation is followed by a successful sign-in before entering the protected dashboard.

![Tarhal registration and login flow](auth-flow.png)

[Scalable SVG version](auth-flow.svg)

## Final-review notes — 17/9

- Hotels/cars use the [finalized seed source](../prisma/seeds/README.md), not Amadeus or another live provider. Catalog prices and ratings are illustrative.
- Hotel/Car models and JSON data exist; authentication, API routes, migrations, and database seed loading have not been implemented or executed by this handoff.
- The database team needs to resolve missing `User.phone` before implementing the registration flow. The paragraph intentionally retains the required phone input.
- Confirm that the final Scope says browsing of sample hotels/cars, not live reservations, insurance purchases, or real payments. The broader README feature list is a project vision, not proof of delivered functionality.
- The updated task plan schedules both the weekly meeting and final proposal review for **17 September**, with submission before **11:59 PM**.

Suggested message to send with the repository/PR link:

> محمد، جهزت فقرة نطاق عمل Auth + Hotels/Cars ومخطط التسجيل والدخول للأسبوع الثاني في هذا الملف. اعتمدنا بيانات تجريبية للفنادق والسيارات بدون أسعار أو توفر مباشر وبدون دفع حقيقي. الفقرة جاهزة للإضافة إلى المقترح، وأحتاج تأكيد أن وصف الجزء في النسخة النهائية يطابق هذا النطاق.
