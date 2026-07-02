-- Migration 007: redemptions table for gamification point redemption
CREATE TABLE IF NOT EXISTS redemptions (
  redemption_id     SERIAL PRIMARY KEY,
  collector_id      INTEGER NOT NULL REFERENCES collectors(collector_id) ON DELETE CASCADE,
  points_spent      INTEGER NOT NULL,
  airtime_value_kes NUMERIC(10,2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_collector
  ON redemptions(collector_id, requested_at DESC);
