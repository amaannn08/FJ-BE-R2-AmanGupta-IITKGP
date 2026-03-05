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

async function sendOtpEmail({ to, otp, verificationLink }) {
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
      ${
        verificationLink
          ? `<p>If you prefer, you can also verify your email by clicking the button below:</p>
      <p style="margin: 24px 0;">
        <a href="${verificationLink}" style="display: inline-block; padding: 10px 18px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Verify my email
        </a>
      </p>`
          : ''
      }
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
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

async function sendAnomalyAlertEmail({
  to,
  userName,
  transaction,
  anomalyType,
  details,
}) {
  const transactionDate = new Date(transaction.transaction_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const amountStr = formatCurrency(transaction.amount);

  let alertMessage = '';
  if (anomalyType === 'high_value') {
    alertMessage = `We detected a transaction of <strong>${amountStr}</strong>, which is significantly higher than your recent spending habits (Average: ${formatCurrency(
      details.mean
    )}).`;
  } else if (anomalyType === 'high_frequency') {
    alertMessage = `We noticed a sudden burst of activity. <strong>${details.count} transactions</strong> were created in the last 5 minutes.`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Suspicious Activity Alert</h2>
      </div>
      <div style="padding: 24px;">
        <p>Hi ${userName ? String(userName).replace(/</g, '&lt;') : 'there'},</p>
        <p style="font-size: 16px; color: #374151;">${alertMessage}</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #111827;">Transaction Details</h3>
          <p style="margin: 8px 0;"><strong>Amount:</strong> ${amountStr}</p>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${transactionDate}</p>
          <p style="margin: 8px 0;"><strong>Description:</strong> ${
            transaction.description || 'N/A'
          }</p>
        </div>

        <p>If you made this transaction, you can safely ignore this email.</p>
        <p>If you did not authorize this, please review your account immediately.</p>
      </div>
    </div>
  `;

  return sendMail({
    to,
    subject: `FinanceTracker – Unusual Activity Detected: ${
      anomalyType === 'high_value' ? 'High Value Transaction' : 'High Frequency Activity'
    }`,
    html,
  });
}

module.exports = {
  generateOtp,
  sendOtpEmail,
  sendMail,
  sendBudgetOverrunEmail,
  sendAnomalyAlertEmail,
};
