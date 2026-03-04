const userModel = require('../models/user.model');
const budgetModel = require('../models/budget.model');
const budgetAlertModel = require('../models/budgetAlert.model');
const emailService = require('./email.service');

/**
 * Normalize a date string to the first day of that month (YYYY-MM-01).
 * @param {string} transactionDate - Date string (YYYY-MM-DD or similar).
 * @returns {string|null} - YYYY-MM-01 or null if invalid.
 */
function monthKey(transactionDate) {
  if (!transactionDate) return null;
  const d = new Date(transactionDate);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Check if the user has exceeded their budget for the given category and month;
 * if so, send one email (throttled to once per user/category/month).
 * Designed to be called fire-and-forget after an expense transaction.
 *
 * @param {Object} params
 * @param {string} params.user_id - User UUID.
 * @param {string} params.category_id - Category UUID.
 * @param {string} params.transaction_date - Date of the transaction (YYYY-MM-DD).
 */
async function checkAndSendBudgetOverrunAlert({ user_id, category_id, transaction_date }) {
  try {
    const user = await userModel.findUserById(user_id);
    if (!user || !user.email) return;
    if (user.email_budget_alerts === false) return;

    const month = monthKey(transaction_date);
    if (!month) return;

    const alreadySent = await budgetAlertModel.wasAlertSent({
      user_id,
      category_id,
      month,
    });
    if (alreadySent) return;

    const rows = await budgetModel.getBudgetProgressForMonth({ user_id, month });
    const row = rows.find((r) => r.category_id === category_id);
    if (!row) return;

    const budgetAmount = Number(row.budget_amount);
    const actualExpense = Number(row.actual_expense);
    if (!Number.isFinite(budgetAmount) || !Number.isFinite(actualExpense)) return;
    if (actualExpense <= budgetAmount) return;

    await emailService.sendBudgetOverrunEmail({
      to: user.email,
      userName: user.name,
      categoryName: row.category_name,
      month,
      budgetAmount,
      actualExpense,
    });

    await budgetAlertModel.recordAlertSent({ user_id, category_id, month });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Budget overrun alert error:', err);
  }
}

module.exports = {
  checkAndSendBudgetOverrunAlert,
};
