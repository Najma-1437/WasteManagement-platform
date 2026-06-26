-- Fixes waste_logs.status to match the agreed lifecycle:
-- pending → matched → confirmed → paid → disputed
-- Previous schema used: unmatched, matched, collected (never matched the documented design)

-- 1. Drop old constraint (table temporarily unconstrained)
ALTER TABLE waste_logs
  DROP CONSTRAINT waste_logs_status_check;

-- 2. Backfill existing rows
UPDATE waste_logs
SET status = 'pending'
WHERE status = 'unmatched';

-- 3. Add new constraint with correct vocabulary
ALTER TABLE waste_logs
  ADD CONSTRAINT waste_logs_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::character varying,
    'matched'::character varying,
    'confirmed'::character varying,
    'paid'::character varying,
    'disputed'::character varying
  ]::text[]));

-- 4. Update default for future inserts
ALTER TABLE waste_logs
  ALTER COLUMN status SET DEFAULT 'pending';