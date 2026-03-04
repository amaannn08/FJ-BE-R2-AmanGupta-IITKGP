const { pool } = require('../db');

async function createRecurringBill({
  id,
  user_id,
  category_id,
  name,
  amount,
  amount_in_base,
  currency_code,
  billing_cycle,
  next_due_date,
  is_recurring,
  is_active,
}) {
  const text = `
    INSERT INTO recurring_bills (
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active,
      created_at,
      updated_at
  `;

  const values = [
    id,
    user_id,
    category_id,
    name,
    amount,
    amount_in_base,
    currency_code,
    billing_cycle,
    next_due_date,
    is_recurring,
    is_active,
  ];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function getRecurringBillsForUser({ user_id }) {
  const text = `
    SELECT
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active,
      created_at,
      updated_at
    FROM recurring_bills
    WHERE user_id = $1
    ORDER BY next_due_date ASC, created_at ASC
  `;
  const values = [user_id];

  const { rows } = await pool.query(text, values);
  return rows;
}

async function getRecurringBillByIdForUser({ id, user_id }) {
  const text = `
    SELECT
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active,
      created_at,
      updated_at
    FROM recurring_bills
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `;
  const values = [id, user_id];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function updateRecurringBill({
  id,
  user_id,
  name,
  amount,
  amount_in_base,
  currency_code,
  billing_cycle,
  next_due_date,
  is_recurring,
  is_active,
  category_id,
}) {
  const fields = [];
  const values = [id, user_id];
  let idx = 3;

  if (name !== undefined) {
    fields.push(`name = $${idx}`);
    values.push(name);
    idx += 1;
  }
  if (amount !== undefined) {
    fields.push(`amount = $${idx}`);
    values.push(amount);
    idx += 1;
  }
  if (amount_in_base !== undefined) {
    fields.push(`amount_in_base = $${idx}`);
    values.push(amount_in_base);
    idx += 1;
  }
  if (currency_code !== undefined) {
    fields.push(`currency_code = $${idx}`);
    values.push(currency_code);
    idx += 1;
  }
  if (billing_cycle !== undefined) {
    fields.push(`billing_cycle = $${idx}`);
    values.push(billing_cycle);
    idx += 1;
  }
  if (next_due_date !== undefined) {
    fields.push(`next_due_date = $${idx}`);
    values.push(next_due_date);
    idx += 1;
  }
  if (is_recurring !== undefined) {
    fields.push(`is_recurring = $${idx}`);
    values.push(is_recurring);
    idx += 1;
  }
  if (is_active !== undefined) {
    fields.push(`is_active = $${idx}`);
    values.push(is_active);
    idx += 1;
  }
  if (category_id !== undefined) {
    fields.push(`category_id = $${idx}`);
    values.push(category_id);
    idx += 1;
  }

  if (fields.length === 0) {
    return getRecurringBillByIdForUser({ id, user_id });
  }

  const setClause = `${fields.join(', ')}, updated_at = NOW()`;

  const text = `
    UPDATE recurring_bills
    SET ${setClause}
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function setRecurringBillActive({ id, user_id, is_active }) {
  const text = `
    UPDATE recurring_bills
    SET is_active = $3,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active,
      created_at,
      updated_at
  `;
  const values = [id, user_id, is_active];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function deleteRecurringBill({ id, user_id }) {
  const text = `
    DELETE FROM recurring_bills
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const values = [id, user_id];

  const { rowCount } = await pool.query(text, values);
  return rowCount > 0;
}

async function findDueRecurringBills({ user_id, asOfDate }) {
  const text = `
    SELECT
      id,
      user_id,
      category_id,
      name,
      amount,
      amount_in_base,
      currency_code,
      billing_cycle,
      next_due_date,
      is_recurring,
      is_active,
      created_at,
      updated_at
    FROM recurring_bills
    WHERE user_id = $1
      AND is_active = TRUE
      AND is_recurring = TRUE
      AND next_due_date <= $2
    ORDER BY next_due_date ASC, created_at ASC
  `;
  const values = [user_id, asOfDate];

  const { rows } = await pool.query(text, values);
  return rows;
}

module.exports = {
  createRecurringBill,
  getRecurringBillsForUser,
  getRecurringBillByIdForUser,
  updateRecurringBill,
  setRecurringBillActive,
  deleteRecurringBill,
  findDueRecurringBills,
};

