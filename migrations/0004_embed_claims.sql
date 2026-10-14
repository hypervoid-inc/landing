-- The exit offer (functions/api/embed/claim.ts): when a session handed over
-- an email for the promo code. The email itself still lives only as a keyed
-- hash, and the lead in beta_signups.
ALTER TABLE embed_sessions ADD COLUMN claimed_at TEXT;
