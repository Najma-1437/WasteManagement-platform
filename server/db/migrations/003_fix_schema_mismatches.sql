-- Allow min_quantity_kg to be 0 (buyer may accept any quantity)
ALTER TABLE buyer_offers
  DROP CONSTRAINT IF EXISTS buyer_offers_min_quantity_kg_check;

ALTER TABLE buyer_offers
  ADD CONSTRAINT buyer_offers_min_quantity_kg_check
  CHECK (min_quantity_kg >= 0);

-- Track which buyer/offer claimed each waste log
ALTER TABLE waste_logs
  ADD COLUMN IF NOT EXISTS matched_buyer_id INTEGER
    REFERENCES buyers(buyer_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_offer_id INTEGER
    REFERENCES buyer_offers(offer_id) ON DELETE SET NULL;
