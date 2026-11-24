DROP TABLE IF EXISTS bookings CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'artisan', 'admin')),
  phone VARCHAR(30), suspended BOOLEAN NOT NULL DEFAULT FALSE, suspension_reason TEXT, warnings INTEGER NOT NULL DEFAULT 0,
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE, strike_review_required BOOLEAN NOT NULL DEFAULT FALSE, anonymized_at TIMESTAMPTZ,
  deletion_requested_at TIMESTAMPTZ,
  accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_terms_at TIMESTAMPTZ,
  accepted_terms_version VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'artisan', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warnings INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strike_review_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_version VARCHAR(30);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users (google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_created_idx ON users (created_at DESC);
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(30) NOT NULL, code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS phone_verification_codes_user_idx ON phone_verification_codes (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS artisans (
  id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill VARCHAR(80) NOT NULL, area VARCHAR(120) NOT NULL, bio TEXT, starting_price INTEGER, image_url TEXT,
  rating NUMERIC(2, 1) DEFAULT 0, bank_name VARCHAR(120), bank_code VARCHAR(30), account_number VARCHAR(20),
  recipient_code VARCHAR(120), verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified', verification_id_type VARCHAR(50),
  verification_id_last4 VARCHAR(4), verification_id_ciphertext TEXT, verification_id_photo_url TEXT, verification_selfie_url TEXT,
  verification_rejection_reason TEXT, verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified';
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_id_type VARCHAR(50);
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_id_last4 VARCHAR(4);
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_id_ciphertext TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_id_photo_url TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY, artisan_id INTEGER NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL, description TEXT, price INTEGER NOT NULL, image_url TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS artisans_skill_area_idx ON artisans (skill, area);
CREATE INDEX IF NOT EXISTS artisans_skill_trgm_idx ON artisans USING GIN (skill gin_trgm_ops);
CREATE INDEX IF NOT EXISTS artisans_area_trgm_idx ON artisans USING GIN (area gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_artisan_created_idx ON products (artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING GIN (name gin_trgm_ops);
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artisan_id INTEGER NOT NULL REFERENCES artisans(id) ON DELETE CASCADE, updated_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id, artisan_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT, image_url TEXT, type VARCHAR(30) NOT NULL DEFAULT 'text', order_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(), CHECK (body IS NOT NULL OR image_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages (conversation_id, created_at DESC);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120);
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS bank_code VARCHAR(30);
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS recipient_code VARCHAR(120);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS order_id INTEGER;

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artisan_id INTEGER NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  platform_fee INTEGER NOT NULL CHECK (platform_fee >= 0),
  artisan_amount INTEGER NOT NULL CHECK (artisan_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'delivered', 'confirmed', 'refunded', 'disputed')),
  payment_reference VARCHAR(120) UNIQUE,
  payment_url TEXT,
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  payout_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payout_reference VARCHAR(120),
  payout_error TEXT,
  review_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_customer_status_idx ON orders (customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_artisan_status_idx ON orders (artisan_id, status, created_at DESC);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_24_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_6_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_changes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_idempotency_key VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispute_id INTEGER;
CREATE INDEX IF NOT EXISTS orders_delivery_due_idx ON orders (status, delivered_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_idempotency_idx ON orders (payment_idempotency_key) WHERE payment_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_proofs (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT, uploader_role VARCHAR(20) NOT NULL,
  file_type VARCHAR(100) NOT NULL, public_id TEXT NOT NULL, url TEXT NOT NULL,
  proof_type VARCHAR(20) NOT NULL CHECK (proof_type IN ('artisan_completion', 'customer_dispute')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_proofs_order_idx ON order_proofs (order_id, created_at);

CREATE TABLE IF NOT EXISTS order_milestones (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  name VARCHAR(30) NOT NULL CHECK (name IN ('deposit', 'middle', 'final')), amount INTEGER NOT NULL CHECK (amount > 0),
  position INTEGER NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'released', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (order_id, position)
);

CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY, order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('not_done', 'not_as_agreed', 'damaged', 'wrong_item')),
  explanation VARCHAR(4000) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'decided', 'appealed')),
  decision VARCHAR(40), decision_note TEXT, deciding_admin INTEGER REFERENCES users(id), resolved_at TIMESTAMPTZ,
  appeal_deadline TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_dispute_fk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_dispute_fk FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS strikes (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id INTEGER REFERENCES orders(id) ON DELETE RESTRICT, dispute_id INTEGER REFERENCES disputes(id) ON DELETE RESTRICT,
  reason VARCHAR(500) NOT NULL, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS strikes_user_idx ON strikes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  from_status VARCHAR(20), to_status VARCHAR(20) NOT NULL, changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appeals (
  id SERIAL PRIMARY KEY, dispute_id INTEGER NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE RESTRICT,
  filed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT, reason VARCHAR(4000) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'decided')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE RESTRICT, final_decision VARCHAR(40), final_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY, event_key VARCHAR(255) UNIQUE NOT NULL, event_type VARCHAR(80) NOT NULL,
  reference VARCHAR(120), payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_refunds (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0), paystack_reference VARCHAR(120) UNIQUE, status VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_payouts (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0), paystack_reference VARCHAR(120) UNIQUE, status VARCHAR(30) NOT NULL,
  error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reconciliation_issues (
  id SERIAL PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE RESTRICT, issue_type VARCHAR(50) NOT NULL,
  details TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS reconciliation_open_idx ON reconciliation_issues (order_id, issue_type) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artisan_id INTEGER NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(500),
  photo_url TEXT,
  customer_first_name VARCHAR(80) NOT NULL,
  artisan_reply VARCHAR(500),
  artisan_replied_at TIMESTAMPTZ,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reviews_artisan_created_idx ON reviews (artisan_id, created_at DESC);
CREATE TABLE IF NOT EXISTS review_reports (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('fake', 'rude', 'wrong_person')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (review_id, reported_by, reason)
);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE TABLE IF NOT EXISTS reported_messages (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, reported_by)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_decision VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(120);
