const express = require('express');

const { query } = require('../db');
const {
  validatePassword,
  validateEmail,
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
} = require('../auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, message: passwordCheck.message });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const passwordHash = await hashPassword(password);

    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, updated_at`,
      [name, normalizedEmail, passwordHash],
    );

    const user = insertResult.rows[0];
    const token = generateToken({ userId: user.id, email: user.email });

    return res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    console.error('Error in /signup:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await query(
      'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    delete user.password_hash;

    return res.json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    console.error('Error in /signin:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.get('/getProfile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;

    const result = await query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in /getProfile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.put('/updateProfile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    const { name, email } = req.body || {};

    if (!name && !email) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    let normalizedEmail;
    if (email) {
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

    if (name) {
      fields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex += 1;
    }

    if (normalizedEmail) {
      fields.push(`email = $${paramIndex}`);
      values.push(normalizedEmail);
      paramIndex += 1;
    }

    values.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, name, email, created_at, updated_at
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

