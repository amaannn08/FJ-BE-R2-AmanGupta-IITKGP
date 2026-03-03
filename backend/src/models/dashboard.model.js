const { pool } = require('../db');

async function getDashboardSummary({ user_id, fromDate, toDate }) {
  const text = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS "totalIncome",
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS "totalExpense",
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS "netSavings"
    FROM transactions
    WHERE user_id = $1
      AND transaction_date BETWEEN $2 AND $3
  `;
  const values = [user_id, fromDate, toDate];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function getCategoryBreakdown({ user_id, type, fromDate, toDate }) {
  const text = `
    SELECT
      c.id AS "categoryId",
      c.name AS "categoryName",
      COALESCE(SUM(t.amount), 0) AS "total"
    FROM categories c
    LEFT JOIN transactions t
      ON t.category_id = c.id
     AND t.user_id = c.user_id
     AND t.transaction_date BETWEEN $3 AND $4
    WHERE c.user_id = $1
      AND c.type = $2
    GROUP BY c.id, c.name
    ORDER BY "total" DESC, c.name ASC
  `;
  const values = [user_id, type, fromDate, toDate];

  const { rows } = await pool.query(text, values);
  return rows;
}

async function getMonthlyTrend({ user_id, fromDate, toDate }) {
  const text = `
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', $2::date),
        date_trunc('month', $3::date),
        interval '1 month'
      )::date AS month
    ),
    agg AS (
      SELECT
        date_trunc('month', transaction_date)::date AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = $1
        AND transaction_date BETWEEN $2 AND $3
      GROUP BY 1
    )
    SELECT
      m.month AS month,
      COALESCE(a.income, 0) AS income,
      COALESCE(a.expense, 0) AS expense
    FROM months m
    LEFT JOIN agg a ON a.month = m.month
    ORDER BY m.month ASC
  `;
  const values = [user_id, fromDate, toDate];

  const { rows } = await pool.query(text, values);
  return rows;
}

module.exports = {
  getDashboardSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
};

