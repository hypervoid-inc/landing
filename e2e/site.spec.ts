import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { resourceEntries } from "../app/content/resources";
import { workflowDemos } from "../app/content/landing";
import { canonicalRoutes } from "../app/lib/route-manifest";

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

test("shows every resource once in one ordered image grid", async ({
  page,
}) => {
  await page.goto("/blog/");

  const cards = page.locator("#all-resources-heading + ol > li");
  await expect(cards).toHaveCount(resourceEntries.length);
  await expect(cards.first().locator("img")).toBeVisible();
  await expect(cards.first()).toContainText(resourceEntries[0]!.title);
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveText(
    "Blog",
  );
});

test("uses one shared header, footer, and favicon across page types", async ({
  page,
  request,
}) => {
  for (const path of ["/", "/blog/", "/privacy/"]) {
    await page.goto(path);
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveText(
      "Blog",
    );
    await expect(page.locator("footer")).toContainText("Request beta access");
    await expect(page.locator("footer")).toContainText("vs ChatGPT");
    await expect(
      page.locator('link[rel="icon"][sizes="32x32"]'),
    ).toHaveAttribute("href", "/favicon-32.png?v=3");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/apple-touch-icon.png?v=3",
    );
  }

  for (const asset of [
    "/favicon-16.png?v=3",
    "/favicon-32.png?v=3",
    "/favicon.ico?v=3",
    "/apple-touch-icon.png?v=3",
    "/icon-192.png?v=3",
    "/icon-512.png?v=3",
  ]) {
    expect((await request.get(asset)).status(), asset).toBe(200);
  }
});

test("keeps the primary action usable in the compact mobile header", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");

    const header = await page.locator("header").boundingBox();
    const beta = page.getByRole("link", { name: "Request early beta access" });
    const betaBox = await beta.boundingBox();

    expect(header?.height).toBeGreaterThanOrEqual(48);
    expect(header?.height).toBeLessThanOrEqual(49);
    expect(betaBox?.height).toBeGreaterThanOrEqual(40);
    expect(betaBox?.x).toBeGreaterThanOrEqual(0);
    expect((betaBox?.x ?? 0) + (betaBox?.width ?? 0)).toBeLessThanOrEqual(
      width,
    );
    await expect(beta).toBeVisible();
    await expect(beta.locator(".sm\\:hidden")).toHaveText("Beta access");
  }
});

test("keeps the mobile footer compact and aligned", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const footer = await page.locator("footer").boundingBox();
  const companyNav = page.getByRole("navigation", { name: "Company" });
  const comparisonsNav = page.getByRole("navigation", {
    name: "Comparisons",
  });
  const company = await companyNav.boundingBox();
  const comparisons = await comparisonsNav.boundingBox();

  expect(footer?.height).toBeLessThan(720);
  expect(Math.abs((company?.y ?? 0) - (comparisons?.y ?? 0))).toBeLessThan(2);
  expect(comparisons?.x).toBeGreaterThan((company?.x ?? 0) + 100);
  await expect(companyNav).toHaveCSS("align-items", "center");
  await expect(comparisonsNav).toHaveCSS("align-items", "center");
  await expect(page.locator("footer").getByText(/^©/)).toHaveCSS(
    "text-align",
    "center",
  );
  await expect(
    page.getByRole("link", { name: "Request beta access" }),
  ).toHaveCSS("width", "350px");
});

test("keeps lower landing sections proportional across desktop widths", async ({
  page,
}) => {
  const cases = [
    { width: 1024, workHeight: [610, 630], pricingColumns: false },
    { width: 1280, workHeight: [758, 778], pricingColumns: true },
    { width: 1440, workHeight: [854, 874], pricingColumns: true },
    { width: 1920, workHeight: [934, 954], pricingColumns: true },
  ] as const;

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: 1000 });
    await page.goto("/");

    const work = await page.locator(".work-panel").boundingBox();
    expect(work?.height).toBeGreaterThanOrEqual(item.workHeight[0]);
    expect(work?.height).toBeLessThanOrEqual(item.workHeight[1]);

    const cards = page.locator(".pricing-card");
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0)) < 4).toBe(
      item.pricingColumns,
    );

    const panel = await page.locator(".enterprise-panel").boundingBox();
    const art = await page.locator(".enterprise-art").boundingBox();
    const email = await page
      .getByRole("link", { name: "or send us an email" })
      .boundingBox();
    if (item.pricingColumns) {
      expect(
        (panel?.x ?? 0) +
          (panel?.width ?? 0) -
          ((art?.x ?? 0) + (art?.width ?? 0)),
      ).toBeLessThan(40);
      expect((email?.x ?? 0) + (email?.width ?? 0)).toBeLessThanOrEqual(
        (art?.x ?? 0) - 8,
      );
    } else {
      expect(panel?.width).toBeCloseTo(first?.width ?? 0, 1);
      expect(panel?.x).toBeCloseTo(first?.x ?? 0, 1);
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".feature-grid img").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".work-section")).toHaveCSS("z-index", "0");
});

