import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    baseURL: "http://localhost:8788",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command:
      "pnpm wrangler d1 migrations apply DB --local && pnpm build && pnpm wrangler pages dev --port 8788 --binding TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA --binding TURNSTILE_EXPECTED_HOSTNAME=example.com --binding TURNSTILE_EXPECTED_ACTION=beta_signup --binding TURNSTILE_TEST_MODE=true --binding ALLOWED_ORIGIN_HOSTNAME=localhost",
    env: {
      ...process.env,
      VITE_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://localhost:8788",
  },
});
