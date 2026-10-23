import { slides } from "../../../app/features/deck/slides.ts";
import {
  DECK_PING_EVENTS_PER_VISIT,
  DECK_PINGS_PER_DAY,
  DECK_PINGS_PER_IP_PER_HOUR,
  deckPingRequestSchema,
} from "../../../shared/deck-schema";
import { deckEventMessage, deckPingMessage, type DiscordMessage, type Place } from "../../deck-ping-message";
import { keyedHash } from "../../embed-session";
import { error, json, readJsonBody } from "../../http";
import type { DeckEnv, PagesFunction } from "../../types";
import { describeDevice } from "../../user-agent";

/**
 * `POST /api/deck/ping`: a deck visit, told to Discord as it happens. The page
 * sends one ping on opening and more as the reader goes (deck-ping.ts); the
 * first posts a message to the DECK_DISCORD_WEBHOOK_URL channel, the rest edit
 * it, found by the page's visit id in D1. A ping that carries a moment (PDF
 * sent, finished, closed...) also posts a message of its own, since edits
 * notify nobody. Location and network come from
 * Cloudflare's view of the request; the address and the User-Agent header
 * themselves are never kept or sent on.
 */

const READ = `SELECT message_id FROM deck_pings WHERE visit_id = ?1`;
const COUNT_RECENT = `
  SELECT
    (SELECT COUNT(*) FROM deck_pings WHERE ip_hash = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')) AS by_ip,
    (SELECT COUNT(*) FROM deck_pings WHERE created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')) AS in_all
`;
const RECORD = `
  INSERT INTO deck_pings (visit_id, message_id, ip_hash) VALUES (?1, ?2, ?3)
  ON CONFLICT(visit_id) DO UPDATE SET message_id = excluded.message_id
`;
/** Counts a moment against its visit; no change means the visit has posted its share. */
const COUNT_EVENT = `UPDATE deck_pings SET events = events + 1 WHERE visit_id = ?1 AND events < ?2`;
/** Rows older than two days have nothing left to edit or count. */
const PRUNE = `DELETE FROM deck_pings WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')`;

const WEBHOOK = /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

type Counts = { by_ip: number; in_all: number };

export const onRequest: PagesFunction<DeckEnv> = async ({ request, env, waitUntil }) => {
  const read = await readJsonBody(request, 16 * 1024);
  if ("response" in read) return read.response;

  const parsed = deckPingRequestSchema.safeParse(read.body);
  if (!parsed.success) return error(400, "invalid_request");
  const { visitId, context, summary, event, detail } = parsed.data;

  const webhook = env.DECK_DISCORD_WEBHOOK_URL?.trim().replace(/\?.*$/, "").replace(/\/$/, "");
  if (!webhook || !WEBHOOK.test(webhook)) return json({ ok: true });

  // Only the deck page itself may post to the channel.
  const allowed = (env.ALLOWED_ORIGIN_HOSTNAME || env.TURNSTILE_EXPECTED_HOSTNAME || "").trim().toLowerCase();
  let origin = "";
  try {
    origin = new URL(request.headers.get("origin") ?? "").hostname.toLowerCase();
  } catch {
    // No or unparseable Origin: refused below.
  }
  if (!allowed || (origin !== allowed && origin !== `www.${allowed}`)) return error(403, "origin_rejected");

  const device = describeDevice(request.headers.get("user-agent"));
  if (device.bot) return json({ ok: true });

  const secret = env.EMBED_SESSION_SECRET?.trim();
  if (!secret || !env.DB) return error(500, "internal_error", "Unable to process request");

  const cf = (request as Request & { cf?: Place & { asn?: number } }).cf ?? {};
  const shared = {
    context,
    ...(summary ? { summary } : {}),
    place: {
      city: cf.city,
      region: cf.region,
      country: cf.country,
      timezone: cf.timezone,
      asOrganization: cf.asOrganization,
      asn: cf.asn,
    },
    device,
    titles: slides.map((slide) => slide.title),
  };
  const message = deckPingMessage(shared);

  let existing: { message_id: string } | null;
  try {
    existing = await env.DB.prepare(READ).bind(visitId).first<{ message_id: string }>();
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }

  // The visit's card: edited in place once it exists.
  let carded = false;
  if (existing) {
    const edited = await discord(`${webhook}/messages/${encodeURIComponent(existing.message_id)}`, "PATCH", message);
    // Deleted in Discord: start the visit a fresh message.
    carded = edited.status !== 404;
  }

  if (!carded) {
    const clientIp = request.headers.get("CF-Connecting-IP")?.trim() ?? "";
    const ipHash = clientIp ? await keyedHash(secret, "ip", clientIp) : null;
    if (!existing) {
      let counts: Counts | null;
      try {
        counts = await env.DB.prepare(COUNT_RECENT).bind(ipHash).first<Counts>();
      } catch {
        return error(500, "internal_error", "Unable to process request");
      }
      if (
        (ipHash && Number(counts?.by_ip ?? 0) >= DECK_PINGS_PER_IP_PER_HOUR) ||
        Number(counts?.in_all ?? 0) >= DECK_PINGS_PER_DAY
      ) {
        return error(429, "too_many_requests", "Try again a little later", { "Retry-After": "3600" });
      }
    }

    const posted = await discord(`${webhook}?wait=true`, "POST", message);
    const id = posted.ok ? ((await posted.json().catch(() => null)) as { id?: string } | null)?.id : undefined;
    if (!id) return json({ ok: false });
    // Waited for, so a moment in this same ping can be counted against the row.
    await env.DB.prepare(RECORD)
      .bind(visitId, id, ipHash)
      .run()
      .catch(() => console.error("deck_ping record failed"));
    const prune = env.DB.prepare(PRUNE).run().catch(() => undefined);
    if (waitUntil) waitUntil(prune);
  }

  // A moment worth a notification gets a message of its own, a few per visit at most.
  if (event) {
    const counted = await env.DB.prepare(COUNT_EVENT)
      .bind(visitId, DECK_PING_EVENTS_PER_VISIT)
      .run()
      .catch(() => null);
    if (counted?.success && counted.meta?.changes) {
      await discord(webhook, "POST", deckEventMessage({ event, ...(detail ? { detail } : {}), ...shared }));
    }
  }
  return json({ ok: true });
};

/** One call to the webhook; never throws, a failure is a status. */
async function discord(url: string, method: "POST" | "PATCH", message: DiscordMessage): Promise<Response> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!response.ok && response.status !== 404) {
      console.error("deck_ping discord failed", { status: response.status, method });
    }
    return response;
  } catch {
    console.error("deck_ping discord failed: network");
    return new Response(null, { status: 599 });
  }
}
