const { pool } = require('../db');

/**
 * Inserts a new user row into the database.
 * @param {Object} params
 * @param {string} params.id - UUID for the user.
 * @param {string} params.email - User email (unique, not null).
 * @param {string|null} [params.username] - Optional username.
 * @param {string} params.password_hash - Hashed password.
 * @returns {Promise<Object>} The created user row (without password_hash), or throws on error.
 */
async function createUser({ id, email, username, password_hash }) {
  const text = `
    INSERT INTO users (id, email, username, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, username, is_deleted, created_at, updated_at
  `;
  const values = [id, email, username ?? null, password_hash];

  const { rows } = await pool.query(text, values);
  return rows[0];
}

/**
 * Finds a user by email, excluding soft-deleted users.
 * @param {string} email
 * @returns {Promise<Object|null>} The user row or null if not found.
 */
async function findUserByEmail(email) {
  const text = `
    SELECT id, email, username, password_hash, is_deleted, created_at, updated_at
    FROM users
    WHERE email = $1
      AND is_deleted = false
    LIMIT 1
  `;
  const values = [email];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

/**
 * Finds a user by id, excluding soft-deleted users.
 * @param {string} id - User UUID.
 * @returns {Promise<Object|null>} The user row or null if not found.
 */
async function findUserById(id) {
  const text = `
    SELECT id, email, username, password_hash, is_deleted, created_at, updated_at
    FROM users
    WHERE id = $1
      AND is_deleted = false
    LIMIT 1
  `;
  const values = [id];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

/**
 * Updates a user's username and updated_at timestamp.
 * @param {string} id - User UUID.
 * @param {string|null} username - New username.
 * @returns {Promise<Object|null>} The updated user row, or null if not found or soft-deleted.
 */
async function updateUsername(id, username) {
  const text = `
    UPDATE users
    SET username = $2,
        updated_at = NOW()
    WHERE id = $1
      AND is_deleted = false
    RETURNING id, email, username, is_deleted, created_at, updated_at
  `;
  const values = [id, username ?? null];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

/**
 * Soft deletes a user by setting is_deleted = true and updating updated_at.
 * @param {string} id - User UUID.
 * @returns {Promise<boolean>} True if a row was updated, false otherwise.
 */
async function softDeleteUser(id) {
  const text = `
    UPDATE users
    SET is_deleted = true,
        updated_at = NOW()
    WHERE id = $1
      AND is_deleted = false
    RETURNING id
  `;
  const values = [id];

  const { rowCount } = await pool.query(text, values);
  return rowCount > 0;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUsername,
  softDeleteUser,
};

