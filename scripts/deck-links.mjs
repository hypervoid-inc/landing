/**
 * Prints a deck link for each person or fund it is sent to, so PostHog can
 * say who opened it (the `deck_recipient` property).
 *
 *   pnpm deck:links "Acme Ventures" "Jane Doe"
 *
 * Each name becomes a slug in `?r=`, never an email.
 */
import process from "node:process";

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('Usage: pnpm deck:links "Acme Ventures" "Jane Doe" ...');
  process.exit(1);
}

for (const name of names) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 64)
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    console.error(`Skipped "${name}": it has no letters or digits.`);
    continue;
  }
  console.log(`${name}\thttps://construct.computer/deck/?r=${slug}`);
}
