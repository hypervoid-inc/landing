import type { BetaSignup } from "../../../shared/beta-signup-schema";
import { embedClaimRequestSchema, type EmbedClaimResponse } from "../../../shared/embed-schema";
import { sendClaimEmail } from "../../claim-email";
import { keyedHash, verifySessionToken } from "../../embed-session";
import { error, json, readJsonBody } from "../../http";
import { isLegitPersonName } from "../../../shared/person-name";
import { pushSignupToListmonk } from "../../signups";
import type { EmbedEnv, PagesFunction } from "../../types";

/**
 * `POST /api/embed/claim`: the exit offer. A live session hands over an
 * email and gets the promo code for a free first month of the top plan;
 * the email is subscribed to the newsletter in Listmonk, tagged with the
 * post that sent them, and the code goes out by email too
 * (`claim-email.ts`). A
 * session claims once; asking again returns the same code and sends nothing.
 */

const DEFAULT_CODE = "FREEMONTH";

const READ_SESSION = `SELECT src, claimed_at FROM embed_sessions WHERE id = ?1 AND expires_at > datetime('now')`;
const CLAIM = `
  UPDATE embed_sessions
  SET email_hash = ?2, claimed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = ?1 AND claimed_at IS NULL
`;

export const onRequest: PagesFunction<EmbedEnv> = async ({ request, env, waitUntil }) => {
  const read = await readJsonBody(request, 8 * 1024);
  if ("response" in read) return read.response;

  const parsed = embedClaimRequestSchema.safeParse(read.body);
  if (!parsed.success) return error(400, "invalid_request");
  const { token, email, name, job } = parsed.data;

  const secret = env.EMBED_SESSION_SECRET?.trim();
  if (!secret || !env.DB) {
    return error(500, "internal_error", "Unable to process request");
  }
  const claims = await verifySessionToken(secret, token);
  if (!claims) return error(401, "session_expired", "Start the demo again");

  let row: { src: string; claimed_at: string | null } | null;
  try {
    row = await env.DB.prepare(READ_SESSION).bind(claims.sid).first<{ src: string; claimed_at: string | null }>();
  } catch {
    return error(500, "internal_error", "Unable to process request");
  }
  if (!row) return error(401, "session_expired", "Start the demo again");

  const code = env.EMBED_PROMO_CODE?.trim() || DEFAULT_CODE;
  const reply: EmbedClaimResponse = { ok: true, code };
  if (row.claimed_at) return json(reply);

  const lead: BetaSignup = {
    email,
    // Listmonk refuses a name that looks like the address (a bot tell on the
    // footer form), and it is the only place this lead is kept, so a first
    // name like "ada" for ada@example.com falls back to the show's "Friend".
    name: name && isLegitPersonName(name, email) ? name : "Friend",
    ctaSource: "embed-x",
    referral: "twitter",
    meta: {
      subscribedVia: "x_embed",
      utmSource: "x",
      utmMedium: "player",
      utmCampaign: row.src,
      utmContent: code,
      landingPath: "/embed/",
    },
  };
  // The code is already earned, so a Listmonk hiccup never takes it away;
  // the subscribe runs after the reply.
  const push = pushSignupToListmonk(env, lead).then((ok) => {
    if (!ok) console.error("claim newsletter subscribe failed");
  });
  if (waitUntil) waitUntil(push);
  else await push;

  const emailHash = await keyedHash(secret, "email", email);
  const claimed = await env.DB.prepare(CLAIM)
    .bind(claims.sid, emailHash)
    .run()
    .catch(() => null);
  // Only the request that actually marked the session sends the email, so a
  // double click or a retry never sends two.
  if (claimed?.success && claimed.meta?.changes !== 0) {
    const send = sendClaimEmail(env, { to: email, firstName: name, code, src: row.src, ...(job ? { job } : {}) });
    if (waitUntil) waitUntil(send);
    else await send;
  }
  return json(reply);
};
