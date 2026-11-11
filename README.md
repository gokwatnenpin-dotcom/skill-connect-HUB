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

Add Paystack test credentials before testing payments:

```text
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
PAYSTACK_FEE_PERCENT=10
PAYSTACK_CALLBACK_URL=http://localhost:5173/#inbox
```

3. Load the schema:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

4. Install and run both applications:

```bash
npm install
npm run dev
```

The frontend is at `http://localhost:5173` and the backend is at `http://localhost:5000`.

## Project structure

- `server/index.js` — Express API
- `src/db.js` — PostgreSQL connection
- `supabase/schema.sql` — database schema
- `web/src/` — React/Vite application
- `Dockerfile` and `render.yaml` — deployment configuration

## Current features

- Customer and artisan signup/login with hashed passwords and login tokens.
- Empty database on first setup: no seeded artisans, products, or sample cards.
- Artisan profile creation/editing and product add/edit/delete.
- Public skill/area search, artisan profile pages, product pages, and product lists.
- One direct conversation per customer and artisan.
- Text and photo messages with polling refresh and inbox listing.
- “Message” on artisan profiles and “Ask about this” on products.
- Payment requests inside DMs, Paystack verification/webhooks, order status, dispute, and payout tracking.
- Confirmed-order reviews with ratings, comments/photos, seven-day customer edits, artisan replies, reports, trust badges, and optional email reminders.

For hosted payments, set the Paystack webhook URL to `https://YOUR-API-DOMAIN/api/paystack/webhook`. Paystack must be able to reach this URL over HTTPS. The backend verifies the signature and transaction amount before marking an order paid.

Email reminders require `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`. Without SMTP settings, the rest of the review flow works but reminders are not sent.

Admin accounts are created at backend startup from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; public signup cannot create admins. Set `VERIFICATION_ENCRYPTION_KEY` before accepting identity submissions. Admin access is at `#admin` after logging in.

Cloudinary uploads and real-time sockets are not included yet.
