const { v4: uuidv4 } = require('uuid');

const recurringBillModel = require('../models/recurringBill.model');
const transactionModel = require('../models/transaction.model');
const categoryModel = require('../models/category.model');
const { convertToInr, assertSupportedCurrency, normalizeCurrencyCode } = require('../config/fxRates');

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

async function getRecurringBills(req, res, next) {
  try {
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const bills = await recurringBillModel.getRecurringBillsForUser({ user_id: userId });
    return res.json({ success: true, data: bills });
  } catch (err) {
    return next(err);
  }
}

async function createRecurringBill(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const {
      name,
      amount,
      billing_cycle: billingCycle,
      next_due_date: nextDueDate,
      categoryId,
      currencyCode,
      is_recurring: isRecurringFlag,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    if (!billingCycle || (billingCycle !== 'monthly' && billingCycle !== 'yearly')) {
      return res.status(400).json({
        success: false,
        message: "billing_cycle must be 'monthly' or 'yearly'.",
      });
    }

    if (!nextDueDate || !isValidDateString(nextDueDate)) {
      return res.status(400).json({
        success: false,
        message: 'next_due_date must be a valid date string.',
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required.',
      });
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number.',
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

    const id = uuidv4();
    const amountRounded = roundToTwoDecimals(parsedAmount);

    const normalizedCurrency =
      typeof currencyCode === 'string' && currencyCode.trim()
        ? normalizeCurrencyCode(currencyCode)
        : 'INR';

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

    const isRecurring = isRecurringFlag === undefined ? true : !!isRecurringFlag;

    const bill = await recurringBillModel.createRecurringBill({
      id,
      user_id: userId,
      category_id: categoryId,
      name: name.trim(),
      amount: amountRounded,
      amount_in_base: amountInBase,
      currency_code: finalCurrencyCode,
      billing_cycle: billingCycle,
      next_due_date: nextDueDate,
      is_recurring: isRecurring,
      is_active: true,
    });

    return res.status(201).json({ success: true, data: bill });
  } catch (err) {
    return next(err);
  }
}

async function updateRecurringBill(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const billId = req.params && req.params.id;
    const {
      name,
      amount,
      billing_cycle: billingCycle,
      next_due_date: nextDueDate,
      categoryId,
      currencyCode,
      is_recurring: isRecurringFlag,
      is_active: isActiveFlag,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!billId) {
      return res.status(400).json({ success: false, message: 'Recurring bill id is required.' });
    }

    const existing = await recurringBillModel.getRecurringBillByIdForUser({
      id: billId,
      user_id: userId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Recurring bill not found.' });
    }

    const updates = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required.',
        });
      }
      updates.name = name.trim();
    }

    if (billingCycle !== undefined) {
      if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
        return res.status(400).json({
          success: false,
          message: "billing_cycle must be 'monthly' or 'yearly'.",
        });
      }
      updates.billing_cycle = billingCycle;
    }

    if (nextDueDate !== undefined) {
      if (!nextDueDate || !isValidDateString(nextDueDate)) {
        return res.status(400).json({
          success: false,
          message: 'next_due_date must be a valid date string.',
        });
      }
      updates.next_due_date = nextDueDate;
    }

    if (categoryId !== undefined) {
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

      updates.category_id = categoryId;
    }

    let amountRounded;
    if (amount !== undefined) {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount === null || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number.',
        });
      }
      amountRounded = roundToTwoDecimals(parsedAmount);
      updates.amount = amountRounded;
    }

    let currencyToUse = existing.currency_code;
    if (currencyCode !== undefined) {
      currencyToUse =
        typeof currencyCode === 'string' && currencyCode.trim()
          ? normalizeCurrencyCode(currencyCode)
          : 'INR';
    }

    if (amountRounded !== undefined || currencyCode !== undefined) {
      const amountForConversion =
        amountRounded !== undefined ? amountRounded : existing.amount;
      try {
        const normalized = assertSupportedCurrency(currencyToUse);
        const conv = convertToInr(amountForConversion, normalized);
        updates.amount_in_base = conv.amountInInr;
        updates.currency_code = conv.currencyCode;
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
    }

    if (isRecurringFlag !== undefined) {
      updates.is_recurring = !!isRecurringFlag;
    }

    if (isActiveFlag !== undefined) {
      updates.is_active = !!isActiveFlag;
    }

    const updated = await recurringBillModel.updateRecurringBill({
      id: billId,
      user_id: userId,
      ...updates,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Recurring bill not found.' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

async function toggleRecurringBillActive(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const billId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!billId) {
      return res.status(400).json({ success: false, message: 'Recurring bill id is required.' });
    }

    const existing = await recurringBillModel.getRecurringBillByIdForUser({
      id: billId,
      user_id: userId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Recurring bill not found.' });
    }

    const updated = await recurringBillModel.setRecurringBillActive({
      id: billId,
      user_id: userId,
      is_active: !existing.is_active,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Recurring bill not found.' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

async function deleteRecurringBill(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const billId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!billId) {
      return res.status(400).json({ success: false, message: 'Recurring bill id is required.' });
    }

    const deleted = await recurringBillModel.deleteRecurringBill({
      id: billId,
      user_id: userId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Recurring bill not found.' });
    }

    return res.json({ success: true, message: 'Recurring bill deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}

async function runDueRecurringBills(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const { asOfDate } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);

    const effectiveDate =
      typeof asOfDate === 'string' && asOfDate.trim() && isValidDateString(asOfDate)
        ? asOfDate
        : isoToday;

    const dueBills = await recurringBillModel.findDueRecurringBills({
      user_id: userId,
      asOfDate: effectiveDate,
    });

    if (!dueBills.length) {
      return res.json({
        success: true,
        data: {
          processedBills: 0,
          createdTransactions: 0,
        },
      });
    }

    let createdCount = 0;

    for (const bill of dueBills) {
      const amountRounded = roundToTwoDecimals(bill.amount);

      let amountInBase = bill.amount_in_base;
      let finalCurrencyCode = bill.currency_code;

      if (amountInBase == null || !finalCurrencyCode) {
        try {
          const normalized = assertSupportedCurrency(bill.currency_code || 'INR');
          const conv = convertToInr(amountRounded, normalized);
          amountInBase = conv.amountInInr;
          finalCurrencyCode = conv.currencyCode;
        } catch (err) {
          // Skip this bill but continue processing others.
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      const txId = uuidv4();
      const txDate = bill.next_due_date || effectiveDate;

      // Create an expense transaction mirroring manual creation rules.
      // We rely on transaction.model directly here to avoid double validation and to keep this idempotent.
      // The category has already been validated when the bill was created.
      // Any DB-level issues will surface via the global error handler.
      // eslint-disable-next-line no-await-in-loop
      await transactionModel.createTransaction({
        id: txId,
        user_id: userId,
        category_id: bill.category_id,
        type: 'expense',
        amount: amountRounded,
        amount_in_base: amountInBase,
        currency_code: finalCurrencyCode,
        description: `Recurring bill: ${bill.name}`,
        transaction_date: txDate,
      });

      createdCount += 1;

      // Advance next_due_date by one cycle.
      const currentDue = new Date(bill.next_due_date || effectiveDate);
      let nextDue = new Date(currentDue);
      if (bill.billing_cycle === 'yearly') {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      } else {
        // default to monthly
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      const nextDueIso = nextDue.toISOString().slice(0, 10);

      // eslint-disable-next-line no-await-in-loop
      await recurringBillModel.updateRecurringBill({
        id: bill.id,
        user_id: userId,
        next_due_date: nextDueIso,
      });
    }

    return res.json({
      success: true,
      data: {
        processedBills: dueBills.length,
        createdTransactions: createdCount,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getRecurringBills,
  createRecurringBill,
  updateRecurringBill,
  toggleRecurringBillActive,
  deleteRecurringBill,
  runDueRecurringBills,
};

