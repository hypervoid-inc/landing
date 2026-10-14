import {
  betaSignupSchema,
  type BetaSignup,
  type SignupMeta,
} from "../../shared/beta-signup-schema";
import { insertSignup, pushSignupToListmonk } from "../signups";
import { verifyTurnstile } from "../turnstile";
import type { BetaSignupEnv, PagesFunction } from "../types";

const MAX_BODY_BYTES = 8 * 1024;

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Construct API server ingest, Bearer or X-Construct-Signup-Ingest. */
function isIngestAuthorized(request: Request, env: BetaSignupEnv): boolean {
  const expected = env.SIGNUP_INGEST_SECRET?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  const bearer =
    auth && /^bearer\s+/i.test(auth) ? auth.replace(/^bearer\s+/i, "").trim() : "";
  const header = request.headers.get("x-construct-signup-ingest")?.trim() ?? "";
  const provided = bearer || header;
  if (!provided) return false;
  return timingSafeEqualString(provided, expected);
}

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

/** Browser posts may only carry campaign/utm fields, strip identity spoof keys. */
function stripPrivilegedBrowserMeta(data: BetaSignup): BetaSignup {
  if (!data.meta) return data;
  const campaign = { ...data.meta };
  delete campaign.constructUserId;
  delete campaign.authProvider;
  delete campaign.subscribedVia;
  delete campaign.username;
  const meta: SignupMeta | undefined =
    Object.keys(campaign).length > 0 ? campaign : undefined;
  return { ...data, meta };
}

async function persistSignup(
  env: BetaSignupEnv,
  data: BetaSignup,
): Promise<{ error: Response } | { listmonk: boolean }> {
  if (!(await insertSignup(env, data))) {
    return {
      error: error(500, "internal_error", "Unable to process request"),
    };
  }
  return { listmonk: await pushSignupToListmonk(env, data) };
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
  if (parsed.data.honeypot?.trim()) return json({ ok: true, listmonk: true });

  if (!env.DB) {
    return error(500, "internal_error", "Unable to process request");
  }

  const ingestOk = isIngestAuthorized(request, env);
  if (ingestOk) {
    const result = await persistSignup(env, parsed.data);
    if ("error" in result) return result.error;
    return json({ ok: true, listmonk: result.listmonk });
  }

  if (!parsed.data.turnstileToken) {
    const secret = env.TURNSTILE_SECRET_KEY?.trim();
    const expectedHostname = env.TURNSTILE_EXPECTED_HOSTNAME?.trim();
    if (!secret || !expectedHostname) {
      return error(500, "internal_error", "Unable to process request");
    }
    return error(400, "invalid_request");
  }

  const outcome = await verifyTurnstile(env, request, parsed.data.turnstileToken);
  if (outcome === "unconfigured" || outcome === "unavailable") {
    return error(500, "internal_error", "Unable to process request");
  }
  if (outcome === "origin_rejected") return error(403, "origin_rejected");
  if (outcome === "failed") return error(403, "verification_failed");

  const result = await persistSignup(env, stripPrivilegedBrowserMeta(parsed.data));
  if ("error" in result) return result.error;
  return json({ ok: true, listmonk: result.listmonk });
};
