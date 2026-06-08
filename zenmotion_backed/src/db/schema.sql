-- ==========================================================================
-- ZenMotion schema. Money is always stored in MINOR units (cents), integers.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens (rotation / revocation). We store a hash, never the raw token.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- Orders. The cart is recomputed server-side; we persist the authoritative snapshot.
CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  user_id           TEXT,
  email             TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending|paid|failed|refunded|cancelled
  currency          TEXT NOT NULL,
  subtotal_cents    INTEGER NOT NULL,
  shipping_cents    INTEGER NOT NULL DEFAULT 0,
  total_cents       INTEGER NOT NULL,
  has_physical      INTEGER NOT NULL DEFAULT 0,
  shipping_json     TEXT,        -- JSON shipping address (physical orders)
  provider          TEXT,        -- e.g. 'airwallex'
  provider_ref      TEXT,        -- payment intent id / hosted page id
  provider_status   TEXT,
  payment_method    TEXT,        -- card|apple_pay|paypal
  metadata_json     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at           TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_provider_ref ON orders(provider_ref);

CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL,
  product_id    TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  product_type  TEXT NOT NULL, -- digital|physical
  unit_cents    INTEGER NOT NULL,
  qty           INTEGER NOT NULL,
  options_json  TEXT,          -- e.g. {"Size":"L"}
  line_cents    INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Digital entitlements granted after a successful purchase (course access).
CREATE TABLE IF NOT EXISTS entitlements (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  email       TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  order_id    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_entitlements_email ON entitlements(email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_entitlement_email_product ON entitlements(email, product_id);

-- Contact form submissions.
CREATE TABLE IF NOT EXISTS contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT,
  message     TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Idempotency for webhooks (avoid double-processing provider events).
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY, -- provider event id
  provider     TEXT NOT NULL,
  type         TEXT,
  payload_json TEXT,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
