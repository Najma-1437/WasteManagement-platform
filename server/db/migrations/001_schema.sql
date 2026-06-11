-- ============================================================
-- WasteManagement Platform — PostgreSQL Schema
-- File: server/db/migrations/001_schema.sql
-- Run once against: wastemanagement_db
-- ============================================================

-- Enable PostGIS (required for GPS/heatmap queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────────────────────
-- TABLE 1: users
-- Central identity table. All roles share this base record.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  phone_number  VARCHAR(20)   NOT NULL UNIQUE,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL
                CHECK (role IN ('collector','buyer','coordinator','admin')),
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','active','suspended')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 2: collectors
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectors (
  collector_id  SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL UNIQUE
                REFERENCES users(user_id) ON DELETE CASCADE,
  residence     VARCHAR(100) NOT NULL,
  house_number  VARCHAR(50)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 3: buyers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyers (
  buyer_id          SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL UNIQUE
                    REFERENCES users(user_id) ON DELETE CASCADE,
  organisation_name VARCHAR(150) NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 4: environmental_coordinators
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS environmental_coordinators (
  coordinator_id SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE
                 REFERENCES users(user_id) ON DELETE CASCADE,
  organisation   VARCHAR(150) NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 5: admins
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  admin_id        SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL UNIQUE
                  REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_region VARCHAR(100)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 6: refresh_tokens
-- Stores JWT refresh tokens for session management
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id   SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL
             REFERENCES users(user_id) ON DELETE CASCADE,
  token      VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 7: waste_logs
-- Core collection record. Uses PostGIS GEOGRAPHY for GPS.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_logs (
  log_id       SERIAL PRIMARY KEY,
  collector_id INTEGER NOT NULL
               REFERENCES collectors(collector_id) ON DELETE RESTRICT,
  category     VARCHAR(20) NOT NULL
               CHECK (category IN ('organic','plastic','metal','e-waste')),
  weight_kg    NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
  location     GEOGRAPHY(Point, 4326),    -- PostGIS spatial type
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  status       VARCHAR(20) NOT NULL DEFAULT 'unmatched'
               CHECK (status IN ('unmatched','matched','collected')),
  source       VARCHAR(10) NOT NULL DEFAULT 'web'
               CHECK (source IN ('web','ussd')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_waste_logs_location
  ON waste_logs USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_waste_logs_collector
  ON waste_logs(collector_id);

CREATE INDEX IF NOT EXISTS idx_waste_logs_status
  ON waste_logs(status);

CREATE INDEX IF NOT EXISTS idx_waste_logs_created
  ON waste_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waste_logs_category
  ON waste_logs(category);

-- ─────────────────────────────────────────────────────────────
-- TABLE 8: buyer_offers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_offers (
  offer_id        SERIAL PRIMARY KEY,
  buyer_id        INTEGER NOT NULL
                  REFERENCES buyers(buyer_id) ON DELETE RESTRICT,
  category        VARCHAR(20) NOT NULL
                  CHECK (category IN ('organic','plastic','metal','e-waste')),
  price_per_kg    NUMERIC(10,2) NOT NULL CHECK (price_per_kg > 0),
  min_quantity_kg NUMERIC(8,2)  NOT NULL CHECK (min_quantity_kg > 0),
  zone            VARCHAR(100)  NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_offers_category
  ON buyer_offers(category);

CREATE INDEX IF NOT EXISTS idx_buyer_offers_status
  ON buyer_offers(status);

-- ─────────────────────────────────────────────────────────────
-- TABLE 9: transactions
-- One transaction per waste log (UNIQUE on log_id enforces this)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   SERIAL PRIMARY KEY,
  log_id           INTEGER NOT NULL UNIQUE
                   REFERENCES waste_logs(log_id) ON DELETE RESTRICT,
  buyer_id         INTEGER NOT NULL
                   REFERENCES buyers(buyer_id) ON DELETE RESTRICT,
  confirmed_qty_kg NUMERIC(8,2)  NOT NULL CHECK (confirmed_qty_kg > 0),
  amount_kes       NUMERIC(12,2) NOT NULL CHECK (amount_kes > 0),
  mpesa_code       VARCHAR(20) UNIQUE,
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','completed','failed')),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer
  ON transactions(buyer_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions(payment_status);

-- ─────────────────────────────────────────────────────────────
-- TABLE 10: gamification_records
-- One record per collector, created at registration
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gamification_records (
  record_id    SERIAL PRIMARY KEY,
  collector_id INTEGER NOT NULL UNIQUE
               REFERENCES collectors(collector_id) ON DELETE CASCADE,
  total_points INTEGER     NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 11: notifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL
                  REFERENCES users(user_id) ON DELETE CASCADE,
  channel         VARCHAR(10) NOT NULL
                  CHECK (channel IN ('sms','ussd','in-app')),
  message         TEXT        NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 12: audit_logs
-- Immutable. No DELETE endpoint ever touches this table.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id      SERIAL PRIMARY KEY,
  admin_id      INTEGER NOT NULL
                REFERENCES admins(admin_id) ON DELETE RESTRICT,
  action        VARCHAR(100) NOT NULL,
  target_entity VARCHAR(50)  NOT NULL,
  target_id     INTEGER      NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-update users.updated_at on any UPDATE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION fn_update_updated_at();