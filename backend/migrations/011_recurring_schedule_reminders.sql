-- +up
CREATE TABLE IF NOT EXISTS recurring_schedule_reminders (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, schedule_id, due_date)
);

-- +down
DROP TABLE IF EXISTS recurring_schedule_reminders;

