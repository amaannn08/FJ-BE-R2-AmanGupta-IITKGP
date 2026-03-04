const emailService = require('./email.service');
const userModel = require('../models/user.model');
const recurringScheduleModel = require('../models/recurringSchedule.model');
const recurringScheduleReminderModel = require('../models/recurringScheduleReminder.model');

function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function localIsoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeTomorrowLocalIso() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return localIsoDate(tomorrow);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amount, currencyCode) {
  const n = Number(amount);
  const code = typeof currencyCode === 'string' && currencyCode.trim() ? currencyCode.trim().toUpperCase() : 'INR';
  if (!Number.isFinite(n)) return String(amount);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch (e) {
    return `${n.toFixed(2)} ${code}`;
  }
}

async function runRecurringScheduleRemindersForUser({ user_id, asOfDate }) {
  const targetDate =
    typeof asOfDate === 'string' && asOfDate.trim() && isValidDateString(asOfDate)
      ? asOfDate.trim()
      : computeTomorrowLocalIso();

  const user = await userModel.findUserById(user_id);
  if (!user || !user.email) {
    return {
      targetDate,
      processedSchedules: 0,
      sentReminders: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
      errors: 0,
    };
  }

  const schedules = await recurringScheduleModel.findActiveSchedulesDueOnDateForUser({
    user_id,
    dueDate: targetDate,
  });

  let sentReminders = 0;
  let skippedAlreadySent = 0;
  let skippedNoEmail = 0;
  let errors = 0;

  for (const schedule of schedules) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const alreadySent = await recurringScheduleReminderModel.wasReminderSent({
        user_id,
        schedule_id: schedule.id,
        due_date: targetDate,
      });

      if (alreadySent) {
        skippedAlreadySent += 1;
        // eslint-disable-next-line no-continue
        continue;
      }

      if (!user.email) {
        skippedNoEmail += 1;
        // eslint-disable-next-line no-continue
        continue;
      }

      const label = schedule.category_name || schedule.description || 'Recurring payment';
      const amountStr = formatMoney(schedule.amount, schedule.currency_code);
      const dueDateStr = schedule.next_due_date || targetDate;

      const defaultTomorrow = computeTomorrowLocalIso();
      const duePhrase = targetDate === defaultTomorrow ? 'tomorrow' : `on ${targetDate}`;

      const subject = `FinanceTracker – Payment reminder: ${label} due ${duePhrase}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>FinanceTracker – Payment reminder</h2>
          <p>Hi ${user.name ? escapeHtml(user.name) : 'there'},</p>
          <p>This is a reminder that your recurring payment is due ${escapeHtml(duePhrase)}.</p>
          <p>
            <strong>Bill:</strong> ${escapeHtml(label)}<br />
            <strong>Amount:</strong> ${escapeHtml(amountStr)}<br />
            <strong>Due date:</strong> ${escapeHtml(dueDateStr)}<br />
            <strong>Cycle:</strong> ${escapeHtml(schedule.billing_cycle || '')}
          </p>
          <p>You can ignore this email if you’ve already planned for this payment.</p>
        </div>
      `;

      // eslint-disable-next-line no-await-in-loop
      await emailService.sendMail({
        to: user.email,
        subject,
        html,
      });

      // eslint-disable-next-line no-await-in-loop
      await recurringScheduleReminderModel.recordReminderSent({
        user_id,
        schedule_id: schedule.id,
        due_date: targetDate,
      });

      sentReminders += 1;
    } catch (err) {
      errors += 1;
      // eslint-disable-next-line no-console
      console.error('Recurring reminder error:', err);
    }
  }

  return {
    targetDate,
    processedSchedules: schedules.length,
    sentReminders,
    skippedAlreadySent,
    skippedNoEmail,
    errors,
  };
}

module.exports = {
  runRecurringScheduleRemindersForUser,
};

