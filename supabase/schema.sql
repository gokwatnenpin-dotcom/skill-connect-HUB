DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'artisan', 'admin')),
  phone VARCHAR(30), suspended BOOLEAN NOT NULL DEFAULT FALSE, suspension_reason TEXT, warnings INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'artisan', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warnings INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users (google_sub) WHERE google_sub IS NOT NULL;
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
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
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMPTZ;

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
