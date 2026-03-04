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

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.log('\n[DEV] Email (not actually sent):', { to, subject });
    return false;
  }
  const mailOptions = {
    from: fromEmail,
    to,
    subject,
    html,
  };
  await transporter.sendMail(mailOptions);
  return true;
}

function formatCurrency(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

async function sendBudgetOverrunEmail({
  to,
  userName,
  categoryName,
  month,
  budgetAmount,
  actualExpense,
}) {
  const monthLabel =
    typeof month === 'string' && month.length >= 7
      ? new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : String(month);
  const budgetStr = formatCurrency(budgetAmount);
  const spentStr = formatCurrency(actualExpense);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>FinanceTracker – Budget Exceeded</h2>
      <p>Hi ${userName ? String(userName).replace(/</g, '&lt;') : 'there'},</p>
      <p>You've exceeded your budget for <strong>${String(categoryName).replace(/</g, '&lt;')}</strong> in ${monthLabel}.</p>
      <p><strong>Budget:</strong> ${budgetStr}<br><strong>Spent:</strong> ${spentStr}</p>
      <p>Consider reviewing your spending in this category.</p>
      <p>If you did not expect this alert, you can turn off budget emails in your profile settings.</p>
    </div>
  `;

  return sendMail({
    to,
    subject: `FinanceTracker – Budget exceeded for ${categoryName}`,
    html,
  });
}

module.exports = {
  generateOtp,
  sendOtpEmail,
  sendMail,
  sendBudgetOverrunEmail,
};

