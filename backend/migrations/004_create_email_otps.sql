-- +up
CREATE TABLE IF NOT EXISTS email_otps (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_user_email
  ON email_otps(user_id, email);

-- +down
DROP INDEX IF EXISTS idx_email_otps_user_email;
DROP TABLE IF EXISTS email_otps;

