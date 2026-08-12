import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  page.goto = ((url, options) => {
    const target = new URL(String(url), "http://localhost:8788");
    // Dedicated suite sets ?ph= explicitly; still silence Clippy.
    if (!target.searchParams.has("clippy")) {
      target.searchParams.set("clippy", "off");
    }
    return originalGoto(
      `${target.pathname}${target.search}${target.hash}`,
      options,
    );
  }) as typeof page.goto;
});

test("shows follow countdown banner in pre phase", async ({ page }) => {
  await page.goto("/?ph=pre");

  const banner = page.getByRole("region", { name: /Launching on Product Hunt/i });
  await expect(banner).toBeVisible();
  await expect(banner.locator(".ph-banner-badge")).toBeVisible();
  await expect(banner.locator(".ph-countdown")).toBeVisible();

  const height = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ph-banner-height")
      .trim(),
  );
  expect(Number.parseFloat(height)).toBeGreaterThan(20);
});

test("shows upvote banner in live phase", async ({ page }) => {
  await page.goto("/?ph=live");

  const banner = page.getByRole("region", { name: /live on Product Hunt/i });
  await expect(banner).toBeVisible();
  await expect(banner.locator(".ph-banner-badge")).toBeVisible();
  await expect(banner.locator(".ph-countdown")).toHaveCount(0);
});

test("shows campaign chrome on auth routes too", async ({ page }) => {
  await page.goto("/login/?ph=pre");
  await expect(
    page.getByRole("region", { name: /Launching on Product Hunt/i }),
  ).toBeVisible();

  // Unauthenticated /account redirects to /login and drops search params — assert
  // live chrome on login directly.
  await page.goto("/login/?ph=live");
  await expect(
    page.getByRole("region", { name: /live on Product Hunt/i }),
  ).toBeVisible();
});

test("shows banner on blog pages", async ({ page }) => {
  await page.goto("/blog/?ph=pre");
  await expect(
    page.getByRole("region", { name: /Launching on Product Hunt/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Product Hunt launch" }),
  ).toBeVisible();

  await page.goto("/blog/ai-agent-memory/?ph=pre");
  await expect(
    page.getByRole("region", { name: /Launching on Product Hunt/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Product Hunt launch" }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Product Hunt launch" })
      .first()
      .locator(".ph-badge"),
  ).toBeVisible();
  // End-of-article stack removed — one in-flow CTA + pre-footer strip, not a pile.
  await expect(
    page.getByRole("complementary", { name: "Product Hunt launch" }),
  ).toHaveCount(1);
});

test("holographic foil layers on Product Hunt badges", async ({ page }) => {
  await page.goto("/?ph=pre");
  const badge = page.locator(".ph-badge").first();
  await expect(badge).toBeVisible();
  await expect(badge.locator(".ph-badge-foil")).toHaveCount(1);
  await expect(badge.locator(".ph-badge-sparkle")).toHaveCount(1);
  await expect(badge.locator(".ph-badge-glare")).toHaveCount(1);
});

test("launch page shows desire hero, signup CTA, and walkthrough secondary", async ({
  page,
}) => {
  await page.goto("/launch/?ph=pre");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Your AI employee is on shift/i,
    }),
  ).toBeVisible();
  // Campaign traffic has no account yet: the primary CTA must say so, and the
  // secondary must be the low-commitment walkthrough, not Product Hunt.
  await expect(
    page.getByRole("link", { name: /Create your account/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Book a walkthrough/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Join Discord/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Follow on X/i })).toBeVisible();
});
