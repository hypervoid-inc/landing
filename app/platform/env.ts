/** Construct API origin (cookie SSO host). */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN?.trim();
  return (raw || "https://api.construct.computer").replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`;
}

/**
 * Where "open the app" goes: the Construct dashboard, the shell the product
 * leads with and the only one that runs on a phone. The desktop shell lives at
 * `getOsOrigin()`, and only the chooser at `/app/` offers it.
 */
export function getAppOrigin(): string {
  const raw = import.meta.env.VITE_APP_ORIGIN?.trim();
  return (raw || "https://app.construct.computer").replace(/\/$/, "");
}

/**
 * The desktop shell, Construct OS. It needs a laptop-sized screen, so the
 * site names it in one place, the chooser at `/app/`.
 */
export function getOsOrigin(): string {
  const raw = import.meta.env.VITE_OS_ORIGIN?.trim();
  return (raw || "https://os.construct.computer").replace(/\/$/, "");
}

/** The longest prompt a link carries; the app refuses anything longer. */
export const APP_PROMPT_MAX_CHARS = 4000;

/**
 * The app, opened on a prompt when one is given. The app shows the prompt
 * and asks which agent should run it before anything is sent, so a link can
 * suggest work but never start it. Both shells read `?prompt=` the same way.
 */
export function getAppUrl(prompt?: string, origin = getAppOrigin()): string {
  const text = prompt?.trim().slice(0, APP_PROMPT_MAX_CHARS);
  return text ? `${origin}/?prompt=${encodeURIComponent(text)}` : origin;
}

export function getTurnstileSiteKey(): string | undefined {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  return key || undefined;
}

export function getReturnOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://construct.computer";
}
