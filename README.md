# SkillConnect-HUB

SkillConnect-HUB is a direct-message marketplace for customers and artisans. There are no bookings: customers find an artisan or product, open one conversation, and agree on the details in the DM.

## Setup

Requirements: Node.js 18+ and PostgreSQL.

1. Create the PostgreSQL database:

```bash
createdb skillconnect_hub
```

2. Create the separate local environment files:

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

Edit `server/.env` for backend secrets and database settings. Edit `web/.env` only for the frontend API address. The default database URL is:

```text
postgresql://postgres:postgres@localhost:5432/skillconnect_hub
```

Add Paystack test credentials to `server/.env` before testing payments:

```text
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
PAYSTACK_FEE_PERCENT=10
PAYSTACK_CALLBACK_URL=http://localhost:5173/#inbox
```

3. Load the schema once:

```bash
npm run db:setup
```

4. Install and run both applications:

```bash
npm install
npm run dev
```

The frontend is at `http://localhost:5173` and the backend is at `http://localhost:5000`.

## Project structure

- `server/index.js` — Express application composition and background jobs
- `server/routes/` — auth and upload route modules
- `server/validators/` — request validation
- `server/services/` — Cloudinary and email integrations
- `server/migrations/` — database setup runner
- `server/.env` — backend-only environment values
- `src/db.js` — PostgreSQL connection
- `supabase/schema.sql` — database schema
- `web/src/` — React/Vite application
- `web/.env` — frontend-only `VITE_API_URL`
- `Dockerfile` and `render.yaml` — deployment configuration

## Current features

- Customer and artisan signup/login with hashed passwords and login tokens.
- Optional Google sign-in through Supabase Auth, exchanged for a SkillConnect-HUB session.
- Empty database on first setup: no seeded artisans, products, or sample cards.
- Artisan profile creation/editing and product add/edit/delete.
- Public skill/area search, artisan profile pages, product pages, and product lists.
- One direct conversation per customer and artisan.
- Text and photo messages with polling refresh and inbox listing.
- “Message” on artisan profiles and “Ask about this” on products.
- Payment requests inside DMs, Paystack verification/webhooks, order status, dispute, and payout tracking.
- Confirmed-order reviews with ratings, comments/photos, seven-day customer edits, artisan replies, reports, trust badges, and optional email reminders.

For hosted payments, set the Paystack webhook URL to `https://YOUR-API-DOMAIN/api/paystack/webhook`. Paystack must be able to reach this URL over HTTPS. The backend verifies the signature and transaction amount before marking an order paid.

Email reminders use Brevo's transactional email API. Add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` to `server/.env`. The sender email must be verified in Brevo. Without these settings, the rest of the review flow works but reminders are not sent.

Admin accounts are created at backend startup from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; public signup cannot create admins. Set `VERIFICATION_ENCRYPTION_KEY` before accepting identity submissions. Admin access is at `#admin` after logging in.

## Deploy

Photos are uploaded directly through the backend to Cloudinary. Public profile, product, chat, and review photos use Cloudinary upload assets. Verification ID photos and selfies use authenticated Cloudinary assets; only an authenticated admin can request short-lived signed viewing URLs.

### Render

Push this repository to GitHub, create a Render Blueprint from `render.yaml`, or create the PostgreSQL database and web service manually. The service uses `npm install && npm install --prefix web && npm run build` and starts with `npm start`. The Render database created by the Blueprint is named `skillconnect_hub`; run `npm run db:setup` once against its `DATABASE_URL`.

Set these values in the Render web service: `CLIENT_URL` (the exact Vercel URL), Paystack test keys (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `PAYSTACK_CALLBACK_URL`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `VERIFICATION_ENCRYPTION_KEY`. `NODE_ENV=production` is set by `render.yaml`; the backend uses Render's `PORT` and PostgreSQL SSL in production.

### Vercel

Create a Vercel project with the repository root directory set to `web`. Use build command `npm run build`, output directory `dist`, and add `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`. The `web/vercel.json` rewrite keeps hash routes and direct page refreshes working.

### Google sign-in

Create a Supabase project, enable Google under Authentication → Providers, and add the Vercel URL under Authentication → URL Configuration. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` on Render, and `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on Vercel. The first Google sign-in asks whether the new account is a customer or artisan. Supabase verifies the Google identity, and the backend exchanges the Supabase access token for a SkillConnect-HUB session. The Supabase email settings are separate from SkillConnect-HUB reminder email; Brevo remains optional for reminders.

### Paystack webhook

After the Render service is live, paste this exact URL into Paystack (replace the hostname):

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/paystack/webhook
```

Use Paystack test keys for the application demo. Render's free service can sleep, so the first request after inactivity may take up to about a minute.

### Local environment files

Backend names are in `.env.example`. Frontend names are in `web/.env.example`. `.env` files are ignored by Git; never commit real Paystack, Cloudinary, database, SMTP, admin, or encryption values. Real-time sockets are intentionally not included: chat uses polling as requested.
