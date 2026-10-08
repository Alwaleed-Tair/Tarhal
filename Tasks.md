# 📋 Tarhal — Task Plan (Oct 8 – Oct 14, 2026) — DOUBLE EFFORT WEEK

---


## 👤 Abdulelah Alshareef — Backend: Database & Flights/Bookings

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **8/10** | Finalize the booking/search API (last edge cases) + sign off on SPMP's technical sections | Stable API; input given |
| **9/10** | Draft the Class Diagram for the database layer (User, Flight, Seat, Booking, Hotel, Car entities and relationships) | Class Diagram v1 |
| **10/10** | Draft the Sequence Diagram for the booking flow (search → seat selection → booking → confirmation) | Booking sequence diagram |
| **11/10** | Review Saud's schema documentation and align it with the Class Diagram | Consistent schema + diagram |
| **12/10** | Send both diagrams to Mohamed for the combined UML document | Diagrams delivered |
| **13/10** | Support integration testing with Tariq (if his pages need final backend fixes) | Stable integrated flow |
| **14/10** | Final check: confirm the UML document's data model section matches the actual schema | Sign-off on accuracy |

---

## 👤 Saud Mohammed — Backend: Database Implementation

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **8/10** | Finalize all seed data (flights, hotels, cars) to a realistic, demo-ready state | Complete, polished seed data |
| **9/10** | Run a full migration test on a clean database to confirm zero errors | Confirmed clean migration |
| **10/10** | Help Abdulelah verify the Class Diagram against the actual `schema.prisma` | Confirmed diagram accuracy |
| **11/10** | Write a one-page schema reference (table list + purpose) for the UML/SRS appendix | Schema reference document |
| **12/10** | Support any last database fixes needed for integration testing | Stable database layer |
| **13/10** | Backup/export the current database state (useful safety net before the exam gap) | Database backup saved |
| **14/10** | Attend final review | Participated |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **8/10** | Finalize Auth error handling and edge cases | Stable Auth module |
| **9/10** | Finalize Hotels/Cars filtering and pagination (last polish) | Stable Hotels/Cars endpoints |
| **10/10** | Draft the Sequence Diagram for the Auth flow (register → login → session) | Auth sequence diagram |
| **11/10** | Draft the Sequence Diagram for the Hotels/Cars search-and-filter flow | Hotels/Cars sequence diagram |
| **12/10** | Send both diagrams to Mohamed | Diagrams delivered |
| **13/10** | Full regression test of Auth + Hotels/Cars before the exam gap | Confirmed stability going into exams |
| **14/10** | Attend final review | Participated |

---

## 👤 Alwaleed Tair — Backend: AI Integration

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **8/10** | Finalize the router logic (Flash vs. Pro) and lock its current behavior | Stable, documented router |
| **9/10** | Run a final, wider accuracy pass on the Saudi-context destination guide (10+ countries) | Documented accuracy results |
| **10/10** | Draft the Sequence Diagram for the AI chatbot flow (user query → router → model → structured response) | AI sequence diagram |
| **11/10** | Draft the Sequence Diagram for the itinerary generator flow | Itinerary sequence diagram |
| **12/10** | Send both diagrams to Mohamed | Diagrams delivered |
| **13/10** | Document current token-cost figures (useful for SPMP/SRS appendix and for monitoring during the exam gap) | Cost summary documented |
| **14/10** | Attend final review | Participated |

---

## 👤 Tariq Alghamdi — Frontend: Passenger UI

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **8/10** | Finish connecting any remaining passenger pages to real backend data | Fully connected passenger flow |
| **9/10** | Full pass of loading/error states across all passenger pages | Polished error handling |
| **10/10** | Finish the destination guide page integration (with Omar/Alwaleed) | Working destination guide page |
| **11/10** | Draft a simple UI flow diagram of the passenger journey (for the UML doc's interaction view) | Passenger flow diagram |
| **12/10** | Send the flow diagram to Mohamed | Diagram delivered |
| **13/10** | Full end-to-end test of the passenger journey with Abdulelah | Confirmed stable flow going into exams |
| **14/10** | Attend final review | Participated |

---

## 👤 Omar Faraj — Frontend: Admin UI & Design

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **8/10** | Finish bilingual + dark/light mode polish across all admin pages | Fully polished admin UI |
| **9/10** | Finish senior-accessibility mode (text size, contrast) end to end | Working accessibility mode |
| **10/10** | Finish destination guide page visual design (with Tariq/Alwaleed) | Polished destination guide page |
| **11/10** | Draft a simple UI flow diagram of the admin journey (for the UML doc) | Admin flow diagram |
| **12/10** | Send the flow diagram to Mohamed | Diagram delivered |
| **13/10** | Full responsive/visual QA pass across the entire app | Confirmed visual stability going into exams |
| **14/10** | Attend final review | Participated |

---

## 🔗 Key Dependencies This Week

- **Everyone sends their diagram(s) to Mohamed by 12/10** — he needs 2 full days (13–14/10) to merge and review everything into one coherent UML submission.
- **13/10 is a stability-lock day for the whole team** — the goal is to leave the codebase in a state that survives untouched for ~2–3 weeks during exams without anything breaking or going stale.
- **No new features start this week** — everything is finishing, documenting, and stabilizing what already exists, specifically because there's no time to recover from a dropped ball before exams hit.

---

## 📅 Week Summary


> After 14/10, there's a short buffer (15–18/10) before exams start on 10/19 — use it to rest and do any last light touch-ups, not to start new work.
