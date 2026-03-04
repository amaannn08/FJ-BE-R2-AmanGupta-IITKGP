const { pool } = require('../db');

async function createRecurringSchedule({
  id,
  user_id,
  template_transaction_id,
  billing_cycle,
  next_due_date,
  is_active,
}) {
  const text = `
    INSERT INTO recurring_schedules (
      id,
      user_id,
      template_transaction_id,
      billing_cycle,
      next_due_date,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      user_id,
      template_transaction_id,
      billing_cycle,
      next_due_date,
      is_active,
      created_at,
      updated_at
  `;

  const values = [
    id,
    user_id,
    template_transaction_id,
    billing_cycle,
    next_due_date,
    is_active ?? true,
  ];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function getRecurringSchedulesForUser({ user_id }) {
  const text = `
    SELECT
      s.id,
      s.user_id,
      s.template_transaction_id,
      s.billing_cycle,
      s.next_due_date,
      s.is_active,
      s.created_at,
      s.updated_at,
      t.category_id,
      t.type,
      t.amount,
      t.amount_in_base,
      t.currency_code,
      t.description,
      t.transaction_date
    FROM recurring_schedules s
    JOIN transactions t
      ON t.id = s.template_transaction_id
    WHERE s.user_id = $1
    ORDER BY s.next_due_date ASC, s.created_at ASC
  `;
  const values = [user_id];

  const { rows } = await pool.query(text, values);
  return rows;
}

async function getRecurringScheduleByIdForUser({ id, user_id }) {
  const text = `
    SELECT
      s.id,
      s.user_id,
      s.template_transaction_id,
      s.billing_cycle,
      s.next_due_date,
      s.is_active,
      s.created_at,
      s.updated_at
    FROM recurring_schedules s
    WHERE s.id = $1 AND s.user_id = $2
    LIMIT 1
  `;
  const values = [id, user_id];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function findScheduleByTemplateForUser({ user_id, template_transaction_id }) {
  const text = `
    SELECT
      id,
      user_id,
      template_transaction_id,
      billing_cycle,
      next_due_date,
      is_active,
      created_at,
      updated_at
    FROM recurring_schedules
    WHERE user_id = $1
      AND template_transaction_id = $2
    LIMIT 1
  `;
  const values = [user_id, template_transaction_id];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function setRecurringScheduleActive({ id, user_id, is_active }) {
  const text = `
    UPDATE recurring_schedules
    SET is_active = $3,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id,
      template_transaction_id,
      billing_cycle,
      next_due_date,
      is_active,
      created_at,
      updated_at
  `;
  const values = [id, user_id, is_active];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function updateRecurringSchedule({
  id,
  user_id,
  billing_cycle,
  next_due_date,
  is_active,
}) {
  const fields = [];
  const values = [id, user_id];
  let idx = 3;

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

  if (is_active !== undefined) {
    fields.push(`is_active = $${idx}`);
    values.push(is_active);
    idx += 1;
  }

  if (fields.length === 0) {
    return getRecurringScheduleByIdForUser({ id, user_id });
  }

  const setClause = `${fields.join(', ')}, updated_at = NOW()`;

  const text = `
    UPDATE recurring_schedules
    SET ${setClause}
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id,
      template_transaction_id,
      billing_cycle,
      next_due_date,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function findDueSchedulesForUser({ user_id, asOfDate }) {
  const text = `
    SELECT
      s.id,
      s.user_id,
      s.template_transaction_id,
      s.billing_cycle,
      s.next_due_date,
      s.is_active,
      s.created_at,
      s.updated_at,
      t.category_id,
      t.type,
      t.amount,
      t.amount_in_base,
      t.currency_code,
      t.description,
      t.transaction_date
    FROM recurring_schedules s
    JOIN transactions t
      ON t.id = s.template_transaction_id
    WHERE s.user_id = $1
      AND s.is_active = TRUE
      AND s.next_due_date <= $2
    ORDER BY s.next_due_date ASC, s.created_at ASC
  `;
  const values = [user_id, asOfDate];

  const { rows } = await pool.query(text, values);
  return rows;
}

module.exports = {
  createRecurringSchedule,
  getRecurringSchedulesForUser,
  getRecurringScheduleByIdForUser,
  findScheduleByTemplateForUser,
  setRecurringScheduleActive,
  updateRecurringSchedule,
  findActiveSchedulesDueOnDateForUser,
  findDueSchedulesForUser,
};

async function findActiveSchedulesDueOnDateForUser({ user_id, dueDate }) {
  const text = `
    SELECT
      s.id,
      s.user_id,
      s.template_transaction_id,
      s.billing_cycle,
      s.next_due_date,
      s.is_active,
      s.created_at,
      s.updated_at,
      t.category_id,
      c.name AS category_name,
      t.type,
      t.amount,
      t.amount_in_base,
      t.currency_code,
      t.description,
      t.transaction_date
    FROM recurring_schedules s
    JOIN transactions t
      ON t.id = s.template_transaction_id
    LEFT JOIN categories c
      ON c.id = t.category_id
    WHERE s.user_id = $1
      AND s.is_active = TRUE
      AND s.next_due_date = $2
    ORDER BY s.next_due_date ASC, s.created_at ASC
  `;
  const values = [user_id, dueDate];
  const { rows } = await pool.query(text, values);
  return rows;
}

