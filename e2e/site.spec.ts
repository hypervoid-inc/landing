import { expect, test, type Page, type Route } from "@playwright/test";

import { directoryListings } from "../app/content/directory-listings";
import { pricingPlans } from "../app/content/landing";
import { canonicalRoutes } from "../app/lib/route-manifest";

const API = "https://api.construct.computer/api";

/** Matches static marketing fallbacks so layout/toggle specs stay stable. */
const HOMEPAGE_CATALOG = {
  recommendedPlan: "starter" as const,
  plans: [
    {
      id: "lite",
      name: "Lite",
      limits: {
        maxAgents: 2,
        multiAgentEnabled: false,
        maxConcurrentSessionsPerAgent: 1,
        maxIterations: 50,
        maxStorageBytes: 104_857_600,
        maxScheduledTasks: 0,
        byokEnabled: false,
      },
      month: {
        price: { amount: 900, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: null,
      },
      year: {
        price: { amount: 9000, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: null,
      },
    },
    {
      id: "starter",
      name: "Starter",
      limits: {
        maxAgents: 5,
        multiAgentEnabled: true,
        maxConcurrentSessionsPerAgent: 2,
        maxIterations: 100,
        maxStorageBytes: 1_073_741_824,
        maxScheduledTasks: 20,
        byokEnabled: false,
      },
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
      limits: {
        maxAgents: 15,
        multiAgentEnabled: true,
        maxConcurrentSessionsPerAgent: 3,
        maxIterations: 1000,
        maxStorageBytes: 3_221_225_472,
        maxScheduledTasks: 50,
        byokEnabled: true,
      },
      month: {
        price: { amount: 29900, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: 7,
      },
      year: {
        price: { amount: 238800, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: 7,
      },
    },
  ],
};

function fulfillJson(route: Route, body: unknown, status = 200) {
  const origin = route.request().headers().origin ?? "http://localhost:8788";
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

const WELCOME_USER = {
  id: "22222222-2222-4222-8222-222222222222",
  username: "ada",
  email: "ada@example.com",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  timezone: "UTC",
  onboardingCompleted: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function stubPlanCatalog(
  page: Page,
  catalog: unknown = HOMEPAGE_CATALOG,
) {
  await page.route(`${API}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/v1/billing/plans")) return fulfillJson(route, catalog);
    return route.continue();
  });
}

/**
 * The Clippy CTA is fixed to the corner and would intercept clicks in any test
 * that runs past its arming delay. Dismiss no longer survives a refresh (or a
 * seeded sessionStorage write), so every navigation gets `?clippy=off` unless
 * the URL already sets an override. Several specs run well past 15 seconds.
 */
test.beforeEach(async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  page.goto = ((url, options) => {
    const target = new URL(String(url), "http://localhost:8788");
    if (!target.searchParams.has("clippy")) {
      target.searchParams.set("clippy", "off");
    }
    // Keep sticky geometry header-only unless a suite opts into ?ph=.
    if (!target.searchParams.has("ph")) {
      target.searchParams.set("ph", "off");
    }
    return originalGoto(
      `${target.pathname}${target.search}${target.hash}`,
      options,
    );
  }) as typeof page.goto;
});

test("serves every canonical page with matching metadata", async ({
  request,
}) => {
  for (const route of canonicalRoutes) {
    const path = route.path === "/" ? "/" : `${route.path}/`;
    const response = await request.get(path);
    expect(response.status(), route.path).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<link rel="canonical" href="${route.canonical}"`);
    expect(html).toContain('<meta name="description" content="');
  }
});

test("opens the auth dialog from the header and pricing CTAs", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog");
  const expectSignup = async () => {
    await expect(
      dialog.getByRole("heading", { name: /Create your Construct account/i }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(dialog.getByPlaceholder("you@company.com")).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toHaveCount(0);
  };

  // The header CTA is the one signup entry on every page, phones included.
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page
      .locator("header")
      .getByRole("link", { name: "Start using Construct" })
      .click();
    await expectSignup();
  }

  await page
    .getByRole("button", { name: pricingPlans[0]!.cta, exact: true })
    .click();
  await expectSignup();
});

test("shows post-login welcome after dialog magic verify", async ({ page }) => {
  await page.route(`${API}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return fulfillJson(route, {}, 401);
    if (path.endsWith("/auth/magic")) return fulfillJson(route, { ok: true });
    if (path.endsWith("/auth/magic/verify-otp")) {
      return fulfillJson(route, { user: WELCOME_USER });
    }
    if (path.endsWith("/v1/billing/plans")) {
      return fulfillJson(route, HOMEPAGE_CATALOG);
    }
    return fulfillJson(route, {});
  });

  await page.goto("/");
  await page
    .locator("header")
    .getByRole("link", { name: "Start using Construct" })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("you@company.com").fill("ada@example.com");
  await dialog.getByRole("button", { name: "Email me a code" }).click();
  await expect(
    dialog.getByText(/Enter the 6-digit code sent to ada@example.com/),
  ).toBeVisible();
  await dialog.getByPlaceholder("123456").fill("123456");
  await dialog.getByRole("button", { name: "Verify" }).click();

  await expect(
    dialog.getByRole("heading", { name: /Welcome,\s*Ada/i }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Open Construct" }),
  ).toBeVisible();
  await expect(dialog.getByText(/persistent cloud workspace/i)).toBeVisible();

  await dialog.getByRole("button", { name: "Stay on the site" }).click();
  await expect(dialog).toBeHidden();
});

test("links the directory badges from the homepage footer only", async ({
  page,
}) => {
  // A free listing is delisted if its link disappears from the homepage.
  await page.goto("/");
  const list = page.locator("footer [data-directory-listings]");
  await list.scrollIntoViewIfNeeded();
  await expect(list.getByRole("link")).toHaveCount(directoryListings.length);
  for (const listing of directoryListings) {
    const link = list.locator(`[data-directory-listing="${listing.id}"]`);
    await expect(link).toHaveAttribute("href", listing.href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const badge = link.getByRole("img", { name: listing.alt });
    await expect(badge).toBeVisible();
    await expect
      .poll(() =>
        badge.evaluate((node: HTMLImageElement) => node.naturalWidth > 0),
      )
      .toBe(true);
  }

  for (const path of ["/pricing/", "/blog/"]) {
    await page.goto(path);
    await expect(page.locator("[data-directory-listings]")).toHaveCount(0);
    for (const listing of directoryListings) {
      await expect(page.locator(`a[href="${listing.href}"]`)).toHaveCount(0);
    }
  }
});

test("toggles pricing between monthly and annual rates", async ({ page }) => {
  await stubPlanCatalog(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const cards = page.locator(".pricing-card");
  const annual = page.getByRole("radio", { name: /Annual/ });
  const monthly = page.getByRole("radio", { name: "Monthly" });
  const amount = (card: ReturnType<typeof cards.nth>) =>
    card.locator(".pricing-price-amount-live");

  await expect(annual).toHaveAttribute("aria-checked", "true");
  await expect(amount(cards.nth(0))).toHaveText("$7.50");
  await expect(cards.nth(0).locator(".pricing-price-was")).toHaveText("$9");
  await expect(cards.nth(0).locator(".pricing-price-was")).toBeVisible();
  await expect(cards.nth(0).locator(".pricing-price-savings")).toHaveText(
    "2 months free",
  );
  await expect(cards.nth(0).locator(".pricing-price-savings")).toBeVisible();
  await expect(cards.nth(0)).not.toContainText("trial");
  await expect(amount(cards.nth(1))).toHaveText("$39");
  await expect(cards.nth(1).locator(".pricing-price-was")).toHaveText("$59");
  await expect(cards.nth(1).locator(".pricing-price-savings")).toHaveText(
    "4 months free",
  );
  await expect(cards.nth(1)).not.toContainText("trial");
  await expect(amount(cards.nth(2))).toHaveText("$199");
  await expect(cards.nth(2).locator(".pricing-price-was")).toHaveText("$299");
  await expect(cards.nth(2)).toContainText("7-day trial");
  await expect(page.locator("#pricing")).not.toContainText("billed");

  await monthly.click();
  await expect(monthly).toHaveAttribute("aria-checked", "true");
  await expect(amount(cards.nth(0))).toHaveText("$9", { timeout: 1000 });
  await expect(cards.nth(0)).not.toContainText("trial");
  await expect(amount(cards.nth(1))).toHaveText("$59", { timeout: 1000 });
  await expect(amount(cards.nth(2))).toHaveText("$299", { timeout: 1000 });
  await expect(cards.nth(0).locator(".pricing-price-was")).not.toBeVisible();
  await expect(
    cards.nth(0).locator(".pricing-price-savings"),
  ).not.toBeVisible();
  await expect(cards.nth(1)).not.toContainText("trial");
  await expect(cards.nth(2)).toContainText("7-day trial");

  await annual.click();
  await expect(amount(cards.nth(1))).toHaveText("$39", { timeout: 1000 });
  await expect(cards.nth(1).locator(".pricing-price-was")).toBeVisible();
  await expect(cards.nth(1).locator(".pricing-price-was")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
});

test("applies live catalog recommended plan and trial highlight", async ({
  page,
}) => {
  await stubPlanCatalog(page, {
    ...HOMEPAGE_CATALOG,
    recommendedPlan: "pro",
    plans: HOMEPAGE_CATALOG.plans.map((plan) =>
      plan.id === "pro"
        ? {
            ...plan,
            month: { ...plan.month, trialDays: 7 },
            year: plan.year ? { ...plan.year, trialDays: 7 } : plan.year,
          }
        : plan.id === "lite"
          ? {
              ...plan,
              month: { ...plan.month, trialDays: null },
              year: plan.year ? { ...plan.year, trialDays: null } : plan.year,
            }
          : plan,
    ),
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.locator("#pricing").scrollIntoViewIfNeeded();

  const cards = page.locator(".pricing-card");
  await expect(cards.nth(2).locator(".pricing-badge")).toHaveText(
    "Recommended",
  );
  await expect(cards.nth(2)).toHaveAttribute("data-recommended", "");
  await expect(cards.nth(1).locator(".pricing-badge")).toHaveCount(0);
  await expect(cards.nth(1)).not.toHaveAttribute("data-recommended");
  await expect(cards.nth(2)).toContainText("7-day trial");
  await expect(cards.nth(0)).not.toContainText("7-day trial");
  await expect(page.locator("#pricing")).toContainText(
    "Plans start at $9/month",
  );
});

test("returns a real 404 for unknown URLs", async ({ request }) => {
  const response = await request.get("/definitely-not-a-page", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("Page not found");
});

test("submits the footer newsletter through Turnstile and D1", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await footer.getByLabel("Name").fill("Test User");
  await footer.getByLabel("Email address").fill("playwright@example.com");
  await expect(footer.getByRole("button", { name: "Subscribe" })).toBeEnabled({
    timeout: 15_000,
  });
  await footer.getByRole("button", { name: "Subscribe" }).click();
  await expect(footer.getByText("You're on the list")).toBeVisible({
    timeout: 15_000,
  });
});

// A post is its own layout: the desktop rail, the related grid, and the FAQ
// list only exist here, so the index page's pass says nothing about them.
