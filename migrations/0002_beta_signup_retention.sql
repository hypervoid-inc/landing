ALTER TABLE beta_signups ADD COLUMN expires_at TEXT;

UPDATE beta_signups
SET expires_at = datetime(created_at, '+180 days')
WHERE expires_at IS NULL;

CREATE INDEX beta_signups_expires_at_idx ON beta_signups (expires_at);
