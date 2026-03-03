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
 * Creates or updates a user row from Google profile data.
 * This is used for accounts that authenticate exclusively via Google OAuth.
 *
 * @param {Object} params
 * @param {string} params.id - UUID for the user.
 * @param {string} params.google_id - Google account unique identifier (sub).
 * @param {string} params.email - User email from Google (unique, not null).
 * @param {string|null} [params.name] - Optional display name.
 * @param {string|null} [params.avatar_url] - Optional profile picture URL.
 * @returns {Promise<Object>} The created/updated user row (without password_hash), or throws on error.
 */
async function createUserFromGoogle({ id, google_id, email, name, avatar_url }) {
  const text = `
    INSERT INTO users (id, google_id, email, name, avatar_url, email_verified, email_verified_at)
    VALUES ($1, $2, $3, $4, $5, true, NOW())
    ON CONFLICT (google_id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          email_verified = true,
          email_verified_at = NOW(),
          updated_at = NOW()
    RETURNING id, name, email, avatar_url, created_at, updated_at
  `;
  const values = [id, google_id, email, name ?? null, avatar_url ?? null];

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
    SELECT id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const values = [email];

  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

/**
 * Finds a user by Google account id, excluding soft-deleted users.
 * @param {string} google_id
 * @returns {Promise<Object|null>} The user row or null if not found.
 */
async function findUserByGoogleId(google_id) {
  const text = `
    SELECT id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
    FROM users
    WHERE google_id = $1
    LIMIT 1
  `;
  const values = [google_id];

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
    SELECT id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
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
  createUserFromGoogle,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  markEmailVerified,
};

