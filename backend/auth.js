require('dotenv').config();

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

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ success: false, message: 'Authorization header missing.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid authorization header format.' });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('JWT verification failed', err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = {
  validatePassword,
  validateEmail,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticateToken,
};

