import { z } from "zod";

/**
 * The investor deck at /deck/: the PDF it emails and the limits on emailing
 * it (`functions/api/deck/send.ts`), shared by the function, the page and
 * `pnpm deck:slides`.
 */

/** Written by `pnpm deck:slides`, read by the function to attach. */
export const DECK_PDF_PATH = "/assets/deck/construct-computer-deck.pdf";
/** What the recipient's mail client shows. */
export const DECK_PDF_FILENAME = "Construct Computer deck.pdf";
/**
 * Cloudflare Email Service takes 5 MiB a message, attachments included and
 * base64 encoded (a third larger), so the PDF stays under 3.5 MiB.
 */
export const DECK_PDF_MAX_BYTES = 3.5 * 2 ** 20;

/** Sends to one address a day; a few for a lost email, never a stream. */
export const DECK_SENDS_PER_EMAIL_PER_DAY = 3;
/** Sends from one connection an hour. */
export const DECK_SENDS_PER_IP_PER_HOUR = 5;
/** Sends in all a day, so a broken Turnstile can't turn this into a mailer. */
export const DECK_SENDS_PER_DAY = 300;

/**
 * A deck link's `?r=`: who it was sent to, as an id or slug, never an email.
 * The same shape as the site's campaign `ref` (campaign-attribution.ts).
 */
export const DECK_RECIPIENT_PATTERN = /^[A-Za-z0-9._~-]{1,64}$/;

export const deckSendRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    turnstileToken: z.string().min(1).max(2048),
    /** The `?r=` the reader came with, so the emailed link keeps it. */
    r: z.string().regex(DECK_RECIPIENT_PATTERN).optional(),
    honeypot: z.string().max(200).optional(),
  })
  .strict();

export type DeckSendRequest = z.infer<typeof deckSendRequestSchema>;

/** `r` is the recipient id the emailed deck link carries. */
export type DeckSendResponse = { ok: true; r?: string };

/**
 * Visit alerts (`functions/api/deck/ping.ts`): one Discord message per deck
 * visit, edited as the reader goes. These cap how many new messages one
 * connection, and everyone together, can post.
 */
export const DECK_PINGS_PER_IP_PER_HOUR = 30;
export const DECK_PINGS_PER_DAY = 500;
/** How often a visit's message is refreshed while they read. */
export const DECK_PING_UPDATE_MS = 15_000;

/** Values off a query string or the browser, as short and plain as the attribution cookie's. */
export const DECK_TAG_PATTERN = /^[A-Za-z0-9._~-]{1,64}$/;
export const DECK_HOSTNAME_PATTERN = /^[a-z0-9.-]{1,253}$/;
export const DECK_LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;
export const DECK_TIMEZONE_PATTERN = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/;
/** PostHog's session ids are UUIDs (v7). */
export const DECK_SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const tag = z.string().regex(DECK_TAG_PATTERN);
const seconds = z.number().min(0).max(7 * 24 * 60 * 60);

/** Who opened the deck and how they got there, as the page sees it. */
export const deckPingContextSchema = z
  .object({
    r: z.string().regex(DECK_RECIPIENT_PATTERN).optional(),
    /** The referring site's hostname, never its path. */
    referrer: z.string().regex(DECK_HOSTNAME_PATTERN).optional(),
    utm: z
      .object({ source: tag, medium: tag, campaign: tag, content: tag, term: tag })
      .partial()
      .strict()
      .optional(),
    /** This browser's visit count, and when it last opened the deck. */
    visit: z.number().int().min(1).max(100_000),
    lastVisitAt: z.iso.datetime().optional(),
    openedAt: z.iso.datetime(),
    screen: z
      .object({ width: z.number().int().min(1).max(20_000), height: z.number().int().min(1).max(20_000) })
      .strict()
      .optional(),
    language: z.string().regex(DECK_LANGUAGE_PATTERN).optional(),
    timezone: z.string().max(64).regex(DECK_TIMEZONE_PATTERN).optional(),
    /** The PostHog session, for a link to its replay. */
    session: z.string().regex(DECK_SESSION_PATTERN).optional(),
    /** Who this browser already is, when it gave us an email before (a PDF request, a sign-in). */
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    version: z.string().regex(/^[0-9.a-z-]{1,32}$/),
  })
  .strict();

/** How the reading is going. */
export const deckPingSummarySchema = z
  .object({
    /** The tab was hidden or closed: they've left, for now. */
    final: z.boolean(),
    seconds,
    /** Visible seconds on each slide, in deck order. */
    slides: z.array(seconds).max(64),
    /** The slide they're on, from 1. */
    current: z.number().int().min(1).max(64).optional(),
    completed: z.boolean(),
    /** How far into each video they got, in percent; 0 for pressed play. */
    videos: z
      .object({ demo: z.number().int().min(0).max(100), launch: z.number().int().min(0).max(100) })
      .partial()
      .strict()
      .optional(),
    pdf: z.enum(["opened", "failed", "sent"]).optional(),
    /** The address the PDF went to; the team wants to know who asked for it. */
    pdfEmail: z.string().trim().toLowerCase().email().max(254).optional(),
    links: z.array(z.enum(["site", "try"])).max(4).optional(),
  })
  .strict();

export const deckPingRequestSchema = z
  .object({
    /** Made by the page for each visit; later pings edit the same message. */
    visitId: z.uuid(),
    context: deckPingContextSchema,
    summary: deckPingSummarySchema.optional(),
  })
  .strict();

export type DeckPingContext = z.infer<typeof deckPingContextSchema>;
export type DeckPingSummary = z.infer<typeof deckPingSummarySchema>;
export type DeckPingRequest = z.infer<typeof deckPingRequestSchema>;
