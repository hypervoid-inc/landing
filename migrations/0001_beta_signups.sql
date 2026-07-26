CREATE TABLE beta_signups (
  email TEXT PRIMARY KEY NOT NULL,
  cta_source TEXT NOT NULL,
  referral TEXT NOT NULL,
  referral_other TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX beta_signups_created_at_idx ON beta_signups (created_at);
