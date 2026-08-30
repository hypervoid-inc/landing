import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  page.goto = ((url, options) => {
    const target = new URL(String(url), "http://localhost:8788");
    if (!target.searchParams.has("clippy")) {
      target.searchParams.set("clippy", "off");
    }
    return originalGoto(
      `${target.pathname}${target.search}${target.hash}`,
      options,
    );
  }) as typeof page.goto;
});

test("keeps permanent Product Hunt proof in the landing-page corner", async ({
  page,
}) => {
  await page.goto("/");

  const proof = page.locator('[data-product-hunt-proof="home-corner"]');
  await expect(proof).toBeVisible();
  await expect(proof).toHaveAttribute("data-reveal-visible", "");
  await expect(proof.locator(".ph-proof-badge")).toHaveCount(2);
  await expect(
    proof.locator('[data-product-hunt-award="daily"]'),
  ).toHaveAttribute("aria-label", /#1 Product of the Day/i);
  await expect(
    proof.locator('[data-product-hunt-award="weekly-productivity"]'),
  ).toHaveAttribute("aria-label", /#5 Productivity App of the Week/i);

  const placement = await proof.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      position: getComputedStyle(node).position,
      left: rect.left,
      bottom: window.innerHeight - rect.bottom,
    };
  });
  expect(placement.position).toBe("fixed");
  expect(placement.left).toBeLessThanOrEqual(16);
  expect(placement.bottom).toBeLessThanOrEqual(16);

  await expect(page.locator(".ph-banner, .ph-countdown")).toHaveCount(0);
  await expect(page.getByText(/Launching on Product Hunt/i)).toHaveCount(0);
});

test("hands the home badges from the fixed corner into the footer", async ({
  page,
}) => {
  // Regression viewport: the handoff must not depend on a tall desktop window.
  await page.setViewportSize({ width: 2048, height: 272 });
  await page.goto("/");

  const corner = page.locator('[data-product-hunt-proof="home-corner"]');
  const footer = page.locator('footer [data-product-hunt-proof="footer"]');
  await expect(corner).not.toHaveAttribute("data-proof-handoff", "");
  await expect(footer).toHaveAttribute("data-proof-coordinated", "");

  await footer.scrollIntoViewIfNeeded();
  await expect(corner).toHaveAttribute("data-proof-handoff", "");
  await expect(footer).toHaveAttribute("data-proof-handoff", "");
  await expect(footer).toBeVisible();
  await expect
    .poll(() =>
      corner.locator(".ph-proof-badges").evaluate((node) => ({
        opacity: getComputedStyle(node).opacity,
        offCanvas: node.getBoundingClientRect().right < 0,
      })),
    )
    .toEqual({ opacity: "0", offCanvas: true });
  await expect
    .poll(() =>
      footer.evaluate((node) => ({
        opacity: getComputedStyle(node).opacity,
        translateY: new DOMMatrix(getComputedStyle(node).transform).m42,
      })),
    )
    .toEqual({ opacity: "1", translateY: 0 });

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(corner).not.toHaveAttribute("data-proof-handoff", "");
  await expect(footer).not.toHaveAttribute("data-proof-handoff", "");
  await expect
    .poll(() =>
      corner
        .locator(".ph-proof-badges")
        .evaluate((node) => getComputedStyle(node).opacity),
    )
    .toBe("1");
});

test("moves only the daily badge into the mobile hero", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const corner = page.locator('[data-product-hunt-proof="home-corner"]');
  const heroProof = page.locator(
    '[data-product-hunt-proof="home-mobile-hero"]',
  );
  await expect(corner).toBeHidden();
  await expect(heroProof).toBeVisible();
  await expect(heroProof).toHaveAttribute("data-reveal-visible", "");
  await expect(
    heroProof.locator('[data-product-hunt-award="daily"]'),
  ).toBeVisible();
  await expect(
    heroProof.locator('[data-product-hunt-award="weekly-productivity"]'),
  ).toHaveCount(0);

  const title = await page.locator(".hero-headline-title").boundingBox();
  const proof = await heroProof.boundingBox();
  const cta = await page.locator(".hero-cta-row").boundingBox();
  expect(proof?.y ?? 0).toBeGreaterThan((title?.y ?? 0) + (title?.height ?? 0));
  expect((proof?.y ?? 0) + (proof?.height ?? 0)).toBeLessThan(cta?.y ?? 0);
});

test("puts Product Hunt immediately before the PartnerStack affiliate unit", async ({
  page,
}) => {
  await page.goto("/pricing/");

  const footerProof = page.locator('footer [data-product-hunt-proof="footer"]');
  const affiliate = page.locator("footer .footer-affiliate-badge");
  await affiliate.scrollIntoViewIfNeeded();
  await expect(footerProof).toBeVisible();
  await expect(footerProof).toHaveAttribute("data-proof-visible", "");
  await expect(affiliate).toBeVisible();
  expect(
    await affiliate.evaluate((node) =>
      node.previousElementSibling?.getAttribute("data-product-hunt-proof"),
    ),
  ).toBe("footer");

  await expect
    .poll(async () => {
      const badges = footerProof.locator(".ph-proof-badge");
      const daily = await badges.nth(0).boundingBox();
      const weekly = await badges.nth(1).boundingBox();
      const partner = await affiliate.boundingBox();
      return Math.max(
        Math.abs((daily?.y ?? 0) - (weekly?.y ?? 0)),
        Math.abs((weekly?.y ?? 0) - (partner?.y ?? 0)),
      );
    })
    .toBeLessThan(2);
});

test("uses direct, placement-attributed Product Hunt links", async ({
  page,
}) => {
  await page.goto("/");
  const links = page.locator("a.ph-proof-link");
  const count = await links.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let index = 0; index < count; index += 1) {
    const href = await links.nth(index).getAttribute("href");
    const url = new URL(href ?? "");
    expect(url.origin).toBe("https://www.producthunt.com");
    expect(url.pathname).toBe("/products/construct-computer");
    expect(url.searchParams.get("utm_campaign")).toBe(
      "badge-construct-computer",
    );
    expect(url.searchParams.get("utm_content")).toBeTruthy();
  }
});

test("keeps proof out of primary pricing and use-case content", async ({
  page,
}) => {
  await page.goto("/pricing/");
  await expect(page.locator('[data-product-hunt-proof="pricing"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('[data-product-hunt-proof="home-corner"]'),
  ).toHaveCount(0);

  await page.goto("/use-cases/");
  await expect(
    page.locator('[data-product-hunt-proof="use-cases"]'),
  ).toHaveCount(0);

  await page.goto("/use-cases/memory/");
  await expect(
    page.locator('[data-product-hunt-proof="use-case"]'),
  ).toHaveCount(0);
});

test("keeps blog proof in the desktop article rail, not the content flow", async ({
  page,
}) => {
  await page.goto("/blog/");
  await expect(
    page.locator('[data-product-hunt-proof="blog-index"]'),
  ).toHaveCount(0);

  await page.goto("/blog/ai-agent-memory/");
  await expect(
    page.locator('[data-product-hunt-proof="blog-article"]:visible'),
  ).toHaveCount(1);
});

test("keeps Product Hunt out of the offer-page content", async ({ page }) => {
  await page.goto("/launch/");
  await expect(
    page.getByRole("link", { name: /Create your account/i }).first(),
  ).toBeVisible();
  await expect(page.locator('[data-product-hunt-proof="launch"]')).toHaveCount(
    0,
  );
  await expect(
    page.getByText(/Pre-launch offer|Launch week offer/i),
  ).toHaveCount(0);
});
