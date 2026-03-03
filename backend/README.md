# FinanceTracker Auth MVP

This backend provides a basic authentication MVP using **Express**, **Postgres (Neon via `pg` Pool)**, **bcrypt**, and **JWT**.

## Environment Variables

Create a `.env` file in the project root with at least the following values:

```bash
PORT=3000
DATABASE_URL=postgres://<user>:<password>@<host>/<database>
JWT_SECRET=<a-strong-random-secret>

# Optional overrides
BCRYPT_SALT_ROUNDS=10
JWT_EXPIRES_IN=1h

# Google OAuth (optional, for \"Continue with Google\")
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
FRONTEND_APP_URL=http://localhost:5173
```

> Never commit your `.env` file or share these secrets.

## Database Setup (Neon / Postgres)

Run the following SQL in your Neon Postgres database to create the `users` table:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

After creating the base `users` table, run the SQL migrations in the `migrations/` folder
(`npm run migrate:up`) to add email verification support, email OTPs, and Google OAuth
columns (`google_id`, `avatar_url`, and nullable `password_hash` for Google-only accounts).

## Routes

The API exposes the following routes:

- `POST /signup` – Register a new user with `name`, `email`, `password`.
- `POST /signin` – Log in with `email` and `password`.
- `GET /getProfile` – Get the authenticated user's profile.
- `PUT /updateProfile` – Update the authenticated user's `name` and/or `email`.
- `DELETE /deleteProfile` – Delete the authenticated user's profile.

Authentication-protected routes expect a JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

## Password Rules

Passwords must:

- Be at least 8 characters long.
- Contain at least one uppercase letter.
- Contain at least one lowercase letter.
- Contain at least one digit.
- Contain at least one special character.

