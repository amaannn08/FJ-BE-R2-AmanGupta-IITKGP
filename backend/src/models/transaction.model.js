import { pool } from '../config/db.js';

export async function createTransaction({
  id,
  user_id,
  category_id,
  type,
  amount,
  description,
  transaction_date,
}) {
  const text = `
    INSERT INTO transactions (
      id,
      user_id,
      category_id,
      type,
      amount,
      description,
      transaction_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, user_id, category_id, type, amount, description, transaction_date, created_at, updated_at
  `;

  const values = [
    id,
    user_id,
    category_id,
    type,
    amount,
    description ?? null,
    transaction_date,
  ];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

export async function updateTransaction({
  id,
  user_id,
  category_id,
  type,
  amount,
  description,
  transaction_date,
}) {
  const text = `
    UPDATE transactions
    SET
      category_id = $3,
      type = $4,
      amount = $5,
      description = $6,
      transaction_date = $7,
      updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
    RETURNING id, user_id, category_id, type, amount, description, transaction_date, created_at, updated_at
  `;

  const values = [
    id,
    user_id,
    category_id,
    type,
    amount,
    description ?? null,
    transaction_date,
  ];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

export async function deleteTransaction({ id, user_id }) {
  const text = `
    DELETE FROM transactions
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const values = [id, user_id];

  const { rowCount } = await pool.query(text, values);
  return rowCount > 0;
}

export async function getTransactionsByUser({
  user_id,
  fromDate,
  toDate,
  category_id,
}) {
  const conditions = ['user_id = $1'];
  const values = [user_id];
  let paramIndex = 2;

  if (fromDate) {
    conditions.push(`transaction_date >= $${paramIndex}`);
    values.push(fromDate);
    paramIndex += 1;
  }

  if (toDate) {
    conditions.push(`transaction_date <= $${paramIndex}`);
    values.push(toDate);
    paramIndex += 1;
  }

  if (category_id) {
    conditions.push(`category_id = $${paramIndex}`);
    values.push(category_id);
    paramIndex += 1;
  }

  const whereClause = conditions.join(' AND ');

  const text = `
    SELECT id, user_id, category_id, type, amount, description, transaction_date, created_at, updated_at
    FROM transactions
    WHERE ${whereClause}
    ORDER BY transaction_date DESC, created_at DESC
  `;

  const { rows } = await pool.query(text, values);
  return rows;
}

