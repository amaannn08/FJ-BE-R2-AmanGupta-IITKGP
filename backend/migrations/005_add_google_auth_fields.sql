-- +up
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
  ON users(google_id)
  WHERE google_id IS NOT NULL;

-- +down
ALTER TABLE users
  DROP COLUMN IF EXISTS google_id,
  DROP COLUMN IF EXISTS avatar_url;

DROP INDEX IF EXISTS idx_users_google_id;

