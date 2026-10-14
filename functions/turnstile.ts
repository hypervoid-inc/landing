import type { BetaSignupEnv } from "./types";

const TURNSTILE_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileEnv = Pick<
  BetaSignupEnv,
  | "TURNSTILE_SECRET_KEY"
  | "TURNSTILE_EXPECTED_HOSTNAME"
  | "TURNSTILE_EXPECTED_ACTION"
  | "TURNSTILE_TEST_MODE"
  | "ALLOWED_ORIGIN_HOSTNAME"
>;

export type TurnstileOutcome =
  /** Turnstile secrets are not configured. */
  | "unconfigured"
  /** The Origin header names another site. */
  | "origin_rejected"
  /** Cloudflare could not be reached. */
  | "unavailable"
  /** The token did not verify for this site and action. */
  | "failed"
  | "ok";

/**
 * Verify a browser's Turnstile token for this site and action, after checking
 * that the request came from our own origin. Shared by every public form.
 */
export async function verifyTurnstile(
  env: TurnstileEnv,
  request: Request,
  token: string,
): Promise<TurnstileOutcome> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  const expectedHostname =
    env.TURNSTILE_EXPECTED_HOSTNAME?.trim().toLowerCase();
  const expectedAction = env.TURNSTILE_EXPECTED_ACTION?.trim() || "beta_signup";
  const allowedOriginHostname =
    env.ALLOWED_ORIGIN_HOSTNAME?.trim().toLowerCase() || expectedHostname;
  if (!secret || !expectedHostname) return "unconfigured";

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).hostname.toLowerCase() !== allowedOriginHostname) {
        return "origin_rejected";
      }
    } catch {
      return "origin_rejected";
    }
  }

  const verificationRequest = new URLSearchParams({ secret, response: token });
  const clientIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (clientIp) verificationRequest.set("remoteip", clientIp);

  let verification: unknown;
  try {
    const response = await fetch(TURNSTILE_URL, {
      method: "POST",
      body: verificationRequest,
    });
    if (!response.ok) return "unavailable";
    verification = await response.json();
  } catch {
    return "unavailable";
  }

  if (
    !verification ||
    typeof verification !== "object" ||
    !("success" in verification) ||
    verification.success !== true
  ) {
    return "failed";
  }

  const metadata =
    "metadata" in verification &&
    verification.metadata &&
    typeof verification.metadata === "object"
      ? verification.metadata
      : null;
  const isTestResponse =
    env.TURNSTILE_TEST_MODE === "true" &&
    metadata &&
    "result_with_testing_key" in metadata &&
    metadata.result_with_testing_key === true;
  if (
    (!isTestResponse &&
      (!("action" in verification) ||
        verification.action !== expectedAction)) ||
    !("hostname" in verification) ||
    typeof verification.hostname !== "string" ||
    verification.hostname.toLowerCase() !== expectedHostname
  ) {
    return "failed";
  }
  return "ok";
}
