-- +up
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS receipt_filename VARCHAR(255);

-- +down
ALTER TABLE transactions
  DROP COLUMN IF EXISTS receipt_filename;

