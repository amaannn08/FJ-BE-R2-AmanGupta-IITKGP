const { v4: uuidv4 } = require('uuid');

const budgetModel = require('../models/budget.model');
const categoryModel = require('../models/category.model');

function parseMonthParam(value) {
  if (typeof value !== 'string') {
    return null;
  }

  let normalized = value.trim();
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}-01`;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  // Always first day of the month
  return `${year}-${month}-01`;
}

async function setBudget(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const categoryId = req.params && req.params.categoryId;
    const { month, amount } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category id is required.' });
    }

    const parsedMonth = parseMonthParam(month);
    if (!parsedMonth) {
      return res.status(400).json({
        success: false,
        message: 'month must be in YYYY-MM or YYYY-MM-DD format.',
      });
    }

    const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be a positive number.',
      });
    }

    const category = await categoryModel.findCategoryByIdForUser({
      category_id: categoryId,
      user_id: userId,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found for this user.' });
    }

    if (category.type !== 'expense') {
      return res.status(400).json({
        success: false,
        message: 'Budgets can only be set for expense categories.',
      });
    }

    const id = uuidv4();
    const budget = await budgetModel.upsertBudget({
      id,
      user_id: userId,
      category_id: categoryId,
      month: parsedMonth,
      amount: numericAmount,
    });

    return res.json({ success: true, data: budget });
  } catch (err) {
    return next(err);
  }
}

async function getBudgetsForMonth(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const { month } = req.query || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const parsedMonth = parseMonthParam(month);
    if (!parsedMonth) {
      return res.status(400).json({
        success: false,
        message: 'month query param must be in YYYY-MM or YYYY-MM-DD format.',
      });
    }

    const budgets = await budgetModel.getBudgetsForMonth({
      user_id: userId,
      month: parsedMonth,
    });

    return res.json({
      success: true,
      data: {
        month: parsedMonth,
        items: budgets,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getBudgetProgress(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const { month } = req.query || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const parsedMonth = parseMonthParam(month);
    if (!parsedMonth) {
      return res.status(400).json({
        success: false,
        message: 'month query param must be in YYYY-MM or YYYY-MM-DD format.',
      });
    }

    const rows = await budgetModel.getBudgetProgressForMonth({
      user_id: userId,
      month: parsedMonth,
    });

    const items = rows.map((row) => {
      const budgetAmountNum = Number(row.budget_amount);
      const actualExpenseNum = Number(row.actual_expense);
      const remainingNum = budgetAmountNum - actualExpenseNum;
      const percentageUsed =
        budgetAmountNum > 0 ? (actualExpenseNum / budgetAmountNum) * 100 : null;

      return {
        budgetId: row.id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryType: row.category_type,
        budgetAmount: row.budget_amount,
        actualExpense: row.actual_expense,
        remaining: remainingNum.toString(),
        percentageUsed,
      };
    });

    return res.json({
      success: true,
      data: {
        month: parsedMonth,
        items,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  setBudget,
  getBudgetsForMonth,
  getBudgetProgress,
};

