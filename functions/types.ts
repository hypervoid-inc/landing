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
  /** Listmonk API user — enables attribs via private /api/subscribers. */
  LISTMONK_API_USER?: string;
  /** Listmonk API token (pair with LISTMONK_API_USER). */
  LISTMONK_API_TOKEN?: string;
  /**
   * Shared secret for Construct API → landing newsletter ingest.
   * Bearer / X-Construct-Signup-Ingest skips Turnstile.
   */
  SIGNUP_INGEST_SECRET?: string;
};

export type PagesFunction<Env> = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;
