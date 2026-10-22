import type { Properties } from "posthog-js";

/**
 * The event a landing sign-in step sends: auth_completed on success, else
 * auth_failed with the step and the API's reason slug. Same names as the OS
 * events, told apart by source.
 */
export function landingAuthEvent(
  method: "email_otp" | "password" | "oauth",
  step: "send" | "verify",
  result: { success: boolean; reason?: string },
): ["auth_completed" | "auth_failed", Properties] {
  const base = { method, source: "landing" };
  if (result.success) return ["auth_completed", base];
  return [
    "auth_failed",
    { ...base, step, ...(result.reason ? { reason: result.reason } : {}) },
  ];
}

const GOOGLE_KEY = "construct.landing.googleSignIn";
const GOOGLE_TTL_MS = 10 * 60 * 1000;

/**
 * Note a "Continue with Google" click in this tab, so the `?code=` it comes
 * back with counts as a Google sign-in. A magic link returns the same code,
 * which is why the code alone cannot say.
 */
export function markGoogleSignIn(now = Date.now()): void {
  try {
    sessionStorage.setItem(GOOGLE_KEY, String(now));
  } catch {
    // No sessionStorage: the sign-in still works, it just goes uncounted.
  }
}

/** Whether a recent Google click is pending here; clears the note. */
export function takeGoogleSignIn(now = Date.now()): boolean {
  try {
    const at = Number(sessionStorage.getItem(GOOGLE_KEY));
    sessionStorage.removeItem(GOOGLE_KEY);
    return at > 0 && now - at < GOOGLE_TTL_MS;
  } catch {
    return false;
  }
}
