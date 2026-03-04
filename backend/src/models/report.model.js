const { pool } = require('../db');

async function getMonthlyIncomeExpense({ user_id, fromDate, toDate }) {
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
        SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount_in_base ELSE 0 END) AS expense
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
  getMonthlyIncomeExpense,
};

