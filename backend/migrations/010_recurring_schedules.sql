-- +up
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  billing_cycle VARCHAR(16) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +down
DROP TABLE IF EXISTS recurring_schedules;

