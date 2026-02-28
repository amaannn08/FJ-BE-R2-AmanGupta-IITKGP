import { pool } from "../config/db";

export interface CreateUserInput {
  id: string;
  name: string;
  email: string;
  password: string | null;
  google_id?: string | null;
  profile_picture?: string | null;
  auth_provider: "local" | "google";
}

export async function createUser(user: CreateUserInput) {
  const query = `
    INSERT INTO users (
      id,
      name,
      email,
      password,
      google_id,
      profile_picture,
      auth_provider
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, email, auth_provider, created_at
  `;

  const values = [
    user.id,
    user.name,
    user.email,
    user.password,
    user.google_id || null,
    user.profile_picture || null,
    user.auth_provider,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

export async function findUserByEmail(email: string) {
  const query = `
    SELECT * FROM users WHERE email = $1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0];
}