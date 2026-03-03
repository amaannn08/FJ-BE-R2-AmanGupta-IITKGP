require('dotenv').config();

const { query } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. JWT operations will fail until it is configured.');
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string.' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-\\[\];'`~+/=]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain uppercase, lowercase, number, and special character.',
    };
  }

  return { valid: true };
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(trimmed);
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function generateToken(payload, options = {}) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  const signOptions = { expiresIn: JWT_EXPIRES_IN, ...options };
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return jwt.verify(token, JWT_SECRET);
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Name, email, and password are required.' });
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

    return res.status(201).json({
      success: true,
      data: {
        user,
      },
      message: 'Signup successful. Please verify your email using the OTP sent to your email address.',
    });
  } catch (err) {
    return next(err);
  }
}

async function signin(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await query(
      `SELECT id, name, email, password_hash, created_at, updated_at, email_verified
       FROM users
       WHERE email = $1`,
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

    if (user.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before signing in.',
      });
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
    return next(err);
  }
}

module.exports = {
  signup,
  signin,
  validatePassword,
  validateEmail,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};

