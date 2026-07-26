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
};

export type PagesFunction<Env> = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;
