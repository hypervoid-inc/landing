/**
 * Session replay runs with `recordBody`/`recordHeaders` on for product ops, which
 * would otherwise write credentials straight into the recording: password bodies
 * on /auth/password/*, provider API keys on /v1/llm/byok/*, and the login tokens
 * that grant a session outright. Strip payloads on those endpoints before capture.
 */

/** Path fragments whose request/response payloads may carry a secret. */
const CREDENTIAL_PATHS = [
  "/auth/password",
  "/auth/magic",
  "/auth/exchange",
  "/auth/refresh",
  "/llm/byok",
] as const;

/** Headers that carry a bearer token or cookie regardless of endpoint. */
const SENSITIVE_HEADERS = ["authorization", "cookie", "set-cookie"] as const;

export function isCredentialUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Compare on the path only: a query string must never make a URL look safe.
  let path = url;
  try {
    path = new URL(url, "https://construct.computer").pathname;
  } catch {
    // Keep the raw value — matching a malformed URL is better than skipping it.
  }
  const lowered = path.toLowerCase();
  return CREDENTIAL_PATHS.some((fragment) => lowered.includes(fragment));
}

function stripHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    safe[key] = (
      SENSITIVE_HEADERS as readonly string[]
    ).includes(key.toLowerCase())
      ? "[redacted]"
      : value;
  }
  return safe;
}

type NetworkCapture = {
  name?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string | null;
  responseHeaders?: Record<string, string>;
  responseBody?: string | null;
};

/**
 * Keeps the request in the recording (timing and status stay useful) while
 * dropping anything that could contain a secret.
 */
export function scrubNetworkCapture<T extends NetworkCapture>(data: T): T {
  const scrubbed: T = {
    ...data,
    requestHeaders: stripHeaders(data.requestHeaders),
    responseHeaders: stripHeaders(data.responseHeaders),
  };
  if (isCredentialUrl(data.name)) {
    scrubbed.requestBody = "[redacted]";
    scrubbed.responseBody = "[redacted]";
  }
  return scrubbed;
}
