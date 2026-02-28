CREATE TABLE users (
  id UUID PRIMARY KEY,

  name TEXT NOT NULL,

  email TEXT UNIQUE NOT NULL,

  password TEXT,

  google_id TEXT UNIQUE,

  profile_picture TEXT,

  auth_provider TEXT NOT NULL DEFAULT 'local',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT password_or_google_check
  CHECK (
    (auth_provider = 'local' AND password IS NOT NULL)
    OR
    (auth_provider = 'google' AND google_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);