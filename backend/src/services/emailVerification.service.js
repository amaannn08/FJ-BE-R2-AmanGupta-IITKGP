const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const { generateOtp, sendOtpEmail } = require('./email.service');
const emailOtpModel = require('../models/emailOtp.model');

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_VERIFICATION_TOKEN_TTL =
  process.env.EMAIL_VERIFICATION_TOKEN_TTL || '1h';

function generateEmailVerificationToken({ userId, email }) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  const payload = {
    userId,
    email,
    purpose: 'email_verification',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: EMAIL_VERIFICATION_TOKEN_TTL,
  });
}

async function sendVerificationEmailForUser({ user, origin }) {
  if (!user || !user.id || !user.email) {
    throw new Error('User id and email are required to send verification email.');
  }

  const normalizedEmail = String(user.email).trim().toLowerCase();

  const otp = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  await emailOtpModel.createOtp({
    id: uuidv4(),
    user_id: user.id,
    email: normalizedEmail,
    otp,
    expires_at: expiresAt,
  });

  const token = generateEmailVerificationToken({
    userId: user.id,
    email: normalizedEmail,
  });

  const safeOrigin = String(origin || '').replace(/\/+$/, '');
  const verificationLink = `${safeOrigin}/auth/verify-email-link?token=${encodeURIComponent(
    token,
  )}`;

  await sendOtpEmail({ to: normalizedEmail, otp, verificationLink });
}

module.exports = {
  generateEmailVerificationToken,
  sendVerificationEmailForUser,
};

