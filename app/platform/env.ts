/** Construct API origin (cookie SSO host). */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN?.trim();
  return (raw || "https://api.construct.computer").replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`;
}

export function getOsOrigin(): string {
  const raw = import.meta.env.VITE_OS_ORIGIN?.trim();
  return (raw || "https://os.construct.computer").replace(/\/$/, "");
}

export function getTurnstileSiteKey(): string | undefined {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  return key || undefined;
}

export function getReturnOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://construct.computer";
}
