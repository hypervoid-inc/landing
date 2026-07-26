import { betaSignupSchema } from "../../shared/beta-signup-schema";
import type { BetaSignupEnv, PagesFunction } from "../types";

const MAX_BODY_BYTES = 8 * 1024;
const TURNSTILE_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const INSERT_SIGNUP = `
  INSERT INTO beta_signups (email, cta_source, referral, referral_other, expires_at)
  VALUES (?, ?, ?, ?, datetime('now', '+180 days'))
  ON CONFLICT(email) DO NOTHING
`;

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

  const parsed = betaSignupSchema.safeParse(body);
  if (!parsed.success) return error(400, "invalid_request");
  if (parsed.data.honeypot?.trim()) return json({ ok: true });

  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  const expectedHostname =
    env.TURNSTILE_EXPECTED_HOSTNAME?.trim().toLowerCase();
  const expectedAction = env.TURNSTILE_EXPECTED_ACTION?.trim() || "beta_signup";
  const allowedOriginHostname =
    env.ALLOWED_ORIGIN_HOSTNAME?.trim().toLowerCase() || expectedHostname;
  if (!secret || !expectedHostname || !env.DB) {
    return error(500, "internal_error", "Unable to process request");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).hostname.toLowerCase() !== allowedOriginHostname) {
        return error(403, "origin_rejected");
      }
    } catch {
      return error(403, "origin_rejected");
    }
  }

  const verificationRequest = new URLSearchParams({
    secret,
    response: parsed.data.turnstileToken,
  });
  const clientIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (clientIp) verificationRequest.set("remoteip", clientIp);

  let verification: unknown;
  try {
    const response = await fetch(TURNSTILE_URL, {
      method: "POST",
      body: verificationRequest,
    });
    if (!response.ok) {
      return error(500, "internal_error", "Unable to process request");
    }
    verification = await response.json();
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }

  if (
    !verification ||
    typeof verification !== "object" ||
    !("success" in verification) ||
    verification.success !== true
  ) {
    return error(403, "verification_failed");
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
    return error(403, "verification_failed");
  }

  try {
    const result = await env.DB.prepare(INSERT_SIGNUP)
      .bind(
        parsed.data.email,
        parsed.data.ctaSource,
        parsed.data.referral,
        parsed.data.referral === "other" ? parsed.data.referralOther : null,
      )
      .run();
    if (!result.success) {
      return error(500, "internal_error", "Unable to process request");
    }
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }

  return json({ ok: true });
};
