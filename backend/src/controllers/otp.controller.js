const { v4: uuidv4 } = require('uuid');

const { generateOtp, sendOtpEmail } = require('../services/email.service');
const emailOtpModel = require('../models/emailOtp.model');
const userModel = require('../models/user.model');

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(trimmed);
}

function isValidOtp(otp) {
  return typeof otp === 'string' && /^[0-9]{6}$/.test(otp);
}

async function sendOtp(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userModel.findUserByEmail(normalizedEmail);

    if (!user) {
      // Do not reveal whether the email exists
      return res.json({
        success: true,
        message: 'If this email is registered, an OTP has been sent.',
      });
    }

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

    await sendOtpEmail({ to: normalizedEmail, otp });

    return res.json({
      success: true,
      message: 'An OTP has been sent to your registered email address!',
    });
  } catch (err) {
    return next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body || {};

    if (!isValidEmail(email) || !isValidOtp(otp)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid email or OTP format.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userModel.findUserByEmail(normalizedEmail);

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid email or OTP.' });
    }

    const now = new Date();
    const otpRow = await emailOtpModel.findValidOtp({
      user_id: user.id,
      email: normalizedEmail,
      otp,
      now,
    });

    if (!otpRow) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid email or OTP.' });
    }

    await emailOtpModel.markOtpUsed({ id: otpRow.id });

    await userModel.markEmailVerified(user.id);

    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
};

