const { pool } = require('../db');

/**
 * Inserts a new user row into the database.
 * NOTE: signup currently uses its own INSERT; this helper is aligned with
 * the current users schema (name + email).
 *
 * @param {Object} params
 * @param {string} params.id - UUID for the user.
 * @param {string} params.email - User email (unique, not null).
 * @param {string|null} [params.name] - Optional display name.
 * @param {string} params.password_hash - Hashed password.
 * @returns {Promise<Object>} The created user row (without password_hash), or throws on error.
 */
async function createUser({ id, email, name, password_hash }) {
  const text = `
    INSERT INTO users (id, email, name, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, created_at, updated_at
  `;
  const values = [id, email, name ?? null, password_hash];

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
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE email = $1
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
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const values = [id];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

async function markEmailVerified(id) {
  const text = `
    UPDATE users
    SET email_verified = true,
        email_verified_at = NOW()
    WHERE id = $1
  `;
  const values = [id];
  await pool.query(text, values);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  markEmailVerified,
};

