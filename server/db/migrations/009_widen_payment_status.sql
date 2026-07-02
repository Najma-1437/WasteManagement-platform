-- Migration 009: widen transactions.payment_status CHECK constraint
--
-- The live DB constraint already permits the M-Pesa escrow/payout lifecycle
-- values written by buyer.controller.js ('escrowed', 'payout_initiated',
-- 'payout_failed', 'released') plus 'failed' (STK push failure) — it was
-- widened by hand at some point and never captured in a migration file
-- (same class of gap as 006_add_notifications_read_status.sql). This
-- migration makes that live state reproducible.
--
-- 'completed' is kept because it is already part of the live constraint,
-- even though no code path currently writes it — dropping it here would
-- move the schema further from what's actually running rather than
-- capturing it.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_status_check
  CHECK (payment_status IN ('pending','escrowed','payout_initiated','payout_failed','released','completed','failed'));
