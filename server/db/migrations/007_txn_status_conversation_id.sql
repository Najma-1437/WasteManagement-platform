ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS txn_status_conversation_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_transactions_txn_status_convo
  ON transactions(txn_status_conversation_id);
