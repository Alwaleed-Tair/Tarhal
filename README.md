# Tarhal | ترحال


## 👥 Team

| Name | Role | Key Responsibilities |
|---|---|---|
| Mohamed Elshiekh | Team Lead — Architecture & Documentation | System architecture, ERD design, writing SPMP/SRS/SDS/STS, coordinating testing |
| Abdulelah Alshareef | Backend — Database & Flights/Bookings | Prisma schema implementation, search/booking/seat logic |
| Mohammed Alasad  | Backend — Auth & Hotels/Cars | NextAuth.js, role management, hotels & cars API |
| Alwaleed Tair | Backend — AI Integration | Chatbot, destination guide, token/cache management |
| Tariq Alghamdi | Frontend — Passenger UI | Search/booking pages, seat selection, digital ticket |
| Omar Faraj | Frontend — Admin UI & Design | Admin dashboard & analytics, overall visual design |



# ✈️ Tarhal — Integrated Travel Platform

Software Engineering course project — [IAU], [9/2026].

---

## 📖 Overview

Tarhal is a comprehensive travel platform (OTA - Online Travel Agency) that lets users book flights, hotels, and car rentals in one place, with an AI assistant to help plan trips and answer destination-related questions. The project originally started as a Javascript (PostgreSQL) desktop flight booking system and has been fully rebuilt as a modern web application.


---

##  Key Features

- 🔍 Flight search and booking (one-way / round-trip) with interactive seat selection
- 🏨 Hotel booking with filters (rating, price, room type)
- 🚗 Car rental (multiple categories + optional insurance)
- 🤖 AI Travel Copilot:
  - Conversational search chatbot
  - Smart destination guide (weather, visa requirements, currency, cultural tips)
  - Automatic itinerary generator
- 🎫 boarding pass
- 📊 Admin dashboard (inventory management, dynamic pricing, analytics)
- 🌗 Full bilingual support (Arabic/English) and dark/light mode
- profile 

## Sub Features
- 🎁 Bundle & Save — flight + hotel + car with automatic discount
- 🎫 Digital boarding pass with QR Code + PDF export
- ♿ Senior-friendly accessibility: voice chatbot, larger text, high-contrast mode
- Wallet
- 📊 Sub and Super Admin
- More Actors
- $ Subscription system
- SkyMiles / Loyalty Points
- Cultural Compass
---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js (React + TypeScript) |
| UI/Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL + Prisma ORM |
| Database Hosting | Neon / Supabase |
| Authentication | NextAuth.js |
| AI | Claude API / OpenAI API + Netlify AI SDK |
| Voice | Web Speech API |
| External Data | Amadeus API (hotels/cars), REST Countries API, OpenWeatherMap API |
| Deployment | Netlify / Render |
| Version Control | Git + GitHub |

---

## 🏗️ Architecture

```
User (Browser)
        │
        ▼
   Next.js Frontend (React + Tailwind)
        │  REST API Calls
        ▼
   Next.js API Routes (Backend)
   ├── Auth Service (NextAuth.js)
   ├── Booking Service (Flights/Hotels/Cars)
   ├── AI Service (Claude/OpenAI + Structured Outputs)
   └── Admin Service (Inventory, Pricing, Analytics)
        │
   ┌────┴─────────────┬──────────────────┐
   ▼                  ▼                  ▼
PostgreSQL        Amadeus API      Claude/OpenAI API
(via Prisma)      (hotels/cars)    + Web Speech API
```

Core principle: **the frontend never talks to the database directly** — all access goes through API Routes, allowing frontend and backend work to proceed independently and in parallel.


---

## 📁 Project Structure

```
Tarhal/
├── app/                  # Next.js pages and routes
│   ├── (auth)/           # Login / Register
│   ├── (passenger)/      # Passenger-facing UI
│   ├── (admin)/          # Admin dashboard
│   └── api/              # API Routes
├── components/           # Shared React components
├── lib/
│   ├── ai/               # AI service logic
│   ├── db/               # Database utilities
│   └── utils/            # General helper functions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/
├── docs/                 # SPMP, SRS, SDS, STS
└── public/               # Static assets and images
```


> ⚠️ Never share or commit your `.env` file — make sure it's included in `.gitignore`.

---


## 📄 Documentation

All course deliverables are located in [`/docs`](./docs):

- [Project Proposal](./docs/proposal.md)
- [SPMP — Software Project Management Plan](./docs/SPMP.md)
- [SRS — Software Requirements Specification](./docs/SRS.md)
- [SDS — Software Design Specification](./docs/SDS.md)
- [STS — Software Test Specification](./docs/STS.md)
