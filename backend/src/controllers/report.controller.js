const reportModel = require('../models/report.model');

function isValidISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

async function getMonthlyIncomeExpenseReport(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { from, to } = req.query || {};

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'from and to query parameters are required.',
      });
    }

    if (!isValidISODate(from) || !isValidISODate(to)) {
      return res.status(400).json({
        success: false,
        message: 'from and to must be valid dates in YYYY-MM-DD format.',
      });
    }

    if (new Date(from) > new Date(to)) {
      return res.status(400).json({
        success: false,
        message: 'from must be less than or equal to to.',
      });
    }

    const rows = await reportModel.getMonthlyIncomeExpense({
      user_id: userId,
      fromDate: from,
      toDate: to,
    });

    const months = rows.map((row) => {
      const incomeNum = Number(row.income);
      const expenseNum = Number(row.expense);
      const net = incomeNum - expenseNum;

      return {
        month: row.month,
        income: row.income,
        expense: row.expense,
        net: net.toString(),
      };
    });

    return res.json({
      success: true,
      data: {
        from,
        to,
        months,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMonthlyIncomeExpenseReport,
};

