-- Each investor deck PDF emailed from /deck/ (functions/api/deck/send.ts),
-- kept only to limit how much mail one address or connection can trigger.
-- The email and address are keyed hashes, never the values. Rows go after
-- two days.
CREATE TABLE deck_sends (
  email_hash TEXT NOT NULL,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX deck_sends_created_at_idx ON deck_sends (created_at);
CREATE INDEX deck_sends_email_hash_idx ON deck_sends (email_hash, created_at);
CREATE INDEX deck_sends_ip_hash_idx ON deck_sends (ip_hash, created_at);
