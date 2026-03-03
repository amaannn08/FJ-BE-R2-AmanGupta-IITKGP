const { pool } = require('../db');

async function upsertBudget({ id, user_id, category_id, month, amount }) {
  const text = `
    INSERT INTO category_budgets (id, user_id, category_id, month, amount)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, category_id, month)
    DO UPDATE SET
      amount = EXCLUDED.amount,
      updated_at = NOW()
    RETURNING id, user_id, category_id, month, amount, created_at, updated_at
  `;

  const values = [id, user_id, category_id, month, amount];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function getBudgetsForMonth({ user_id, month }) {
  const text = `
    SELECT
      b.id,
      b.user_id,
      b.category_id,
      b.month,
      b.amount,
      b.created_at,
      b.updated_at,
      c.name AS category_name,
      c.type AS category_type
    FROM category_budgets b
    JOIN categories c
      ON c.id = b.category_id
     AND c.user_id = b.user_id
    WHERE b.user_id = $1
      AND b.month = $2
    ORDER BY c.name
  `;

  const values = [user_id, month];
  const { rows } = await pool.query(text, values);
  return rows;
}

async function getBudgetProgressForMonth({ user_id, month }) {
  const text = `
    SELECT
      b.id,
      b.user_id,
      b.category_id,
      b.month,
      b.amount AS budget_amount,
      c.name AS category_name,
      c.type AS category_type,
      COALESCE(SUM(t.amount), 0) AS actual_expense
    FROM category_budgets b
    JOIN categories c
      ON c.id = b.category_id
     AND c.user_id = b.user_id
    LEFT JOIN transactions t
      ON t.category_id = b.category_id
     AND t.user_id = b.user_id
     AND t.transaction_date >= date_trunc('month', $2::date)
     AND t.transaction_date <  (date_trunc('month', $2::date) + INTERVAL '1 month')
     AND t.type = 'expense'
    WHERE b.user_id = $1
    GROUP BY b.id, b.user_id, b.category_id, b.month, b.amount, c.name, c.type
    ORDER BY c.name
  `;

  const values = [user_id, month];
  const { rows } = await pool.query(text, values);
  return rows;
}

module.exports = {
  upsertBudget,
  getBudgetsForMonth,
  getBudgetProgressForMonth,
};

