const { v4: uuidv4 } = require('uuid');

const recurringScheduleModel = require('../models/recurringSchedule.model');
const transactionModel = require('../models/transaction.model');
const recurringReminderService = require('../services/recurringReminder.service');

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

async function getRecurringSchedules(req, res, next) {
  try {
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const schedules = await recurringScheduleModel.getRecurringSchedulesForUser({
      user_id: userId,
    });

    return res.json({ success: true, data: schedules });
  } catch (err) {
    return next(err);
  }
}

async function toggleRecurringScheduleActive(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const scheduleId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!scheduleId) {
      return res.status(400).json({ success: false, message: 'Schedule id is required.' });
    }

    const existing = await recurringScheduleModel.getRecurringScheduleByIdForUser({
      id: scheduleId,
      user_id: userId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Recurring schedule not found.' });
    }

    const updated = await recurringScheduleModel.setRecurringScheduleActive({
      id: scheduleId,
      user_id: userId,
      is_active: !existing.is_active,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Recurring schedule not found.' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

async function runDueRecurringSchedules(req, res, next) {
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

    const dueSchedules = await recurringScheduleModel.findDueSchedulesForUser({
      user_id: userId,
      asOfDate: effectiveDate,
    });

    if (!dueSchedules.length) {
      return res.json({
        success: true,
        data: {
          processedSchedules: 0,
          createdTransactions: 0,
        },
      });
    }

    let createdCount = 0;

    for (const schedule of dueSchedules) {
      const templateTransaction = await transactionModel.getTransactionByIdForUser({
        id: schedule.template_transaction_id,
        user_id: userId,
      });

      if (!templateTransaction) {
        // If the template transaction is missing, deactivate the schedule and continue.
        // eslint-disable-next-line no-await-in-loop
        await recurringScheduleModel.setRecurringScheduleActive({
          id: schedule.id,
          user_id: userId,
          is_active: false,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const txId = uuidv4();
      const txDate = schedule.next_due_date || effectiveDate;

      // eslint-disable-next-line no-await-in-loop
      await transactionModel.createTransaction({
        id: txId,
        user_id: userId,
        category_id: templateTransaction.category_id,
        type: templateTransaction.type,
        amount: templateTransaction.amount,
        amount_in_base: templateTransaction.amount_in_base,
        currency_code: templateTransaction.currency_code,
        description: templateTransaction.description
          ? `Recurring: ${templateTransaction.description}`
          : 'Recurring transaction',
        transaction_date: txDate,
      });

      createdCount += 1;

      const nextDueDate = computeNextDueDate(
        schedule.next_due_date || effectiveDate,
        schedule.billing_cycle,
      );

      if (nextDueDate) {
        // eslint-disable-next-line no-await-in-loop
        await recurringScheduleModel.updateRecurringSchedule({
          id: schedule.id,
          user_id: userId,
          next_due_date: nextDueDate,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        processedSchedules: dueSchedules.length,
        createdTransactions: createdCount,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function runRecurringScheduleReminders(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const { asOfDate } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const summary = await recurringReminderService.runRecurringScheduleRemindersForUser({
      user_id: userId,
      asOfDate,
    });

    return res.json({ success: true, data: summary });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getRecurringSchedules,
  toggleRecurringScheduleActive,
  runDueRecurringSchedules,
  runRecurringScheduleReminders,
};

