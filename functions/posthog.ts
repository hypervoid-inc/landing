/**
 * Minimal PostHog capture for Pages Functions.
 * Fail-open: never throws into the request path.
 */

import type { BetaSignupEnv } from "./types";

const DEFAULT_POSTHOG_HOST = "https://x.construct.computer";

export async function captureCampaignTouch(
  env: BetaSignupEnv,
  email: string,
  properties: Record<string, string | number>,
): Promise<void> {
  const projectKey = env.POSTHOG_PROJECT_KEY?.trim();
  if (!projectKey) return;

  const distinctId = email.trim().toLowerCase();
  if (!distinctId.includes("@")) return;

  const setOnce: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(properties)) {
    setOnce[`initial_${key}`] = value;
  }

  try {
    await fetch(
      new URL("/i/v0/e/", env.POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST).href,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: projectKey,
          event: "email_campaign_clicked",
          properties: {
            distinct_id: distinctId,
            email: distinctId,
            $set: { email: distinctId },
            ...(Object.keys(setOnce).length > 0 ? { $set_once: setOnce } : {}),
            ...properties,
          },
        }),
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch {
    // Product analytics must never affect product behavior.
  }
}
