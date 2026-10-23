import {
  DECK_PDF_MAX_BYTES,
  DECK_PDF_PATH,
  DECK_SENDS_PER_DAY,
  DECK_SENDS_PER_EMAIL_PER_DAY,
  DECK_SENDS_PER_IP_PER_HOUR,
  deckSendRequestSchema,
  type DeckSendResponse,
} from "../../../shared/deck-schema";
import { isDeliverableEmail } from "../../../shared/deliverable-email";
import { recipientForEmail, sendDeckEmail } from "../../deck-email";
import { keyedHash } from "../../embed-session";
import { error, json, readJsonBody } from "../../http";
import { verifyTurnstile } from "../../turnstile";
import type { DeckEnv, PagesFunction } from "../../types";

/**
 * `POST /api/deck/send`: the investor deck's "Download PDF". An email and a
 * Turnstile check send the deck PDF to that address from
 * hello@construct.computer (`deck-email.ts`), with a link back to the live
 * deck tagged `?r=`: the one the reader came with, or else one made for this
 * address, the same every time and naming nobody. The reply carries it so the
 * page can put it on the reader's PostHog person. Limited per address, per
 * connection and in all, counted by keyed hashes in D1.
 */

const COUNT_RECENT = `
  SELECT
    (SELECT COUNT(*) FROM deck_sends WHERE email_hash = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')) AS by_email,
    (SELECT COUNT(*) FROM deck_sends WHERE ip_hash = ?2 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')) AS by_ip,
    (SELECT COUNT(*) FROM deck_sends WHERE created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')) AS in_all
`;
const INSERT_SEND = `INSERT INTO deck_sends (email_hash, ip_hash) VALUES (?1, ?2)`;
/** Rows older than two days have nothing left to count against. */
const PRUNE = `DELETE FROM deck_sends WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')`;

type Counts = { by_email: number; by_ip: number; in_all: number };

export const onRequest: PagesFunction<DeckEnv> = async ({ request, env, waitUntil }) => {
  const read = await readJsonBody(request, 8 * 1024);
  if ("response" in read) return read.response;

  const parsed = deckSendRequestSchema.safeParse(read.body);
  if (!parsed.success) return error(400, "invalid_request");
  const { email, turnstileToken, r, honeypot } = parsed.data;

  const secret = env.EMBED_SESSION_SECRET?.trim();
  if (!secret || !env.DB || !env.ASSETS) {
    return error(500, "internal_error", "Unable to process request");
  }

  // A filled honeypot looks sent and sends nothing.
  if (honeypot?.trim()) {
    const reply: DeckSendResponse = { ok: true };
    return json(reply);
  }

  const outcome = await verifyTurnstile(env, request, turnstileToken);
  if (outcome === "unconfigured" || outcome === "unavailable") {
    return error(500, "internal_error", "Unable to process request");
  }
  if (outcome === "origin_rejected") return error(403, "origin_rejected");
  if (outcome === "failed") return error(403, "verification_failed");

  if (!isDeliverableEmail(email)) return error(400, "undeliverable_email");

  const emailHash = await keyedHash(secret, "email", email);
  const clientIp = request.headers.get("CF-Connecting-IP")?.trim() ?? "";
  const ipHash = clientIp ? await keyedHash(secret, "ip", clientIp) : null;

  let counts: Counts | null;
  try {
    counts = await env.DB.prepare(COUNT_RECENT).bind(emailHash, ipHash).first<Counts>();
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }
  if (
    Number(counts?.by_email ?? 0) >= DECK_SENDS_PER_EMAIL_PER_DAY ||
    (ipHash && Number(counts?.by_ip ?? 0) >= DECK_SENDS_PER_IP_PER_HOUR) ||
    Number(counts?.in_all ?? 0) >= DECK_SENDS_PER_DAY
  ) {
    return error(429, "too_many_requests", "Try again a little later", { "Retry-After": "3600" });
  }

  let pdf: Uint8Array;
  try {
    const file = await env.ASSETS.fetch(new URL(DECK_PDF_PATH, request.url));
    if (!file.ok) throw new Error(`status ${file.status}`);
    pdf = new Uint8Array(await file.arrayBuffer());
  } catch {
    console.error("deck_email failed: PDF unavailable");
    return error(500, "internal_error", "Unable to process request");
  }
  if (pdf.byteLength > DECK_PDF_MAX_BYTES) {
    console.error("deck_email failed: PDF over the size limit");
    return error(500, "internal_error", "Unable to process request");
  }

  const recipient = r ?? (await recipientForEmail(secret, email));
  if (!(await sendDeckEmail(env, email, recipient, pdf))) {
    return error(502, "email_failed", "The email didn't go out");
  }

  const record = env.DB.prepare(INSERT_SEND)
    .bind(emailHash, ipHash)
    .run()
    .then(() => env.DB.prepare(PRUNE).run())
    .catch(() => console.error("deck_send record failed"));
  if (waitUntil) waitUntil(record);
  else await record;

  const reply: DeckSendResponse = { ok: true, r: recipient };
  return json(reply);
};
