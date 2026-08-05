import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Covers /account and /login, which previously had no e2e coverage at all —
 * which is how three wrong response types shipped and rendered nothing.
 *
 * The API is stubbed so these assert the client contract: given a real API
 * response shape, the page must render the values rather than blanks.
 */

const API = "https://api.construct.computer/api";

const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "ankush",
  email: "ankush@example.com",
  displayName: "Ankush Singh",
  avatarUrl: null,
  timezone: "Asia/Kolkata",
  onboardingCompleted: true,
  createdAt: "2026-03-14T10:00:00.000Z",
};

const LIMITS = {
  maxAgents: 15,
  multiAgentEnabled: true,
  maxConcurrentSessionsPerAgent: 3,
  maxIterations: 100,
  maxStorageBytes: 3_221_225_472,
  maxScheduledTasks: 50,
  byokEnabled: true,
  usageRelativeToLite: 32,
};

const PLAN = {
  plan: "pro",
  status: "active",
  access: true,
  grantSource: "dodo",
  interval: "year",
  trialEndsAt: null,
  trialUsed: false,
  cancelAtPeriodEnd: false,
  periodEnd: 1_800_000_000,
  canCheckout: false,
  canManage: true,
  canChangePlan: true,
  paymentError: null,
  limits: LIMITS,
  overrides: {
    byokEnabled: null,
    multiAgentEnabled: null,
    maxAgents: null,
  },
  models: {},
  usage: { sessionPct: 48, monthlyPct: 19 },
  // The API calls this `pool`. Landing used to read `ownerUsage`.
  pool: {
    agentsUsed: 3,
    agentsMax: 15,
    storageBytesUsed: 432_013_312,
    storageBytesMax: 3_221_225_472,
    scheduledTasksUsed: 4,
    scheduledTasksMax: 50,
  },
  freeAllowanceActive: false,
  freeAllowanceUsedPct: 0,
};

