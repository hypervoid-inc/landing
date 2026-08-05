/** Curated IANA zones for settings; browser zone is merged in at runtime. */
export const COMMON_IANA_TIMEZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Profile preference, else this device's zone, else UTC. */
export function resolveDisplayTimezone(preferred?: string | null): string {
  return preferred?.trim() || browserTimezone();
}

/** Readable cue for chrome (underscores → spaces). */
export function timezoneLabel(timezone: string): string {
  return timezone.replaceAll("_", " ");
}

export function timezoneSelectOptions(preferred?: string | null): Array<{
  value: string;
  label: string;
}> {
  const zones = new Set<string>(COMMON_IANA_TIMEZONES);
  const browser = browserTimezone();
  zones.add(browser);
  if (preferred) zones.add(preferred);
  return [...zones]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: value === browser ? `${value} (this device)` : value,
    }));
}

export function formatInTimezone(
  isoUtc: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  const ms = Date.parse(isoUtc);
  if (!Number.isFinite(ms)) return isoUtc;
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...options,
      timeZone: timezone,
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}
