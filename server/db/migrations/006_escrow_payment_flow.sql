-- Escrow payment flow: expand transactions.payment_status vocabulary
-- and add three payout-tracking columns.
-- Pattern: DROP old constraint → ADD new constraint (no backfill — no rows use new values yet).

-- 1. Drop old constraint
ALTER TABLE transactions
  DROP CONSTRAINT transactions_payment_status_check;

-- 2. Add new constraint.
--    'completed' is retained in the allowed list but will NOT be written by any code
--    going forward. It stays here because it is unconfirmed whether any frontend
--    code checks for that literal string (see open item in 2026-06-27 design spec).
--    Drop it in a later cleanup migration once confirmed unused.
ALTER TABLE transactions
  ADD CONSTRAINT transactions_payment_status_check
  CHECK (payment_status = ANY (ARRAY[
    'pending'::text,
    'escrowed'::text,
    'payout_failed'::text,
    'released'::text,
    'failed'::text,
    'completed'::text
  ]));

-- 3. Payout-tracking columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payout_error        TEXT,
  ADD COLUMN IF NOT EXISTS b2c_conversation_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS released_at         TIMESTAMPTZ;

-- Index lets the B2C result/timeout callback look up a transaction in O(log n)
CREATE INDEX IF NOT EXISTS idx_transactions_b2c_convo
  ON transactions(b2c_conversation_id);
