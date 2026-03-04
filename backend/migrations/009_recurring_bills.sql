-- +up
CREATE TABLE IF NOT EXISTS recurring_bills (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  amount_in_base NUMERIC(14,2) NOT NULL,
  currency_code VARCHAR(8) NOT NULL DEFAULT 'INR',
  billing_cycle VARCHAR(16) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  next_due_date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- +down
DROP TABLE IF EXISTS recurring_bills;

