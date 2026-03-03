const nodemailer = require('nodemailer');
const crypto = require('crypto');

const fromEmail = process.env.EMAIL_ID;
let transporter = null;

if (process.env.EMAIL_ID && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASS,
    },
  });
  // eslint-disable-next-line no-console
  console.log('Email service configured with Gmail SMTP');
} else {
  // eslint-disable-next-line no-console
  console.log(
    'Email service not fully configured. Set EMAIL_ID and EMAIL_PASS in .env to enable real emails.',
  );
}

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOtpEmail({ to, otp }) {
  if (!transporter) {
    // Dev fallback: log email instead of throwing
    // eslint-disable-next-line no-console
    console.log('\n[DEV] OTP email (not actually sent):');
    // eslint-disable-next-line no-console
    console.log('To:', to);
    // eslint-disable-next-line no-console
    console.log('OTP:', otp);
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>FinanceTracker Email Verification</h2>
      <p>Your one-time password (OTP) is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  const mailOptions = {
    from: fromEmail,
    to,
    subject: 'FinanceTracker - Email Verification OTP',
    html,
  };

  await transporter.sendMail(mailOptions);
  return true;
}

module.exports = {
  generateOtp,
  sendOtpEmail,
};

