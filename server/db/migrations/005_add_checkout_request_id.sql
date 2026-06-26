-- Stores the Safaricom CheckoutRequestID from STK Push so the callback
-- can match the response back to the right transaction.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_transactions_checkout_id
  ON transactions(checkout_request_id);
