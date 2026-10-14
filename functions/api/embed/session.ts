import {
  EMBED_SESSIONS_PER_IP_PER_HOUR,
  embedSessionRequestSchema,
  type EmbedSessionResponse,
} from "../../../shared/embed-schema";
import { keyedHash, mintSessionToken } from "../../embed-session";
import { error, json, readJsonBody } from "../../http";
import { verifyTurnstile } from "../../turnstile";
import type { EmbedEnv, PagesFunction } from "../../types";

/**
 * `POST /api/embed/session`: the show's first step. A first name and a
 * Turnstile check buy a short-lived session token. The email comes later,
 * through `claim.ts`, as the exit offer.
 */

const DEFAULT_DAILY_SESSION_CAP = 1500;

const COUNT_RECENT = `
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN ip_hash = ?1 AND created_at > datetime('now', '-1 hour') THEN 1 ELSE 0 END) AS by_ip
  FROM embed_sessions
  WHERE created_at > datetime('now', '-1 day')
`;

const INSERT_SESSION = `
  INSERT INTO embed_sessions (id, email_hash, ip_hash, src, expires_at)
  VALUES (?1, '', ?2, ?3, datetime('now', '+1 day'))
`;

/** Rows older than three days have nothing left to count against. */
const PRUNE = `DELETE FROM embed_sessions WHERE created_at < datetime('now', '-3 days')`;

function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const cased = first.charAt(0).toUpperCase() + first.slice(1);
  return cased.length > 24 ? `${cased.slice(0, 23)}.` : cased;
}

function dailySessionCap(env: EmbedEnv): number {
  const parsed = Number(env.EMBED_DAILY_SESSION_CAP);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_SESSION_CAP;
}

export const onRequest: PagesFunction<EmbedEnv> = async ({ request, env, waitUntil }) => {
  const read = await readJsonBody(request, 8 * 1024);
  if ("response" in read) return read.response;

  const parsed = embedSessionRequestSchema.safeParse(read.body);
  if (!parsed.success) return error(400, "invalid_request");
  const data = parsed.data;

  const secret = env.EMBED_SESSION_SECRET?.trim();
  if (!secret || !env.DB) {
    return error(500, "internal_error", "Unable to process request");
  }

  // A filled honeypot gets a token that opens nothing.
  if (data.honeypot?.trim()) {
    const reply: EmbedSessionResponse = {
      ok: true,
      token: crypto.randomUUID(),
      firstName: firstNameOf(data.name),
    };
    return json(reply);
  }

  const outcome = await verifyTurnstile(env, request, data.turnstileToken);
  if (outcome === "unconfigured" || outcome === "unavailable") {
    return error(500, "internal_error", "Unable to process request");
  }
  if (outcome === "origin_rejected") return error(403, "origin_rejected");
  if (outcome === "failed") return error(403, "verification_failed");

  const clientIp = request.headers.get("CF-Connecting-IP")?.trim() ?? "";
  const ipHash = clientIp ? await keyedHash(secret, "ip", clientIp) : null;

  let counts: { total: number; by_ip: number } | null;
  try {
    counts = await env.DB.prepare(COUNT_RECENT)
      .bind(ipHash ?? "")
      .first<{ total: number; by_ip: number }>();
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }
  if (Number(counts?.total ?? 0) >= dailySessionCap(env)) {
    return error(503, "demo_full", "The demo is full for today");
  }
  if (ipHash && Number(counts?.by_ip ?? 0) >= EMBED_SESSIONS_PER_IP_PER_HOUR) {
    return error(429, "too_many_sessions", "Try again a little later", { "Retry-After": "3600" });
  }

  const sid = crypto.randomUUID();
  try {
    const inserted = await env.DB.prepare(INSERT_SESSION).bind(sid, ipHash, data.src).run();
    if (!inserted.success) return error(500, "internal_error", "Unable to process request");
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }
  const prune = env.DB.prepare(PRUNE).run().catch(() => undefined);
  if (waitUntil) waitUntil(prune);

  const { token } = await mintSessionToken(secret, sid);
  const reply: EmbedSessionResponse = {
    ok: true,
    token,
    firstName: firstNameOf(data.name),
  };
  return json(reply);
};
