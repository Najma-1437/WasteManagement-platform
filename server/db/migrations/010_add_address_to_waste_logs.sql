-- Human-readable address for the log's coordinates, resolved once via
-- reverse geocoding at creation/edit time so the UI never has to geocode
-- on render. NULL when geocoding failed or hasn't completed yet.
ALTER TABLE waste_logs
  ADD COLUMN IF NOT EXISTS address TEXT;
