const { pool } = require('../db');

async function createCategory({ id, user_id, name, type }) {
  const text = `
    INSERT INTO categories (id, user_id, name, type)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, name, type, created_at
  `;
  const values = [id, user_id, name, type];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function getCategoriesByUser(user_id) {
  const text = `
    SELECT id, user_id, name, type, created_at
    FROM categories
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const values = [user_id];

  const { rows } = await pool.query(text, values);
  return rows;
}

async function findCategoryByIdForUser({ category_id, user_id }) {
  const text = `
    SELECT id, user_id, name, type, created_at
    FROM categories
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `;
  const values = [category_id, user_id];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function deleteCategory({ category_id, user_id }) {
  const checkText = `
    SELECT COUNT(*)::int AS tx_count
    FROM transactions
    WHERE category_id = $1 AND user_id = $2
  `;
  const checkValues = [category_id, user_id];

  const { rows: checkRows } = await pool.query(checkText, checkValues);
  const txCount = checkRows[0]?.tx_count || 0;

  if (txCount > 0) {
    const error = new Error('Cannot delete category with existing transactions.');
    error.code = 'CATEGORY_HAS_TRANSACTIONS';
    throw error;
  }

  const deleteText = `
    DELETE FROM categories
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const deleteValues = [category_id, user_id];

  const { rowCount } = await pool.query(deleteText, deleteValues);
  return rowCount > 0;
}

module.exports = {
  createCategory,
  getCategoriesByUser,
  findCategoryByIdForUser,
  deleteCategory,
};

