const { pool } = require('../db');

async function createTransaction({
  id,
  user_id,
  category_id,
  type,
  amount,
  amount_in_base,
  currency_code,
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
      amount_in_base,
      currency_code,
      description,
      transaction_date,
      receipt_filename
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
    RETURNING id, user_id, category_id, type, amount, amount_in_base, currency_code, description, transaction_date, receipt_filename, created_at, updated_at
  `;

  const values = [
    id,
    user_id,
    category_id,
    type,
    amount,
    amount_in_base,
    currency_code,
    description ?? null,
    transaction_date,
  ];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function updateTransaction({
  id,
  user_id,
  category_id,
  type,
  amount,
  amount_in_base,
  currency_code,
  description,
  transaction_date,
}) {
  const text = `
    UPDATE transactions
    SET
      category_id = $3,
      type = $4,
      amount = $5,
      amount_in_base = $6,
      currency_code = $7,
      description = $8,
      transaction_date = $9,
      updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
    RETURNING id, user_id, category_id, type, amount, amount_in_base, currency_code, description, transaction_date, receipt_filename, created_at, updated_at
  `;

  const values = [
    id,
    user_id,
    category_id,
    type,
    amount,
    amount_in_base,
    currency_code,
    description ?? null,
    transaction_date,
  ];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function deleteTransaction({ id, user_id }) {
  const text = `
    DELETE FROM transactions
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const values = [id, user_id];

  const { rowCount } = await pool.query(text, values);
  return rowCount > 0;
}

async function getTransactionsByUser({
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
    SELECT id, user_id, category_id, type, amount, amount_in_base, currency_code, description, transaction_date, receipt_filename, created_at, updated_at
    FROM transactions
    WHERE ${whereClause}
    ORDER BY transaction_date DESC, created_at DESC
  `;

  const { rows } = await pool.query(text, values);
  return rows;
}

async function getTransactionByIdForUser({ id, user_id }) {
  const text = `
    SELECT id, user_id, category_id, type, amount, amount_in_base, currency_code, description, transaction_date, receipt_filename, created_at, updated_at
    FROM transactions
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `;
  const values = [id, user_id];
  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function setReceiptFilename({ id, user_id, receipt_filename }) {
  const text = `
    UPDATE transactions
    SET receipt_filename = $3,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, category_id, type, amount, description, transaction_date, receipt_filename, created_at, updated_at
  `;
  const values = [id, user_id, receipt_filename];
  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function clearReceiptFilename({ id, user_id }) {
  const text = `
    UPDATE transactions
    SET receipt_filename = NULL,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, category_id, type, amount, description, transaction_date, receipt_filename, created_at, updated_at
  `;
  const values = [id, user_id];
  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

module.exports = {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByUser,
  getTransactionByIdForUser,
  setReceiptFilename,
  clearReceiptFilename,
};

