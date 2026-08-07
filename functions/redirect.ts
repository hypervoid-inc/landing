import type { PagesFunction } from "./types";

const MAX_PARAM_LENGTH = 2048;

function reject(status: number): Response {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

function asHttpUrl(value: string): string | null {
  try {
    const target = new URL(value);
    if (target.protocol !== "https:" && target.protocol !== "http:") return null;
    return target.toString();
  } catch {
    return null;
  }
}

function asBase64Url(value: string): string | null {
  const normalized = value.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/")).replace(/\s/g, "");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (!/^[A-Za-z0-9+/=]+$/.test(padded)) return null;
  try {
    return asHttpUrl(atob(padded));
  } catch {
    return null;
  }
}

export const onRequest: PagesFunction<unknown> = ({ request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return reject(405);
  }

  const raw = new URL(request.url).searchParams.get("p");
  if (!raw || raw.length > MAX_PARAM_LENGTH) return reject(400);

  const target = asHttpUrl(raw) ?? asBase64Url(raw);
  if (!target) return reject(400);

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
};