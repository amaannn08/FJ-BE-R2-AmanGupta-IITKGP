const { pool } = require('../db');

async function wasAlertSent({ user_id, category_id, month }) {
  const text = `
    SELECT 1 FROM budget_alert_sent
    WHERE user_id = $1 AND category_id = $2 AND month = $3
    LIMIT 1
  `;
  const values = [user_id, category_id, month];
  const { rows } = await pool.query(text, values);
  return rows.length > 0;
}

async function recordAlertSent({ user_id, category_id, month }) {
  const text = `
    INSERT INTO budget_alert_sent (user_id, category_id, month, sent_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, category_id, month) DO UPDATE SET sent_at = NOW()
  `;
  const values = [user_id, category_id, month];
  await pool.query(text, values);
}

module.exports = {
  wasAlertSent,
  recordAlertSent,
};
