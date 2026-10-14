-- One row per live-demo session (functions/api/embed/*). The email and
-- address are keyed hashes, never the values; nothing anyone types is kept.
CREATE TABLE embed_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  email_hash TEXT NOT NULL,
  ip_hash TEXT,
  src TEXT NOT NULL,
  turns INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_turn_at TEXT,
  expires_at TEXT NOT NULL
);

CREATE INDEX embed_sessions_created_at_idx ON embed_sessions (created_at);
CREATE INDEX embed_sessions_email_hash_idx ON embed_sessions (email_hash, created_at);
CREATE INDEX embed_sessions_ip_hash_idx ON embed_sessions (ip_hash, created_at);
