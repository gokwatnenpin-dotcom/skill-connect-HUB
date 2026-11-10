# SkillConnect-HUB

SkillConnect-HUB is a direct-message marketplace for customers and artisans. There are no bookings: customers find an artisan or product, open one conversation, and agree on the details in the DM.

## Setup

Requirements: Node.js 18+ and PostgreSQL.

1. Create the PostgreSQL database:

```bash
createdb skillconnect_hub
```

2. Create the local environment file:

```bash
cp .env.example .env
```

Edit `.env` if your PostgreSQL username, password, host, or port differs. The default database URL is:

```text
postgresql://postgres:postgres@localhost:5432/skillconnect_hub
```

3. Load the schema:

```bash
psql "$DATABASE_URL" -f backend/db/schema.sql
```

4. Install and run both applications:

```bash
npm install
npm run dev
```

The frontend is at `http://localhost:5173` and the backend is at `http://localhost:5000`.

## Current features

- Customer and artisan signup/login with hashed passwords and login tokens.
- Empty database on first setup: no seeded artisans, products, or sample cards.
- Artisan profile creation/editing and product add/edit/delete.
- Public skill/area search, artisan profile pages, product pages, and product lists.
- One direct conversation per customer and artisan.
- Text and photo-URL messages with polling refresh and inbox listing.
- “Message” on artisan profiles and “Ask about this” on products.

Payments, Cloudinary uploads, unread persistence, moderation, and real-time sockets are not included yet.
