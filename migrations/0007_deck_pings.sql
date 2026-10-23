-- One row per deck visit alerted to Discord (functions/api/deck/ping.ts): the
-- page's own visit id, the Discord message later pings edit, and a keyed hash
-- of the address to cap new alerts per connection. Rows go after two days.
CREATE TABLE deck_pings (
  visit_id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT NOT NULL,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX deck_pings_created_at_idx ON deck_pings (created_at);
CREATE INDEX deck_pings_ip_hash_idx ON deck_pings (ip_hash, created_at);
