import { canonicalRoutes, siteUrl } from "../../lib/route-manifest";

type AnalyticsEvent = {
  event: string;
  properties?: Record<string, unknown>;
};

const canonicalPaths = new Set(
  canonicalRoutes.map((route) => (route.path === "/" ? "/" : `${route.path}/`)),
);

export function sanitizePathname(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value, siteUrl);
    return canonicalPaths.has(url.pathname) ? url.pathname : "/404/";
  } catch {
    return "/404/";
  }
}

export function sanitizeUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const pathname = sanitizePathname(value);
  return typeof pathname === "string" ? `${siteUrl}${pathname}` : pathname;
}

function referrerOrigin(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function sanitizeEvent<T extends AnalyticsEvent>(event: T): T {
  if (!event.properties) return event;
  return {
    ...event,
    properties: {
      ...event.properties,
      $current_url: sanitizeUrl(event.properties.$current_url),
      $pathname: sanitizePathname(event.properties.$pathname),
      $referrer: referrerOrigin(event.properties.$referrer),
    },
  };
}
