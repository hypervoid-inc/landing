import { z } from "zod";

/**
 * The live demo inside an X post (`/embed/`): the wire shapes shared by the
 * Pages Functions and the page, and the limits that make the demo worthless
 * as a free model endpoint. A session is eight short turns on a toy desktop
 * with four tools; nothing here can write an essay or reach the internet.
 */

/** Turns one lead gets per session. */
export const EMBED_MAX_TURNS = 8;
/** The longest message a turn accepts, a post's worth. */
export const EMBED_MAX_MESSAGE_CHARS = 280;
/** How many earlier exchanges ride along with a turn. */
export const EMBED_MAX_HISTORY = 6;
export const EMBED_MAX_HISTORY_CHARS = 320;
/**
 * Sessions per address an hour: a brake on scripts, not on people. Phone
 * carriers and offices put many viewers behind one address, and the daily
 * caps bound the cost whatever the traffic.
 */
export const EMBED_SESSIONS_PER_IP_PER_HOUR = 20;
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

export const embedHistoryEntrySchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(EMBED_MAX_HISTORY_CHARS),
  })
  .strict();

export const embedTurnRequestSchema = z
  .object({
    token: z.string().min(16).max(512),
    message: z.string().trim().min(1).max(EMBED_MAX_MESSAGE_CHARS),
    history: z.array(embedHistoryEntrySchema).max(EMBED_MAX_HISTORY).default([]),
  })
  .strict();

export type EmbedTurnRequest = z.infer<typeof embedTurnRequestSchema>;
export type EmbedHistoryEntry = z.infer<typeof embedHistoryEntrySchema>;

/** The toy desktop's week, plus the two words people actually use. */
export const EMBED_DAYS = [
  "today",
  "tomorrow",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type EmbedDay = (typeof EMBED_DAYS)[number];

export const EMBED_MOODS = ["happy", "neutral", "thinking"] as const;
export type EmbedMood = (typeof EMBED_MOODS)[number];

const title = z.string().trim().min(1).max(60);

export const embedActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("note"),
    title,
    body: z.string().trim().min(1).max(700),
  }),
  z.object({
    type: z.literal("event"),
    title,
    day: z.enum(EMBED_DAYS),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
  z.object({
    type: z.literal("tasks"),
    title,
    items: z.array(z.string().trim().min(1).max(90)).min(1).max(7),
  }),
  z.object({
    type: z.literal("email"),
    to: z.string().trim().min(1).max(80),
    subject: z.string().trim().min(1).max(90),
    body: z.string().trim().min(1).max(600),
  }),
]);

export type EmbedAction = z.infer<typeof embedActionSchema>;

export const embedReplySchema = z.object({
  say: z.string().trim().min(1).max(260),
  mood: z.enum(EMBED_MOODS),
  actions: z.array(embedActionSchema).max(4),
});

export type EmbedReply = z.infer<typeof embedReplySchema>;

/**
 * The model's answer, read leniently: a reply with one malformed action keeps
 * the rest, a missing mood reads as happy, and only a reply with nothing to
 * say is rejected. Returns null when nothing usable came back.
 */
export function normalizeEmbedReply(raw: unknown): EmbedReply | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const say =
    typeof record.say === "string" ? record.say.trim().slice(0, 260) : "";
  if (!say) return null;
  const mood = EMBED_MOODS.includes(record.mood as EmbedMood)
    ? (record.mood as EmbedMood)
    : "happy";
  const actions: EmbedAction[] = [];
  if (Array.isArray(record.actions)) {
    for (const candidate of record.actions) {
      if (actions.length === 4) break;
      const parsed = embedActionSchema.safeParse(candidate);
      if (parsed.success) actions.push(parsed.data);
    }
  }
  return { say, mood, actions };
}

export type EmbedSessionResponse = {
  ok: true;
  token: string;
  firstName: string;
  turnsLeft: number;
};

export type EmbedTurnResponse = {
  ok: true;
  reply: EmbedReply;
  turnsLeft: number;
};

export type EmbedErrorCode =
  | "invalid_request"
  | "verification_failed"
  | "origin_rejected"
  | "too_many_sessions"
  | "demo_full"
  | "session_expired"
  | "turns_exhausted"
  | "model_unavailable"
  | "internal_error";
