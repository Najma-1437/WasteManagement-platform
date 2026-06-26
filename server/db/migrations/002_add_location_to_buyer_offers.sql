ALTER TABLE buyer_offers
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_buyer_offers_location
  ON buyer_offers USING GIST(location);
