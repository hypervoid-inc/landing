import type { BetaSignup } from "../../../shared/beta-signup-schema";
import { embedClaimRequestSchema, type EmbedClaimResponse } from "../../../shared/embed-schema";
import { keyedHash, verifySessionToken } from "../../embed-session";
import { error, json, readJsonBody } from "../../http";
import { insertSignup, pushSignupToListmonk } from "../../signups";
import type { EmbedEnv, PagesFunction } from "../../types";

/**
 * `POST /api/embed/claim`: the exit offer. A live session hands over an
 * email and gets the promo code for a free first month of the top plan;
 * the email becomes a lead the way every other form's does (the
 * `beta_signups` row and the Listmonk subscriber, tagged with the post that
 * sent them). A session claims once; asking again returns the same code.
 */

const DEFAULT_CODE = "FIRSTMONTH";

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
  const { token, email, name } = parsed.data;

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
    name: name && !name.includes("@") ? name : "Construct demo",
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
  if (!(await insertSignup(env, lead))) {
    return error(500, "internal_error", "Unable to process request");
  }
  const push = pushSignupToListmonk(env, lead);
  if (waitUntil) waitUntil(push);
  else await push;

  const emailHash = await keyedHash(secret, "email", email);
  await env.DB.prepare(CLAIM).bind(claims.sid, emailHash).run().catch(() => undefined);
  return json(reply);
};
