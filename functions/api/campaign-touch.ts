/**
 * Resolve Listmonk subscriber UUID → email and identify in PostHog.
 * First-party only; opaque miss responses; no email logging.
 */

import { findSubscriberEmailByUuid } from "../listmonk";
import { captureCampaignTouch } from "../posthog";
import type { BetaSignupEnv, PagesFunction } from "../types";

const MAX_BODY_BYTES = 2 * 1024;
const ATTR_VALUE = /^[A-Za-z0-9._~-]{1,64}$/;
const PATH_VALUE = /^\/[A-Za-z0-9._~\-/]{0,127}$/;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function error(
  status: number,
  code: string,
  message = "Request rejected",
  headers?: HeadersInit,
) {
  return json({ error: { code, message } }, status, headers);
}

/** Opaque miss — same shape for invalid UUID, unknown subscriber, or lookup fail. */
function notFound() {
  return error(404, "not_found");
}

function cleanAttr(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return ATTR_VALUE.test(trimmed) ? trimmed : undefined;
}

function cleanPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return PATH_VALUE.test(trimmed) ? trimmed : undefined;
}

async function readSmallBody(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_BODY_BYTES) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) return body + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
}

export const onRequest: PagesFunction<BetaSignupEnv> = async ({
  request,
  env,
  waitUntil,
}) => {
  if (request.method !== "POST") {
    return error(405, "method_not_allowed", "Request rejected", {
      Allow: "POST",
    });
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")
    .at(0)
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return error(415, "unsupported_media_type");
  }

  const allowedOriginHostname =
    env.ALLOWED_ORIGIN_HOSTNAME?.trim().toLowerCase() ||
    env.TURNSTILE_EXPECTED_HOSTNAME?.trim().toLowerCase();
  const origin = request.headers.get("origin");
  if (!allowedOriginHostname || !origin) {
    return error(403, "origin_rejected");
  }
  try {
    if (new URL(origin).hostname.toLowerCase() !== allowedOriginHostname) {
      return error(403, "origin_rejected");
    }
  } catch {
    return error(403, "origin_rejected");
  }

  let rawBody: string | null;
  try {
    rawBody = await readSmallBody(request);
  } catch {
    return error(400, "invalid_request");
  }
  if (rawBody === null) return error(413, "payload_too_large");

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return error(400, "invalid_request");
  }
  if (!body || typeof body !== "object") return notFound();

  const record = body as Record<string, unknown>;
  const sid = typeof record.sid === "string" ? record.sid.trim() : "";
  if (!sid) return notFound();

  const email = await findSubscriberEmailByUuid(env, sid);
  if (!email) return notFound();

  const properties: Record<string, string | number> = {
    campaign_ref: "mailinglist",
    utm_source: "newsletter",
    utm_medium: "email",
  };
  const utmCampaign = cleanAttr(record.utm_campaign);
  const utmContent = cleanAttr(record.utm_content);
  const landingPath = cleanPath(record.landing_path);
  if (utmCampaign) properties.utm_campaign = utmCampaign;
  if (utmContent) properties.utm_content = utmContent;
  if (landingPath) properties.campaign_landing_path = landingPath;

  // Keep the isolate alive until PostHog ingest finishes (client may be adblocked).
  const capture = captureCampaignTouch(env, email, properties);
  if (waitUntil) waitUntil(capture);
  else await capture;

  return json({ email });
};
