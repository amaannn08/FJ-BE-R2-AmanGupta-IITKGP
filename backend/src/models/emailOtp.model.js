const { pool } = require('../db');

async function createOtp({ id, user_id, email, otp, expires_at }) {
  const text = `
    INSERT INTO email_otps (id, user_id, email, otp, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, email, otp, expires_at, used, created_at
  `;
  const values = [id, user_id, email, otp, expires_at];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function findValidOtp({ user_id, email, otp, now }) {
  const text = `
    SELECT *
    FROM email_otps
    WHERE user_id = $1
      AND email = $2
      AND otp = $3
      AND used = false
      AND expires_at >= $4
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const values = [user_id, email, otp, now];
  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function markOtpUsed({ id }) {
  const text = `
    UPDATE email_otps
    SET used = true
    WHERE id = $1
  `;
  const values = [id];
  await pool.query(text, values);
}

module.exports = {
  createOtp,
  findValidOtp,
  markOtpUsed,
};

