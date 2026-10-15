-- Signups live in Listmonk only (functions/signups.ts), so nothing reads or
-- writes beta_signups any more. Its indexes go with it. Export the rows first
-- if they are still wanted (docs/search-and-deployment.md).
DROP TABLE IF EXISTS beta_signups;
