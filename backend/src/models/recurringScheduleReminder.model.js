const { pool } = require('../db');

async function wasReminderSent({ user_id, schedule_id, due_date }) {
  const text = `
    SELECT 1
    FROM recurring_schedule_reminders
    WHERE user_id = $1
      AND schedule_id = $2
      AND due_date = $3
    LIMIT 1
  `;
  const values = [user_id, schedule_id, due_date];
  const { rows } = await pool.query(text, values);
  return rows.length > 0;
}

async function recordReminderSent({ user_id, schedule_id, due_date }) {
  const text = `
    INSERT INTO recurring_schedule_reminders (user_id, schedule_id, due_date, sent_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, schedule_id, due_date)
    DO UPDATE SET sent_at = NOW()
  `;
  const values = [user_id, schedule_id, due_date];
  await pool.query(text, values);
}

module.exports = {
  wasReminderSent,
  recordReminderSent,
};