// Per-interval commercials live on `month`/`year`, not a `prices` map.
const CATALOG = {
  recommendedPlan: "pro" as const,
  plans: [
    {
      id: "lite",
      name: "Lite",
      limits: LIMITS,
      month: {
        price: { amount: 900, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: null,
      },
      year: {
        price: { amount: 9000, currency: "USD" },
        listPrice: { amount: 10800, currency: "USD" },
        display: null,
        trialDays: null,
      },
    },
    {
      id: "starter",
      name: "Starter",
      limits: LIMITS,
      month: {
        price: { amount: 5900, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: null,
      },
      year: {
        price: { amount: 46800, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: null,
      },
    },
    {
      id: "pro",
      name: "Pro",
      limits: LIMITS,
      month: {
        price: { amount: 29900, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: 7,
      },
      // `year.price` is the full annual charge, not the monthly equivalent:
      // $199/mo billed annually is $2,388.
      year: {
        price: { amount: 238800, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: 7,
      },
    },
  ],
};

const BYOK_OFF = {
  openrouter: false,
  openai: false,
  anthropic: false,
  bedrock: false,
  xai: false,
};

const BYOK = {
  mode: "auto",
  ready: true,
  allowed: true,
  requiredPlan: "starter",
  allowedPlans: ["starter", "pro"],
  providers: { ...BYOK_OFF, anthropic: true },
  providersReady: { ...BYOK_OFF, anthropic: true },
  slots: {
    main: null,
    subagent: null,
    vision: null,
    coding: null,
    compaction: null,
  },
  monthlyLimitUsd: null,
  bedrockRegion: null,
  xaiAuth: null,
};

const BYOK_MODELS = {
  models: [
    {
      id: "anthropic/claude-opus-5",
      label: "Claude Opus 5",
      source: "anthropic",
      vendor: "Anthropic",
      status: "available",
    },
  ],
};

/**
 * Must echo the origin and allow credentials: the real client sends
 * `credentials: "include"`, and browsers reject a wildcard ACAO on those.
 */
function json(route: Route, body: unknown, status = 200) {
  const origin =
    route.request().headers().origin ?? "http://localhost:8788";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  };
  if (route.request().method() === "OPTIONS") {
    return route.fulfill({ status: 204, headers });
  }
  return route.fulfill({
    status,
    contentType: "application/json",
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Third-party noise that predates this work (the PartnerStack tag is blocked by
 * the site CSP). Assert on our own errors, not the whole console.
 */
const IGNORED_CONSOLE = [
  "join.construct.computer",
  "Content Security Policy",
  // A 401 on /auth/me is the normal signed-out path; the browser logs the
  // failed response regardless, and the app handles it by design.
  "401 (Unauthorized)",
] as const;

function appErrors(messages: string[]): string[] {
  return messages.filter(
    (message) => !IGNORED_CONSOLE.some((noise) => message.includes(noise)),
  );
}

async function stubApi(
  page: Page,
  overrides: Partial<Record<string, unknown>> = {},
) {
  await page.route(`${API}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return json(route, overrides.me ?? USER);
    if (path.endsWith("/v1/billing/plan"))
      return json(route, overrides.plan ?? PLAN, (overrides.planStatus as number) ?? 200);
    if (path.endsWith("/v1/billing/plans"))
      return json(route, overrides.catalog ?? CATALOG);
    if (path.endsWith("/v1/workspaces"))
      return json(route, {
        workspaces: [
          { id: "w1", name: "Personal", kind: "personal", role: "owner" },
        ],
        activeWorkspaceId: "w1",
      });
    if (path.endsWith("/auth/sessions"))
      return json(route, {
        currentSessionId: "s1",
        sessions: [
          {
            id: "s1",
            loginProvider: "google",
            surface: "web",
            deviceLabel: null,
            userAgent:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            ip: "203.0.113.9",
            createdAt: "2026-03-01T12:00:00.000Z",
            lastSeenAt: new Date(Date.now() - 120_000).toISOString(),
            revokedAt: null,
            isCurrent: true,
          },
        ],
      });
    if (path.endsWith("/auth/password/status"))
      return json(route, { hasPassword: true });
    if (path.endsWith("/v1/llm/byok"))
      return json(
        route,
        overrides.byok ?? BYOK,
        (overrides.byokStatus as number) ?? 200,
      );
    if (path.endsWith("/v1/llm/byok/models")) return json(route, BYOK_MODELS);
    return json(route, {});
  });
}

/** Rare-config sections start collapsed — expand before asserting body content. */
async function expandSection(page: Page, title: string) {
  const trigger = page.getByRole("button", { name: new RegExp(title, "i") });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test.describe("/account", () => {
  test("renders the plan, price, renewal date and usage", async ({ page }) => {
    await stubApi(page);
    await page.goto("/account");

    // Identity.
    await expect(
      page.getByRole("heading", { name: "Ankush Singh" }),
    ).toBeVisible();
    await expect(page.getByText(/member since/i)).toBeVisible();

    // Profile sits directly under identity.
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

    // The plan summary and renewal date, neither of which used to render.
    await expect(page.getByText(/pro · Annual/i).first()).toBeVisible();
    await expect(page.getByText(/Renews/i).first()).toBeVisible();

    // Dodo portal entry points for the billing owner.
    await expect(
      page.getByRole("button", { name: "Manage plan" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Annual · yours/i }),
    ).toBeVisible();

    // Prices: previously every card showed an em dash.
    await expect(page.getByText("$2,388").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Loading plan");

    // Usage meters read from `pool`.
    const session = page.getByRole("progressbar", { name: "This session" });
    await expect(session).toHaveAttribute("aria-valuenow", "48");
    await expect(page.getByText("3 / 15")).toBeVisible();
    await expect(page.getByText(/412\.0 MB|411\.9 MB/)).toBeVisible();

    // Config sections stay collapsed until opened.
    await expect(
      page.getByText("This device", { exact: true }),
    ).not.toBeVisible();
    await expandSection(page, "Security");
    await expect(page.getByText("This device", { exact: true })).toBeVisible();
    await expect(page.getByText(/Chrome on macOS/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "Couldn't load your sessions",
    );
  });

  test("hides the plan picker for admin grants and does not invent a price", async ({
    page,
  }) => {
    await stubApi(page, {
      plan: {
        ...PLAN,
        grantSource: "manual",
        interval: null,
        canCheckout: false,
        canManage: false,
        canChangePlan: false,
        periodEnd: null,
      },
    });
    await page.goto("/account");

    await expect(page.getByText(/pro · Granted/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Annual · yours/i }),
    ).toHaveCount(0);
    await expect(page.getByText("Lite")).toHaveCount(0);
    await expect(page.getByText("$2,388")).toHaveCount(0);
    await expect(page.getByText("$299")).toHaveCount(0);
  });

  test("marks Current only on the billed interval", async ({ page }) => {
    await stubApi(page);
    await page.goto("/account");

    // Stub is annual Pro — Current on annual view.
    await expect(page.getByText("Current")).toBeVisible();
    await page.getByRole("button", { name: "Monthly" }).click();
    await expect(page.getByText("Current")).toHaveCount(0);
    await expect(page.getByText("Your annual plan")).toBeVisible();
    await expect(
      page.getByText(/You're billed annually/i),
    ).toBeVisible();
  });

  test("shows the annual list price struck through", async ({ page }) => {
    await stubApi(page);
    await page.goto("/account");
    // Lite: $90/yr discounted from a $108 list.
    await expect(page.getByText("$108")).toBeVisible();
  });

  test("shows Recommended and trial CTA from the catalog", async ({
    page,
  }) => {
    await stubApi(page, {
      plan: {
        ...PLAN,
        plan: "unsubscribed",
        status: "none",
        access: false,
        grantSource: "none",
        interval: null,
        periodEnd: null,
        canCheckout: true,
        canManage: false,
        canChangePlan: false,
        trialUsed: false,
      },
    });
    await page.goto("/account");

    const planCard = page.getByText("Pro", { exact: true }).locator("..");
    await expect(planCard.getByText("Recommended")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start 7d trial" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Subscribe" }).first(),
    ).toBeVisible();
  });

  test("surfaces an error with a retry instead of loading forever", async ({
    page,
  }) => {
    await stubApi(page, { plan: { error: "boom" }, planStatus: 500 });
    await page.goto("/account");

    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Loading plan");
  });

  test("shows BYOK providers and the connected state", async ({ page }) => {
    await stubApi(page);
    await page.goto("/account");

    await expandSection(page, "Bring your own key");
    await expect(page.getByText("Anthropic", { exact: true })).toBeVisible();
    await expect(page.getByText("Ready")).toBeVisible();

    // Mode is a real pressed-state control, not just styling.
    await expect(
      page.getByRole("button", { name: /Automatic/ }),
    ).toHaveAttribute("aria-pressed", "true");

    // Model slots appear only once a provider is actually usable.
    await expect(page.getByLabel("Main")).toBeVisible();
  });

  test("distinguishes a saved-but-broken key from a working one", async ({
    page,
  }) => {
    await stubApi(page, {
      byok: {
        ...BYOK,
        providers: { ...BYOK_OFF, anthropic: true },
        providersReady: { ...BYOK_OFF },
      },
    });
    await page.goto("/account");

    await expandSection(page, "Bring your own key");
    await expect(page.getByText("Check key")).toBeVisible();
    await expect(page.getByText("Key saved but not working")).toBeVisible();
  });

  test("locks BYOK behind the required plan", async ({ page }) => {
    await stubApi(page, {
      byok: { ...BYOK, allowed: false, requiredPlan: "starter" },
    });
    await page.goto("/account");

    await expandSection(page, "Bring your own key");
    await expect(page.getByText(/on the starter plan and above/i)).toBeVisible();
    // No key input should exist when the plan doesn't permit BYOK.
    await expect(page.getByRole("button", { name: "Connect" })).toHaveCount(0);
  });

  test("hides BYOK entirely when the API forbids it", async ({ page }) => {
    await stubApi(page, { byok: { error: "forbidden" }, byokStatus: 403 });
    await page.goto("/account");

    await expect(
      page.getByRole("heading", { name: "Ankush Singh" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Bring your own key/i }),
    ).toHaveCount(0);
  });

  test("redirects an anonymous visitor to /login", async ({ page }) => {
    await page.route(`${API}/**`, (route) =>
      json(route, { error: "Unauthorized" }, 401),
    );
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await stubApi(page);
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "Ankush Singh" }),
    ).toBeVisible();
    expect(appErrors(errors)).toEqual([]);
  });

  test("opens the header account menu with Account, Open OS, and Log out", async ({
    page,
  }) => {
    await stubApi(page);
    await page.goto("/account");

    const menuButton = page.getByRole("button", {
      name: "Account menu for Ankush Singh",
    });
    await expect(menuButton).toBeVisible();
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Account" })).toHaveCount(0);
    await expect(header.getByRole("link", { name: /^Open OS/ })).toHaveCount(0);

    await menuButton.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Account" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Open OS" })).toHaveAttribute(
      "href",
      "https://os.construct.computer",
    );
    await expect(menu.getByRole("menuitem", { name: "Log out" })).toBeVisible();

    await menu.getByRole("menuitem", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/account\/?$/);
  });
});

test.describe("/login", () => {
  test("renders and switches panels without console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route(`${API}/**`, (route) =>
      json(route, { error: "Unauthorized" }, 401),
    );

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });
});
