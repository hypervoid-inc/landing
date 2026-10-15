import { z } from "zod";

/**
 * The playable show inside an X post (`/embed/`): the wire shapes shared by
 * the Pages Functions and the page, and the limits on sessions. A session is
 * a viewer's first name and the post they came from; the email comes later,
 * through the claim, as the exit offer.
 */

/**
 * Sessions per address an hour. Each session can send one claim email, so
 * this also bounds how much mail one address can trigger. It is low on
 * purpose; viewers sharing a carrier or office address may hit it, and the
 * session reply then says "too many demos from this connection".
 */
export const EMBED_SESSIONS_PER_IP_PER_HOUR = 5;
/** A session token's life, in seconds. */
export const EMBED_SESSION_TTL_SECONDS = 2 * 60 * 60;

/** Where the player URL says the viewer came from: a post slug or `home`. */
export const embedSourceSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/i)
  .default("home");

export const embedSessionRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    src: embedSourceSchema,
    turnstileToken: z.string().min(1).max(2048),
    honeypot: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    // A first name: letters in it, and not an email pasted in the wrong box.
    if (!/[a-z]/i.test(value.name) || value.name.includes("@")) {
      context.addIssue({ code: "custom", path: ["name"], message: "A name is required" });
    }
  });

export type EmbedSessionRequest = z.infer<typeof embedSessionRequestSchema>;

/** The exit offer: the session's token and the email the code goes to. */
export const embedClaimRequestSchema = z
  .object({
    token: z.string().min(16).max(512),
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(2).max(80).optional(),
  })
  .strict();

export type EmbedClaimRequest = z.infer<typeof embedClaimRequestSchema>;

export type EmbedClaimResponse = {
  ok: true;
  /** The promo code for a free first month of the top plan. */
  code: string;
};

export type EmbedSessionResponse = {
  ok: true;
  token: string;
  firstName: string;
};

export type EmbedErrorCode =
  | "invalid_request"
  | "verification_failed"
  | "origin_rejected"
  | "too_many_sessions"
  | "demo_full"
  | "session_expired"
  | "internal_error";