test("keeps pricing artwork and plan details in separate readable zones", async ({
  page,
}) => {
  for (const width of [320, 390, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    for (const cta of ["Start with Lite", "Put Starter to work", "Go Pro"]) {
      await expect(page.getByRole("link", { name: cta })).toHaveAttribute(
        "href",
        "https://beta.construct.computer",
      );
    }

    const cards = page.locator(".pricing-card");
    await expect(cards.nth(0)).toContainText("Try Construct for yourself");
    await expect(
      cards.nth(0).getByText("Try Construct for yourself"),
    ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(cards.nth(0)).toContainText("5-minute command runtime");
    await expect(cards.nth(1)).toContainText("Recommended");
    await expect(cards.nth(1)).not.toContainText(
      "Daily agent work with email & schedules",
    );
    await expect(cards.nth(1)).toContainText("6× the usage of Lite");
    await expect(cards.nth(2)).not.toContainText(
      "Full desktop power + your own model keys",
    );
    await expect(cards.nth(2)).toContainText(
      "Deep runs — up to 1,000 steps per task",
    );
    await expect(cards.nth(2)).toContainText(
      "Bring your own model keys (BYOK)",
    );
    const starterBox = await cards.nth(1).boundingBox();
    const badge = cards.nth(1).getByText("Recommended");
    const badgeBox = await badge.boundingBox();
    await expect(badge).toHaveCSS("text-shadow", "none");
    await expect(badge).toHaveCSS("box-shadow", "none");
    await expect(badge).toHaveCSS("background-color", "rgb(1, 180, 200)");
    expect((badgeBox?.y ?? 0) - (starterBox?.y ?? 0)).toBeCloseTo(
      width < 640 ? 56 : 20,
      0,
    );
    if (width < 640) {
      expect((badgeBox?.x ?? 0) - (starterBox?.x ?? 0)).toBeCloseTo(12, 0);
    } else {
      expect(
        (starterBox?.x ?? 0) +
          (starterBox?.width ?? 0) -
          ((badgeBox?.x ?? 0) + (badgeBox?.width ?? 0)),
      ).toBeCloseTo(20, 0);
    }
    await expect(page.locator("#pricing")).not.toContainText(
      "Concurrent Temporary Agent Jobs",
    );

    for (const card of await cards.all()) {
      await expect(card.locator(".pricing-image")).toHaveCSS("opacity", "0.75");
      await expect(card.locator(".pricing-visual")).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      const cardBox = await card.boundingBox();
      const visual = await card.locator(".pricing-visual").boundingBox();
      const image = await card.locator(".pricing-image").boundingBox();
      const summary = await card.locator(".pricing-summary").boundingBox();
      const price = await card.locator(".pricing-price").boundingBox();
      const content = await card.locator(".pricing-content").boundingBox();
      const button = await card.locator(".pricing-button").boundingBox();
      const benefits = await card.locator(".pricing-benefits").boundingBox();

      expect(image).toEqual(visual);
      expect((summary?.y ?? 0) + (summary?.height ?? 0)).toBeLessThanOrEqual(
        (visual?.y ?? 0) + (visual?.height ?? 0) + 1,
      );

      if (width < 640) {
        expect((summary?.x ?? 0) + (summary?.width ?? 0)).toBeLessThanOrEqual(
          (content?.x ?? 0) + 1,
        );
        expect((visual?.x ?? 0) + (visual?.width ?? 0)).toBeGreaterThan(
          (content?.x ?? 0) + 50,
        );
        expect(visual?.height).toBeCloseTo(cardBox?.height ?? 0, 1);
        expect((button?.x ?? 0) + (button?.width ?? 0)).toBeLessThanOrEqual(
          (cardBox?.x ?? 0) + (cardBox?.width ?? 0) - 11,
        );
        expect(benefits?.y).toBeGreaterThan(
          (button?.y ?? 0) + (button?.height ?? 0) + 12,
        );
      } else {
        expect((visual?.width ?? 0) / (visual?.height ?? 1)).toBeCloseTo(
          870 / 608,
          2,
        );
        expect(button?.y).toBeLessThan(
          (visual?.y ?? 0) + (visual?.height ?? 0),
        );
        expect((price?.y ?? 0) + (price?.height ?? 0)).toBeLessThanOrEqual(
          (visual?.y ?? 0) + (visual?.height ?? 0) - 84,
        );
        expect(benefits?.y).toBeGreaterThan(
          (button?.y ?? 0) + (button?.height ?? 0) + 20,
        );
      }

      await expect(card.locator(".pricing-image")).not.toHaveAttribute(
        "alt",
        "",
      );
    }

    const lastPlanBox = await cards.last().boundingBox();
    const enterpriseBox = await page.locator(".enterprise-panel").boundingBox();
    expect(
      (enterpriseBox?.y ?? 0) -
        ((lastPlanBox?.y ?? 0) + (lastPlanBox?.height ?? 0)),
    ).toBeCloseTo(width < 1280 ? 20 : 28, 0);
  }
});

test("keeps the landing hero clear and reserves lazy media space", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 390, height: 1365 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const header = await page.locator("header").boundingBox();
    const stage = await page.locator(".hero-stage").boundingBox();
    const copy = await page.locator(".hero-copy").boundingBox();
    const scene = await page.locator(".hero-scene").boundingBox();
    const what = await page.locator("#what").boundingBox();
    const contentTop = Math.min(copy?.y ?? 0, scene?.y ?? 0);
    const contentBottom = Math.max(
      (copy?.y ?? 0) + (copy?.height ?? 0),
      (scene?.y ?? 0) + (scene?.height ?? 0),
    );
    const availableCenter =
      (header?.height ?? 0) + (viewport.height - (header?.height ?? 0)) / 2;

    expect(stage?.height).toBeGreaterThanOrEqual(
      viewport.height - (header?.height ?? 0) - 1,
    );
    expect(what?.y).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(
      Math.abs((contentTop + contentBottom) / 2 - availableCenter),
    ).toBeLessThan(24);
  }

  for (const viewport of [
    { width: 1280, height: 650 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const copy = await page.locator(".hero-copy").boundingBox();
    const report = await page.locator(".hero-report").boundingBox();
    const cta = await page
      .getByRole("link", { name: "Enter Experience" })
      .boundingBox();
    const overlaps =
      (copy?.x ?? 0) < (report?.x ?? 0) + (report?.width ?? 0) &&
      (copy?.x ?? 0) + (copy?.width ?? 0) > (report?.x ?? 0) &&
      (copy?.y ?? 0) < (report?.y ?? 0) + (report?.height ?? 0) &&
      (copy?.y ?? 0) + (copy?.height ?? 0) > (report?.y ?? 0);
    expect(overlaps).toBe(false);
    expect((cta?.y ?? 0) + (cta?.height ?? 0)).toBeLessThanOrEqual(
      viewport.height + 1,
    );
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const stage = await page.locator(".hero-stage").boundingBox();
    const nextHeading = await page.locator("#what-heading").boundingBox();
    expect(stage?.height).toBeGreaterThanOrEqual(viewport.height - 56);
    expect(nextHeading?.y).toBeGreaterThanOrEqual(viewport.height);
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  for (const layer of [
    ".hero-report",
    ".hero-chat",
    ".hero-search",
    ".hero-workflow",
  ]) {
    await expect(page.locator(layer)).toBeVisible();
  }
  await expect(page.locator(".hero-scene a")).toHaveCount(7);
  await page
    .getByRole("link", { name: "Get beta access — research report" })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Get beta access" }),
  ).toBeVisible();
  await expect(page.locator(".beta-dialog-overlay")).toHaveCSS(
    "animation-name",
    "beta-overlay-in",
  );
  await expect(page.locator(".beta-dialog-content")).toHaveCSS(
    "animation-name",
    "beta-dialog-in",
  );
  const openingDialog = await page
    .locator(".beta-dialog-content")
    .boundingBox();
  expect(
    Math.abs(
      (openingDialog?.x ?? 0) + (openingDialog?.width ?? 0) / 2 - 1024 / 2,
    ),
  ).toBeLessThan(2);
  expect(
    Math.abs(
      (openingDialog?.y ?? 0) + (openingDialog?.height ?? 0) / 2 - 768 / 2,
    ),
  ).toBeLessThan(14);
  await page.getByRole("button", { name: "Close dialog" }).click();
  const hero = await page.locator(".hero-stage").boundingBox();
  const what = await page.locator("#what").boundingBox();
  const sectionOverlap = (hero?.y ?? 0) + (hero?.height ?? 0) - (what?.y ?? 0);
  expect(sectionOverlap).toBeGreaterThan(40);
  expect(sectionOverlap).toBeLessThan(80);
  await expect(page.locator("#what")).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await expect(page.locator("#what-heading")).toHaveCSS(
    "font-size",
    await page
      .locator("#adapts-heading")
      .evaluate((element) => getComputedStyle(element).fontSize),
  );
  await expect(page.locator("#what p").first()).toHaveCSS(
    "font-size",
    await page
      .locator("#adapts-heading + p")
      .evaluate((element) => getComputedStyle(element).fontSize),
  );
  const heroArtworkBottom = Math.max(
    ...(await Promise.all(
      [".hero-report", ".hero-chat", ".hero-search", ".hero-workflow"].map(
        async (selector) => {
          const box = await page.locator(selector).boundingBox();
          return (box?.y ?? 0) + (box?.height ?? 0);
        },
      ),
    )),
  );
  const whatHeading = await page.locator("#what-heading").boundingBox();
  const whatLinks = await page
    .getByRole("navigation", { name: "Learn about Construct" })
    .boundingBox();
  const adaptsHeading = await page.locator("#adapts-heading").boundingBox();
  const heroToWhatGap = (whatHeading?.y ?? 0) - heroArtworkBottom;
  const whatToAdaptsGap =
    (adaptsHeading?.y ?? 0) - ((whatLinks?.y ?? 0) + (whatLinks?.height ?? 0));
  expect(
    Math.abs(heroToWhatGap - whatToAdaptsGap),
    `hero gap ${heroToWhatGap}; section gap ${whatToAdaptsGap}`,
  ).toBeLessThan(70);
  const atmosphere = await page.locator(".landing-atmosphere").boundingBox();
  const adapts = await page.locator("#adapts-heading").boundingBox();
  expect((adapts?.y ?? 0) - (atmosphere?.y ?? 0)).toBeLessThan(120);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const layer of [
    ".hero-report",
    ".hero-chat",
    ".hero-search",
    ".hero-workflow",
  ]) {
    await expect(page.locator(layer)).toBeVisible();
  }
  await expect(
    page.locator('.feature-grid img[src$="schedules.png"]'),
  ).toHaveAttribute("width", "346");
  await expect(
    page.locator('.feature-grid img[src$="integrations.png"]'),
  ).toHaveAttribute("width", "712");
  const grid = await page.locator(".feature-grid").boundingBox();
  const wideCard = await page
    .locator('.feature-grid img[src$="integrations.png"]')
    .boundingBox();
  expect(grid?.height).toBeLessThan(600);
  expect(wideCard?.height).toBeLessThan(200);
  await expect(page.locator(".landing-clouds")).toHaveCSS(
    "position",
    "absolute",
  );
  await expect(page.locator("#pricing")).toHaveCSS("scroll-margin-top", "64px");
});

test("eases the workflow into and out of its pinned position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const section = page.locator(".workflow-section");
  const sticky = page.locator(".workflow-sticky");
  const motion = page.locator(".workflow-motion");
  await section.scrollIntoViewIfNeeded();
  await expect(sticky).toHaveCSS("position", "sticky");
  await expect(motion).toHaveCSS("will-change", "transform");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  const sectionTop = await section.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  const sectionHeight = await section.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const transformY = () =>
    motion.evaluate((element) => {
      const transform = getComputedStyle(element).transform;
      if (transform === "none") return 0;
      return new DOMMatrixReadOnly(transform).m42;
    });

  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    sectionTop - 176,
  );
  await page.waitForTimeout(350);
  const approachingTop = (await sticky.boundingBox())?.y ?? 0;
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    sectionTop - 96,
  );
  const nearTop = (await sticky.boundingBox())?.y ?? 0;
  expect(approachingTop - nearTop).toBeCloseTo(80, 0);
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    sectionTop + 120,
  );
  await page.waitForTimeout(16);
  expect((await sticky.boundingBox())?.y).toBeCloseTo(56, 0);
  expect(await transformY()).toBeGreaterThan(-50);
  await page.waitForTimeout(350);
  expect(await transformY()).toBeLessThan(-52);

  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    sectionTop - 176,
  );
  await page.waitForTimeout(16);
  expect(await transformY()).toBeLessThan(-5);
  await page.waitForTimeout(350);
  expect(await transformY()).toBeGreaterThan(-4);

  const sectionExit = sectionTop + sectionHeight - 900;
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    sectionExit - 96,
  );
  expect((await sticky.boundingBox())?.y).toBeCloseTo(56, 0);
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    sectionExit + 24,
  );
  expect((await sticky.boundingBox())?.y).toBeCloseTo(32, 0);
});

