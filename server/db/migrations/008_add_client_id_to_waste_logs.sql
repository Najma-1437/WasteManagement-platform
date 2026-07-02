-- Adds a nullable client_id column used as an idempotency key for offline
-- sync. The UNIQUE constraint prevents duplicate rows if the same queued
-- log is POSTed more than once (e.g. sync runs before the previous
-- acknowledgement was received).
ALTER TABLE waste_logs ADD COLUMN IF NOT EXISTS client_id VARCHAR(64) UNIQUE;
