const express = require('express');

const { query } = require('../db');
const {
  signup,
  signin,
  validateEmail,
  verifyEmailLink,
} = require('../controllers/auth.controller');
const { sendOtp, verifyOtp } = require('../controllers/otp.controller');
const {
  googleAuthRedirect,
  googleAuthCallback,
} = require('../controllers/googleAuth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/signup', signup);

router.post('/signin', signin);

router.post('/auth/send-otp', sendOtp);

router.post('/auth/verify-otp', verifyOtp);

router.get('/auth/verify-email-link', verifyEmailLink);

router.get('/auth/google', googleAuthRedirect);

router.get('/auth/google/callback', googleAuthCallback);

router.get('/getProfile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;

    const result = await query(
      'SELECT id, name, email, avatar_url, google_id, email_budget_alerts, created_at, updated_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const row = result.rows[0];
    const data = {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar_url: row.avatar_url ?? null,
      email_budget_alerts: row.email_budget_alerts !== false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      auth_provider: row.google_id ? 'google' : 'local',
    };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error in /getProfile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.put('/updateProfile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    const { name, email, email_budget_alerts } = req.body || {};

    if (name === undefined && email === undefined && email_budget_alerts === undefined) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    let normalizedEmail;
    if (email !== undefined) {
      normalizedEmail = email.trim().toLowerCase();
      if (!validateEmail(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
      }

      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2',
        [normalizedEmail, userId],
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email is already in use by another account.' });
      }
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex += 1;
    }

    if (normalizedEmail !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(normalizedEmail);
      paramIndex += 1;
    }

    if (typeof email_budget_alerts === 'boolean') {
      fields.push(`email_budget_alerts = $${paramIndex}`);
      values.push(email_budget_alerts);
      paramIndex += 1;
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    values.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, name, email, email_budget_alerts, created_at, updated_at
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in /updateProfile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.delete('/deleteProfile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, message: 'Profile deleted successfully.' });
  } catch (err) {
    console.error('Error in /deleteProfile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;

