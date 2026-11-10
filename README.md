# SkillConnect-HUB

SkillConnect-HUB connects customers with trusted artisans for services and, later, products.

## Run locally

Requirements: Node.js 18+ and PostgreSQL.

```bash
npm install
cp .env.example backend/.env
npm run dev
```

The demo opens at `http://localhost:5173`; the API runs at `http://localhost:5000`.

To create the database tables:

```bash
psql "$DATABASE_URL" -f backend/db/schema.sql
```

## Demo scope

The first demo covers project setup, a service search, artisan profiles, and booking requests. Authentication, Paystack escrow, Cloudinary uploads, and production deployment follow next.

## Product roadmap

1. Setup, authentication, artisan profiles, search, and booking demo
2. Messaging after booking: one customer–artisan chat, text/photo messages, quotes, unread indicator, reporting, and safety notice
3. Artisan products: Services/Shop tabs, product photo/name/price, “Ask about this” opening the same chat with the product attached
4. Paystack payment protection, job/product confirmation, reviews, dashboards, admin tools, and deployment

Messaging and products share the same conversation, payment, review, complaint, and moderation foundation. Real-time chat, voice notes, WhatsApp alerts, and multilingual support are later enhancements.
