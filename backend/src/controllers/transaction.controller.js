const { v4: uuidv4 } = require('uuid');

const fs = require('fs');
const path = require('path');

const transactionModel = require('../models/transaction.model');
const recurringScheduleModel = require('../models/recurringSchedule.model');
const categoryModel = require('../models/category.model');
const notificationService = require('../services/notification.service');
const anomalyService = require('../services/anomaly.service');
const { RECEIPTS_UPLOAD_DIR } = require('../config/uploads');

function parseAmount(amount) {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
}

function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}

function isValidDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function computeNextDueDate(startDateString, billingCycle) {
  if (!isValidDateString(startDateString)) {
    return null;
  }
  const base = new Date(startDateString);
  const next = new Date(base);
  if (billingCycle === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString().slice(0, 10);
}

async function createTransaction(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const {
      categoryId,
      type,
      amount,
      description,
      transactionDate,
      currencyCode,
      isRecurring,
      billingCycle,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!categoryId || !type || amount == null || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'categoryId, type, amount, and transactionDate are required.',
      });
    }

    if (type !== 'income' && type !== 'expense') {
      return res
        .status(400)
        .json({ success: false, message: "Transaction type must be 'income' or 'expense'." });
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null || parsedAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a non-zero number.',
      });
    }

    if (!isValidDateString(transactionDate)) {
      return res
        .status(400)
        .json({ success: false, message: 'transactionDate must be a valid date string.' });
    }

    const normalizedIsRecurring = Boolean(isRecurring);
    let normalizedBillingCycle = null;
    if (normalizedIsRecurring) {
      if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
        return res.status(400).json({
          success: false,
          message: "billingCycle must be 'monthly' or 'yearly' when isRecurring is true.",
        });
      }
      normalizedBillingCycle = billingCycle;
    }

    // Negative amount rules
    if (type === 'income' && parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Income amount must be positive.',
      });
    }

    if (type === 'expense' && parsedAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount cannot be zero.',
      });
    }

    const category = await categoryModel.findCategoryByIdForUser({
      category_id: categoryId,
      user_id: userId,
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category for this user.',
      });
    }

    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: 'Transaction type must match category type.',
      });
    }

    const id = uuidv4();
    const amountRounded = roundToTwoDecimals(parsedAmount);

    const normalizedCurrency =
      typeof currencyCode === 'string' && currencyCode.trim()
        ? currencyCode.trim().toUpperCase()
        : 'INR';

    const { convertToInr, assertSupportedCurrency } = require('../config/fxRates');

    let amountInBase;
    let finalCurrencyCode;
    try {
      const normalized = assertSupportedCurrency(normalizedCurrency);
      const conv = convertToInr(amountRounded, normalized);
      amountInBase = conv.amountInInr;
      finalCurrencyCode = conv.currencyCode;
    } catch (err) {
      if (err && err.name === 'ValidationError') {
        return res.status(err.status || 400).json({
          success: false,
          message: err.message,
          details: err.details,
        });
      }
      throw err;
    }

    const transaction = await transactionModel.createTransaction({
      id,
      user_id: userId,
      category_id: categoryId,
      type,
      amount: amountRounded,
      amount_in_base: amountInBase,
      currency_code: finalCurrencyCode,
      description,
      transaction_date: transactionDate,
    });

    if (type === 'expense') {
      void notificationService
        .checkAndSendBudgetOverrunAlert({
          user_id: userId,
          category_id: categoryId,
          transaction_date: transactionDate,
        })
        .catch(() => {});
    }

    // Anomaly Detection
    void anomalyService
      .checkAndSendAnomalyAlert({
        user_id: userId,
        transaction,
      })
      .catch(() => {});

    if (normalizedIsRecurring && normalizedBillingCycle) {
      const nextDueDate = computeNextDueDate(transactionDate, normalizedBillingCycle);
      if (nextDueDate) {
        const scheduleId = uuidv4();
        await recurringScheduleModel.createRecurringSchedule({
          id: scheduleId,
          user_id: userId,
          template_transaction_id: transaction.id,
          billing_cycle: normalizedBillingCycle,
          next_due_date: nextDueDate,
          is_active: true,
        });
      }
    }

    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    return next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const transactionId = req.params && req.params.id;
    const {
      categoryId,
      type,
      amount,
      description,
      transactionDate,
      currencyCode,
      isRecurring,
      billingCycle,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction id is required.' });
    }

    if (!categoryId || !type || amount == null || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'categoryId, type, amount, and transactionDate are required.',
      });
    }

    if (type !== 'income' && type !== 'expense') {
      return res
        .status(400)
        .json({ success: false, message: "Transaction type must be 'income' or 'expense'." });
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null || parsedAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a non-zero number.',
      });
    }

    if (!isValidDateString(transactionDate)) {
      return res
        .status(400)
        .json({ success: false, message: 'transactionDate must be a valid date string.' });
    }

    if (type === 'income' && parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Income amount must be positive.',
      });
    }

    if (type === 'expense' && parsedAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount cannot be zero.',
      });
    }

    const category = await categoryModel.findCategoryByIdForUser({
      category_id: categoryId,
      user_id: userId,
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category for this user.',
      });
    }

    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: 'Transaction type must match category type.',
      });
    }

    const amountRounded = roundToTwoDecimals(parsedAmount);

    const normalizedIsRecurring =
      typeof isRecurring === 'boolean' ? isRecurring : null;
    let normalizedBillingCycle = null;
    if (normalizedIsRecurring) {
      if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
        return res.status(400).json({
          success: false,
          message: "billingCycle must be 'monthly' or 'yearly' when isRecurring is true.",
        });
      }
      normalizedBillingCycle = billingCycle;
    }

    const normalizedCurrency =
      typeof currencyCode === 'string' && currencyCode.trim()
        ? currencyCode.trim().toUpperCase()
        : 'INR';

    const { convertToInr, assertSupportedCurrency } = require('../config/fxRates');

    let amountInBase;
    let finalCurrencyCode;
    try {
      const normalized = assertSupportedCurrency(normalizedCurrency);
      const conv = convertToInr(amountRounded, normalized);
      amountInBase = conv.amountInInr;
      finalCurrencyCode = conv.currencyCode;
    } catch (err) {
      if (err && err.name === 'ValidationError') {
        return res.status(err.status || 400).json({
          success: false,
          message: err.message,
          details: err.details,
        });
      }
      throw err;
    }

    const updated = await transactionModel.updateTransaction({
      id: transactionId,
      user_id: userId,
      category_id: categoryId,
      type,
      amount: amountRounded,
      amount_in_base: amountInBase,
      currency_code: finalCurrencyCode,
      description,
      transaction_date: transactionDate,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const existingSchedule = await recurringScheduleModel.findScheduleByTemplateForUser({
      user_id: userId,
      template_transaction_id: transactionId,
    });

    if (normalizedIsRecurring === true && !existingSchedule) {
      const effectiveBillingCycle = normalizedBillingCycle || 'monthly';
      const nextDueDate = computeNextDueDate(transactionDate, effectiveBillingCycle);
      if (nextDueDate) {
        const scheduleId = uuidv4();
        await recurringScheduleModel.createRecurringSchedule({
          id: scheduleId,
          user_id: userId,
          template_transaction_id: updated.id,
          billing_cycle: effectiveBillingCycle,
          next_due_date: nextDueDate,
          is_active: true,
        });
      }
    } else if (normalizedIsRecurring === false && existingSchedule) {
      await recurringScheduleModel.setRecurringScheduleActive({
        id: existingSchedule.id,
        user_id: userId,
        is_active: false,
      });
    } else if (normalizedIsRecurring === true && existingSchedule && normalizedBillingCycle) {
      await recurringScheduleModel.updateRecurringSchedule({
        id: existingSchedule.id,
        user_id: userId,
        billing_cycle: normalizedBillingCycle,
      });
    }

    if (type === 'expense') {
      void notificationService
        .checkAndSendBudgetOverrunAlert({
          user_id: userId,
          category_id: categoryId,
          transaction_date: transactionDate,
        })
        .catch(() => {});
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const transactionId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction id is required.' });
    }

    const existing = await transactionModel.getTransactionByIdForUser({
      id: transactionId,
      user_id: userId,
    });

    const deleted = await transactionModel.deleteTransaction({
      id: transactionId,
      user_id: userId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (existing && existing.receipt_filename) {
      const safeName = path.basename(existing.receipt_filename);
      const filePath = path.join(RECEIPTS_UPLOAD_DIR, safeName);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore missing/failed delete
      }
    }

    return res.json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}

async function getTransactions(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const { from, to, categoryId } = req.query || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const transactions = await transactionModel.getTransactionsByUser({
      user_id: userId,
      fromDate: from,
      toDate: to,
      category_id: categoryId,
    });

    return res.json({ success: true, data: transactions });
  } catch (err) {
    return next(err);
  }
}

async function deleteAllTransactions(req, res, next) {
  try {
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const deletedRows = await transactionModel.deleteAllTransactions({ user_id: userId });

    for (const row of deletedRows) {
      if (row.receipt_filename) {
        const safeName = path.basename(row.receipt_filename);
        const filePath = path.join(RECEIPTS_UPLOAD_DIR, safeName);
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // ignore missing/failed delete
        }
      }
    }

    return res.json({ success: true, message: `Deleted ${deletedRows.length} transactions.` });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteAllTransactions,
  getTransactions,
};

