-- +up
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_budget_alerts BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS budget_alert_sent (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category_id, month)
);

-- +down
DROP TABLE IF EXISTS budget_alert_sent;

ALTER TABLE users
  DROP COLUMN IF EXISTS email_budget_alerts;
