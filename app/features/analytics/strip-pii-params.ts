// Dodo appends the customer's email to checkout and portal return URLs
// (/account?...&email=..., /app/?...&email=...). Full URLs are kept on purpose
// for campaign attribution (see analytics.client.ts), so this drops only the
// params that carry an email and leaves ref, cid, sid and utm_* intact.

const PII_PARAMS = new Set(["email", "customer_email"]);

const URL_PROPERTIES = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
  // posthog-js copies the session's first $current_url and $referrer into
  // these and merges them into every event of that session.
  "$session_entry_url",
  "$session_entry_referrer",
] as const;

export function stripPiiParams(value: unknown): unknown {
  if (typeof value !== "string" || !value.includes("?")) return value;
  try {
    const url = new URL(value);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      if (PII_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    return changed ? url.toString() : value;
  } catch {
    return value;
  }
}

function scrubBag(bag: unknown): void {
  if (!bag || typeof bag !== "object") return;
  const record = bag as Record<string, unknown>;
  for (const key of URL_PROPERTIES) {
    if (key in record) record[key] = stripPiiParams(record[key]);
  }
}

type CapturedEvent = {
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
};

/** posthog-js before_send: scrub email params from URL properties in place. */
export function stripPiiFromEvent<T extends CapturedEvent | null>(event: T): T {
  if (!event) return event;
  scrubBag(event.properties);
  scrubBag(event.properties?.$set);
  scrubBag(event.properties?.$set_once);
  scrubBag(event.$set);
  scrubBag(event.$set_once);
  return event;
}
