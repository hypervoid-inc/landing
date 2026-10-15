export type BetaSignupEnv = {
  DB: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        run(): Promise<{ success: boolean }>;
      };
    };
  };
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_EXPECTED_HOSTNAME: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  TURNSTILE_TEST_MODE?: string;
  ALLOWED_ORIGIN_HOSTNAME?: string;
  /** Base URL for Listmonk (no trailing slash). Empty skips the newsletter push. */
  LISTMONK_BASE_URL?: string;
  /** Public Newsletter list UUID (public API fallback + list lookup). */
  LISTMONK_NEWSLETTER_LIST_UUID?: string;
  /** Numeric list ID for the private subscribers API (optional if UUID resolves). */
  LISTMONK_NEWSLETTER_LIST_ID?: string;
  /** Listmonk API user, enables attribs via private /api/subscribers. */
  LISTMONK_API_USER?: string;
  /** Listmonk API token (pair with LISTMONK_API_USER). */
  LISTMONK_API_TOKEN?: string;
  /**
   * Shared secret for Construct API → landing newsletter ingest.
   * Bearer / X-Construct-Signup-Ingest skips Turnstile.
   */
  SIGNUP_INGEST_SECRET?: string;
  /** PostHog project key for server-side campaign-touch identify/capture. */
  POSTHOG_PROJECT_KEY?: string;
  /** PostHog ingest host; default first-party proxy. */
  POSTHOG_HOST?: string;
};

/** The slice of D1 the embed functions use: one row reads and counted writes. */
export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
};

export type D1Like = { prepare(query: string): D1Statement };

/** The playable show in an X post (`functions/api/embed/*`). */
export type EmbedEnv = Omit<BetaSignupEnv, "DB"> & {
  DB: D1Like;
  /** Signs session tokens and keys the email and address hashes. Required. */
  EMBED_SESSION_SECRET?: string;
  /** The code the exit offer hands out: a free first month of the top plan. */
  EMBED_PROMO_CODE?: string;
  /** Cloudflare API token with Email Sending send rights, for the claim email. */
  EMAIL_API_TOKEN?: string;
  /** The account that owns construct.computer's Email Sending. */
  CLOUDFLARE_ACCOUNT_ID?: string;
  /** Sender of the claim email; defaults to noreply@construct.computer, "Construct". */
  EMBED_EMAIL_FROM?: string;
  EMBED_EMAIL_FROM_NAME?: string;
  /** Where replies to the claim email go. Unset, the email doesn't invite one. */
  EMBED_EMAIL_REPLY_TO?: string;
};

export type PagesFunction<Env> = (context: {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}) => Response | Promise<Response>;