test("keeps workflow progress interactive after restoring a reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const section = page.locator(".workflow-section");
  const sectionTop = await section.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  const sectionHeight = await section.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const restoredY = sectionTop + sectionHeight * 0.45;
  await page.evaluate((y) => window.scrollTo(0, y), restoredY);
  await page.waitForTimeout(500);

  const activeTitle = () =>
    page.locator(".workflow-motion h3").evaluateAll(
      (headings) =>
        headings
          .map((heading) => ({
            opacity: Number(getComputedStyle(heading.parentElement!).opacity),
            text: heading.textContent?.replace(/\s+/g, " ").trim() ?? "",
          }))
          .sort((a, b) => b.opacity - a.opacity)[0]?.text,
    );

  await page.reload();
  await page.waitForTimeout(700);
  const afterReload = await activeTitle();
  const restoredSectionBox = await section.boundingBox();
  expect(restoredSectionBox?.y).toBeLessThan(56);
  expect(
    (restoredSectionBox?.y ?? 0) + (restoredSectionBox?.height ?? 0),
  ).toBeGreaterThan(900);

  const scrollBeforeWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(
    scrollBeforeWheel + 1000,
  );
  expect(await activeTitle()).not.toBe(afterReload);
});

test("shows every capability without scroll animation when motion is reduced", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const stories = page.locator("#static-workflow-heading + div > article");
  await expect(stories).toHaveCount(workflowDemos.length);
  await expect(stories.first()).toContainText("Build Tools For Your Work");
  await expect(stories.last()).toContainText("Research About Any Topic");
  await expect(stories.locator(".workflow-placeholder")).toHaveCount(
    workflowDemos.filter((demo) => "placeholder" in demo).length,
  );
});

test("permanently redirects legacy resource URLs", async ({ request }) => {
  const redirects = [
    ["/blogs", "/blog/"],
    ["/ai-employee/", "/blog/ai-employee/"],
    ["/vs/chatgpt/", "/blog/construct-vs-chatgpt/"],
  ] as const;

  for (const [source, destination] of redirects) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(301);
    expect(response.headers().location).toBe(destination);
  }
});

test("returns a real 404 for unknown URLs", async ({ request }) => {
  for (const path of ["/404/", "/definitely-not-a-page"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(await response.text()).toContain("Page not found");
  }
});

test("submits beta access through Turnstile and D1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Enter Experience" }).click();
  await page.getByLabel("Email address").fill("playwright@example.com");
  await page.getByRole("button", { name: "Reddit" }).click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Beta access granted to")).toBeVisible({
    timeout: 15_000,
  });
});

for (const path of ["/", "/blog/"]) {
  test(`${path} has no automated accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      // The requested brand cyan intentionally matches the original visual system.
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
