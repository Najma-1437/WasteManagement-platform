-- Dispute metadata on waste_logs. The 'disputed' status has existed since
-- migration 004 but had no write path; these columns record what the dispute
-- is about and who raised it when a collector or buyer flags a matched log.
-- No new table (per design decision) — one open dispute per log, mirroring
-- the one-transaction-per-log constraint.
ALTER TABLE waste_logs
  ADD COLUMN IF NOT EXISTS dispute_reason  VARCHAR(20)
    CHECK (dispute_reason IN ('wrong_weight','wrong_category','no_show','payment_issue','other')),
  ADD COLUMN IF NOT EXISTS dispute_details TEXT,
  -- user_id (not a role label) of whoever raised it — collector or buyer
  ADD COLUMN IF NOT EXISTS disputed_by     INTEGER
    REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disputed_at     TIMESTAMPTZ;
