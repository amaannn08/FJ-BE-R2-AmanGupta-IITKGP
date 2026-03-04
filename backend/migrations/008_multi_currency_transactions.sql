-- +up
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(8) NOT NULL DEFAULT 'INR';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS amount_in_base NUMERIC(14,2);

UPDATE transactions
SET amount_in_base = amount
WHERE amount_in_base IS NULL;

ALTER TABLE transactions
  ALTER COLUMN amount_in_base SET NOT NULL;

-- +down
ALTER TABLE transactions
  DROP COLUMN IF EXISTS amount_in_base;

ALTER TABLE transactions
  DROP COLUMN IF EXISTS currency_code;

