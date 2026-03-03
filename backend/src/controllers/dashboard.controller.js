const dashboardModel = require('../models/dashboard.model');

function isValidISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function formatYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultRangeCurrentMonth() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fromDate: formatYYYYMMDD(from), toDate: formatYYYYMMDD(now) };
}

function firstDayOfMonthMonthsAgo(monthsAgo) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

async function getSummary(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { from, to } = req.query || {};
    let fromDate;
    let toDate;

    if (!from && !to) {
      ({ fromDate, toDate } = defaultRangeCurrentMonth());
    } else {
      if (!isValidISODate(from) || !isValidISODate(to)) {
        return res.status(400).json({
          success: false,
          message: 'from and to must be provided in YYYY-MM-DD format.',
        });
      }
      fromDate = from;
      toDate = to;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ success: false, message: 'from must be <= to.' });
    }

    const summary = await dashboardModel.getDashboardSummary({
      user_id: userId,
      fromDate,
      toDate,
    });

    return res.json({ success: true, data: summary });
  } catch (err) {
    return next(err);
  }
}

async function getBreakdown(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { type, from, to } = req.query || {};
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        success: false,
        message: "type must be 'income' or 'expense'.",
      });
    }

    let fromDate;
    let toDate;
    if (!from && !to) {
      ({ fromDate, toDate } = defaultRangeCurrentMonth());
    } else {
      if (!isValidISODate(from) || !isValidISODate(to)) {
        return res.status(400).json({
          success: false,
          message: 'from and to must be provided in YYYY-MM-DD format.',
        });
      }
      fromDate = from;
      toDate = to;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ success: false, message: 'from must be <= to.' });
    }

    const breakdown = await dashboardModel.getCategoryBreakdown({
      user_id: userId,
      type,
      fromDate,
      toDate,
    });

    return res.json({ success: true, data: breakdown });
  } catch (err) {
    return next(err);
  }
}

async function getMonthlyTrend(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const monthsRaw = (req.query && req.query.months) || '6';
    const months = parseInt(monthsRaw, 10);
    if (!Number.isFinite(months) || months < 1 || months > 36) {
      return res.status(400).json({
        success: false,
        message: 'months must be an integer between 1 and 36.',
      });
    }

    const fromDate = formatYYYYMMDD(firstDayOfMonthMonthsAgo(months - 1));
    const toDate = formatYYYYMMDD(new Date());

    const trend = await dashboardModel.getMonthlyTrend({
      user_id: userId,
      fromDate,
      toDate,
    });

    return res.json({
      success: true,
      data: {
        from: fromDate,
        to: toDate,
        months,
        points: trend,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getSummary,
  getBreakdown,
  getMonthlyTrend,
};

