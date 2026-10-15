import { cookieDomainAttribute } from "../analytics/campaign-attribution";
import { getAppOrigin, getAppUrl, getOsOrigin } from "../../platform/env";

/**
 * The two ways into Construct: the desktop (Construct OS, feels like a Mac)
 * and the dashboard (Zen Mode, works on a phone). Same account, same agents.
 */
export type Shell = "desktop" | "dashboard";

/**
 * Which one this browser last opened from `/app/`, so the chooser can mark it
 * "Last used". Set on `.construct.computer` so the apps could read it too;
 * nothing opens automatically because of it.
 */
export const SHELL_COOKIE_NAME = "construct_shell";
const SHELL_COOKIE_MAX_AGE_SECONDS = 31_536_000;

export function parseShellCookie(cookie: string): Shell | null {
  const value = cookie
    .split("; ")
    .find((row) => row.startsWith(`${SHELL_COOKIE_NAME}=`))
    ?.slice(SHELL_COOKIE_NAME.length + 1);
  return value === "desktop" || value === "dashboard" ? value : null;
}

export function serializeShellCookie(shell: Shell, hostname: string): string {
  return (
    `${SHELL_COOKIE_NAME}=${shell}${cookieDomainAttribute(hostname)}` +
    `; Path=/; Max-Age=${SHELL_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax; Secure`
  );
}

/** Where each shell opens, carrying `?prompt=` through when the link had one. */
export function shellUrl(shell: Shell, prompt?: string | null): string {
  const origin = shell === "desktop" ? getOsOrigin() : getAppOrigin();
  return getAppUrl(prompt ?? undefined, origin);
}
