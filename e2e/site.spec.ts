import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

import { resourceEntries } from "../app/content/resources";
import {
  landingFaq,
  pricingPlans,
  workflowDemos,
} from "../app/content/landing";
import { canonicalRoutes } from "../app/lib/route-manifest";

const API = "https://api.construct.computer/api";

/** Jump without Lenis coasting — native scrollTo is overwritten mid-lerp. */
async function scrollPageInstant(page: Page, top: number) {
  await page.evaluate((y) => {
    const hook = window.__scrollPageTo;
    if (typeof hook === "function") hook(y, { immediate: true });
    else window.scrollTo({ top: y, behavior: "instant" });
  }, top);
}

/** Matches static marketing fallbacks so layout/toggle specs stay stable. */
const HOMEPAGE_CATALOG = {
  recommendedPlan: "starter" as const,
  plans: [
    {
      id: "lite",
      name: "Lite",
      limits: {
        maxAgents: 1,
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
        trialDays: 7,
      },
      year: {
        price: { amount: 9000, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: 7,
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
        trialDays: null,
      },
      year: {
        price: { amount: 238800, currency: "USD" },
        listPrice: null,
        display: null,
        trialDays: null,
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

test("shows every resource once in one ordered image grid", async ({
  page,
}) => {
  await page.goto("/blog/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Construct insights and guides",
  );
  await expect(page.locator("main")).toContainText(
    "Practical writing from Construct on AI agents, workflows, memory, and tools that get work done.",
  );
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveText(
    "Home/Blog",
  );
  expect(
    (await page.getByRole("heading", { level: 1 }).boundingBox())?.height,
  ).toBeLessThan(116);
  await expect(page.locator("main")).not.toContainText("AI Employee Resources");

  const cards = page.locator("#all-resources-heading + ol > li");
  await expect(cards).toHaveCount(resourceEntries.length);
  await expect(cards.first().locator("img")).toBeVisible();
  await expect(cards.first()).toContainText(resourceEntries[0]!.title);
  const firstCard = cards.first();
  const title = await firstCard
    .getByRole("heading", { level: 3 })
    .boundingBox();
  const metadata = firstCard.locator(".resource-card-meta");
  const metadataBox = await metadata.boundingBox();
  expect(metadataBox?.y).toBeGreaterThan(
    (title?.y ?? 0) + (title?.height ?? 0),
  );
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  await expect(metadata).toHaveText(
    `${resourceEntries[0]!.kind} · ${formatDate(resourceEntries[0]!.published)} · ${resourceEntries[0]!.author.name}`,
  );
  await expect(metadata).toHaveCSS("white-space", "nowrap");
  await expect(metadata).toHaveCSS("overflow", "hidden");

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/blog/");
  const longestMetadata = page
    .getByRole("heading", { name: "Construct vs building your own AI agent" })
    .locator("..")
    .locator(".resource-card-meta");
  expect(
    await longestMetadata.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("shows MDX tags on article cards and article pages", async ({ page }) => {
  await page.goto("/blog/");
  const card = page
    .getByRole("heading", { name: "AI Agent vs Zapier Automation" })
    .locator("..")
    .locator("..");
  // Cards name their tag list after the post, so several on one page stay
  // distinguishable; the article's own list keeps the generic name.
  await expect(
    card.getByRole("list", { name: "Tags for AI Agent vs Zapier Automation" }),
  ).toContainText("zapier");

  await page.goto("/blog/ai-agent-vs-zapier/");
  await expect(page.getByRole("list", { name: "Resource tags" })).toContainText(
    "ai-agent",
  );
});

test("offers onward reading from a post on every viewport", async ({
  page,
}) => {
  const post = "/blog/agent-task-half-life/";

  // Desktop: the sticky rail is the only surface that is viewport-gated.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(post);
  const rail = page.getByRole("navigation", { name: "Read next" });
  await expect(rail).toBeVisible();
  const railLinks = rail.getByRole("link");
  await expect(railLinks).toHaveCount(3);
  for (const link of await railLinks.all()) {
    const href = await link.getAttribute("href");
    // Canonical trailing-slash internal links, per the project rule.
    expect(href).toMatch(/^\/blog\/[a-z0-9-]+\/$/);
    expect(href).not.toBe(post);
    // Compact OG thumb beside the title — not a full-column crop.
    const thumb = link.locator("img");
    await expect(thumb).toBeVisible();
    const box = await thumb.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(70);
    expect(box?.width ?? 0).toBeLessThan(140);
  }

  // The rail stays put while the article scrolls past it. Both samples are
  // taken after it has stuck: unscrolled it still sits at its natural offset.
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(300);
  const stuck = await rail.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 3200));
  await page.waitForTimeout(300);
  expect((await rail.boundingBox())?.y).toBeCloseTo(stuck?.y ?? -1, 0);
  // and it clears the sticky header (`lg:h-14` = 56px) rather than sliding under it.
  expect(stuck?.y ?? 0).toBeGreaterThanOrEqual(56);

  // The end-of-post grid is present at every width. Counted by card rather
  // than list item, since each card nests its own tag list.
  const related = page.getByRole("region", { name: "Keep reading" });
  await expect(related.getByRole("article")).toHaveCount(4);

  // Mobile: rail gone, grid and mid-article link remain.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(post);
  await expect(rail).toBeHidden();
  await expect(related.getByRole("article")).toHaveCount(4);
  await expect(
    page.getByRole("link", { name: "AI Workflow Automation" }).first(),
  ).toHaveAttribute("href", "/blog/ai-workflow-automation/");
});

test("shows the complete author profile on editorial resources", async ({
  page,
}) => {
  for (const profile of [
    {
      path: "/blog/ai-agent-vs-zapier/",
      name: "Ankush",
      image: "/authors/ankush.webp",
      twitter: "https://x.com/ankushKun_",
      handle: "@ankushKun_",
      tag: "ai-agent",
      updated: true,
    },
    {
      path: "/blog/ai-employee/",
      name: "Nischal",
      image: "/authors/nischal.webp",
      twitter: "https://x.com/naik_nischal",
      handle: "@naik_nischal",
      tag: "ai-employee",
      updated: true,
    },
    // Keeps the "never revised" byline branch covered: this post has no
    // `updated` frontmatter, so it must not render an Updated date.
    {
      path: "/blog/build-internal-tools-with-construct/",
      name: "Ankush",
      image: "/authors/ankush.webp",
      twitter: "https://x.com/ankushKun_",
      handle: "@ankushKun_",
      tag: "product",
      updated: false,
    },
    {
      path: "/blog/construct-vs-chatgpt/",
      name: "Construct Team",
      image: "/icon-192.png",
      twitter: "https://x.com/use_construct",
      handle: "@use_construct",
      tag: "comparison",
      updated: true,
    },
  ]) {
    await page.goto(profile.path);
    const author = page.getByRole("group", { name: "About the author" });
    await expect(
      author.getByRole("img", { name: profile.name }),
    ).toHaveAttribute("src", profile.image);
    await expect(
      author.getByRole("link", { name: profile.handle }),
    ).toHaveAttribute("href", profile.twitter);
    await expect(author).toContainText("Published");
    if (profile.updated) {
      await expect(author).toContainText("Updated July 27, 2026");
    } else {
      await expect(author).not.toContainText("Updated");
    }
    await expect(
      page.getByRole("list", { name: "Resource tags" }),
    ).toContainText(profile.tag);
  }
});

test("renders resource summaries as readable intro copy", async ({ page }) => {
  for (const path of [
    "/blog/ai-workflow-automation/",
    "/blog/construct-vs-chatgpt/",
  ]) {
    await page.goto(path);
    const summary = page.locator(".resource-content > p").first();
    await expect(summary).toHaveCSS("font-size", "16px");
    await expect(summary).toHaveCSS("line-height", "27.2px");
  }
});

test("uses one shared header, footer, and favicon across page types", async ({
  page,
  request,
}) => {
  for (const path of ["/", "/blog/", "/privacy/"]) {
    await page.goto(path);
    const primary = page.getByRole("navigation", { name: "Primary" });
    await expect(primary.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(
      primary.getByRole("button", { name: "Resources" }),
    ).toBeVisible();
    await expect(
      primary.getByRole("button", { name: "Use Cases" }),
    ).toBeVisible();
    await expect(
      primary.getByRole("button", { name: "Company" }),
    ).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Pricing" }),
    ).toHaveAttribute("href", "/pricing/");
    await primary.getByRole("button", { name: "Company" }).click();
    await expect(
      primary.getByRole("link", { name: "Affiliates" }),
    ).toHaveAttribute("href", "/affiliates/");
    await expect(page.locator("footer")).toContainText("Subscribe");
    await expect(page.locator("footer").getByLabel("Name")).toBeVisible();
    await expect(
      page.locator("footer").getByLabel("Email address"),
    ).toBeVisible();
    await expect(page.locator("footer")).toContainText("vs ChatGPT");
    await expect(page.locator("footer")).not.toContainText("Guides");
    await expect(
      page.getByRole("navigation", { name: "Company" }).getByRole("link", {
        name: "Affiliates",
      }),
    ).toHaveAttribute("href", "/affiliates/");
    await expect(
      page.locator("footer").getByRole("link", { name: /50% for first 25/ }),
    ).toHaveAttribute("href", "/affiliates/");
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
    await page.goto("/?ph=off");

    const header = await page.locator("header").boundingBox();
    const beta = page.getByRole("link", { name: "Start using Construct" });
    const betaBox = await beta.boundingBox();

    expect(header?.height).toBeGreaterThanOrEqual(48);
    expect(header?.height).toBeLessThanOrEqual(49);
    expect(betaBox?.height).toBeGreaterThanOrEqual(40);
    expect(betaBox?.x).toBeGreaterThanOrEqual(0);
    expect((betaBox?.x ?? 0) + (betaBox?.width ?? 0)).toBeLessThanOrEqual(
      width,
    );
    await expect(beta).toBeVisible();
    await expect(beta.locator(".sm\\:hidden")).toHaveText("Start now");
    await expect(
      page.locator("header").getByRole("link", { name: "Log in" }),
    ).toHaveCount(0);
    await expect(
      page.locator("header").getByRole("link", { name: "Affiliates" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  }
});

test("opens the auth dialog from Start Now without leaving the site", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator("header").getByRole("link", { name: "Log in" }),
  ).toHaveCount(0);

  await page
    .locator("header")
    .getByRole("link", { name: "Start using Construct" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Create your Construct account/i }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(dialog.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(
    dialog.getByText("Where did you learn about Construct?"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("opens post-login welcome from ?welcome=1 without auth", async ({
  page,
}) => {
  await page.goto("/?welcome=1");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /^Welcome$/i }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Open Construct OS" }),
  ).toBeVisible();
  await expect(dialog.getByText(/persistent cloud workspace/i)).toBeVisible();
  await dialog.getByRole("button", { name: "Stay on the site" }).click();
  await expect(dialog).toBeHidden();
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
    dialog.getByRole("link", { name: "Open Construct OS" }),
  ).toBeVisible();
  await expect(dialog.getByText(/persistent cloud workspace/i)).toBeVisible();

  await dialog.getByRole("button", { name: "Stay on the site" }).click();
  await expect(dialog).toBeHidden();
});

test("reopens welcome from seeded post-login flag when authenticated", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Seed once per tab — subsequent navigations must not re-arm the flag.
    if (
      sessionStorage.getItem("construct.landing.postLoginWelcome.seeded") ===
      "1"
    ) {
      return;
    }
    sessionStorage.setItem("construct.landing.postLoginWelcome.seeded", "1");
    sessionStorage.setItem(
      "construct.landing.postLoginWelcome",
      JSON.stringify({ source: "oauth-return", ts: Date.now() }),
    );
  });

  await page.route(`${API}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return fulfillJson(route, WELCOME_USER);
    if (path.endsWith("/v1/billing/plans")) {
      return fulfillJson(route, HOMEPAGE_CATALOG);
    }
    return fulfillJson(route, {});
  });

  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Welcome,\s*Ada/i }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Open Construct OS" }),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Stay on the site" }).click();
  await expect(dialog).toBeHidden();

  // Flag was consumed — a cold already-authed load must not re-open welcome.
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Welcome,\s*Ada/i }),
  ).toHaveCount(0);
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

  // Inline newsletter (name + email + Turnstile) is taller than the old CTA link.
  // CI Linux fonts sit a few px taller than macOS.
  expect(footer?.height).toBeLessThan(1100);
  expect(Math.abs((company?.y ?? 0) - (comparisons?.y ?? 0))).toBeLessThan(2);
  expect(comparisons?.x).toBeGreaterThan((company?.x ?? 0) + 100);
  await expect(companyNav).toHaveCSS("align-items", "center");
  await expect(comparisonsNav).toHaveCSS("align-items", "center");
  await expect(page.locator("footer").getByText(/^©/)).toHaveCSS(
    "text-align",
    "center",
  );
  await expect(
    page.locator("footer").getByRole("button", { name: "Subscribe" }),
  ).toBeVisible();
});

test("serves responsive atmosphere images with stable chip dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".landing-light-beams")).toHaveAttribute(
    "srcset",
    /light-beams-768\.webp 768w.+light-beams-1280\.webp 1280w.+light-beams\.webp 1728w/,
  );
  await expect(page.locator(".landing-clouds")).toHaveAttribute(
    "srcset",
    /clouds-768\.webp 768w.+clouds-1280\.webp 1280w.+clouds\.webp 1728w/,
  );
  expect(
    await page
      .locator(".landing-clouds")
      .evaluate((image) =>
        (image as HTMLImageElement).currentSrc.endsWith("clouds-768.webp"),
      ),
  ).toBe(true);

  const chips = page.locator(".hero-workflow img");
  await expect(chips).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(chips.nth(index)).toHaveAttribute("width", "256");
    await expect(chips.nth(index)).toHaveAttribute("height", "256");
  }
});

test("keeps lower landing sections proportional across desktop widths", async ({
  page,
}) => {
  const cases = [
    { width: 1024, workMinHeight: 610, pricingColumns: false },
    { width: 1280, workMinHeight: 758, pricingColumns: true },
    { width: 1440, workMinHeight: 854, pricingColumns: true },
    { width: 1920, workMinHeight: 934, pricingColumns: true },
  ] as const;

  let desktopHeadline = 0;

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: 1000 });
    await page.goto("/?ph=off");

    const workPanel = page.locator(".work-panel");
    const work = await workPanel.boundingBox();
    expect(work?.height).toBeGreaterThanOrEqual(item.workMinHeight);

    const loopCopy = await workPanel.locator("p").boundingBox();
    const workCta = await workPanel
      .getByRole("link", { name: "Start Now" })
      .boundingBox();
    expect(loopCopy).toBeTruthy();
    expect(workCta).toBeTruthy();
    expect((loopCopy?.y ?? 0) + (loopCopy?.height ?? 0)).toBeLessThanOrEqual(
      (work?.y ?? 0) + (work?.height ?? 0) + 1,
    );
    expect((workCta?.y ?? 0) + (workCta?.height ?? 0)).toBeLessThanOrEqual(
      (work?.y ?? 0) + (work?.height ?? 0) + 1,
    );

    if (item.width === 1440) {
      desktopHeadline = Number.parseFloat(
        await page
          .locator("#work-heading")
          .evaluate((element) => getComputedStyle(element).fontSize),
      );
    }

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

  expect(desktopHeadline).toBeGreaterThanOrEqual(31);
  expect(desktopHeadline).toBeLessThanOrEqual(33);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const phoneHeadline = Number.parseFloat(
    await page
      .locator("#work-heading")
      .evaluate((element) => getComputedStyle(element).fontSize),
  );
  const phoneLoop = Number.parseFloat(
    await page
      .locator(".work-panel > p")
      .evaluate((element) => getComputedStyle(element).fontSize),
  );
  expect(phoneHeadline).toBeGreaterThanOrEqual(16);
  expect(phoneHeadline).toBeLessThan(21);
  expect(phoneHeadline).toBeLessThan(desktopHeadline);
  expect(phoneLoop).toBe(phoneHeadline);
  const phoneLines = await page.locator("#work-heading").evaluate((element) => {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    return Math.round(element.getBoundingClientRect().height / lineHeight);
  });
  const phoneLoopLines = await page
    .locator(".work-panel > p")
    .evaluate((element) => {
      const lineHeight = Number.parseFloat(
        getComputedStyle(element).lineHeight,
      );
      return Math.round(element.getBoundingClientRect().height / lineHeight);
    });
  expect(phoneLines).toBe(2);
  expect(phoneLoopLines).toBe(2);

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const compactHeadline = Number.parseFloat(
    await page
      .locator("#work-heading")
      .evaluate((element) => getComputedStyle(element).fontSize),
  );
  expect(compactHeadline).toBeGreaterThanOrEqual(16);
  expect(compactHeadline).toBeLessThanOrEqual(phoneHeadline);
  const compactLines = await page
    .locator("#work-heading")
    .evaluate((element) => {
      const lineHeight = Number.parseFloat(
        getComputedStyle(element).lineHeight,
      );
      return Math.round(element.getBoundingClientRect().height / lineHeight);
    });
  const compactLoopLines = await page
    .locator(".work-panel > p")
    .evaluate((element) => {
      const lineHeight = Number.parseFloat(
        getComputedStyle(element).lineHeight,
      );
      return Math.round(element.getBoundingClientRect().height / lineHeight);
    });
  expect(compactLines).toBe(2);
  expect(compactLoopLines).toBe(2);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".landing-cta").first()).toHaveCSS(
    "background-color",
    "rgb(1, 180, 200)",
  );
  await expect(page.locator(".feature-grid .feature-card").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".work-section")).toHaveCSS("z-index", "0");
  const featureGrid = await page.locator(".feature-grid").boundingBox();
  const workPanel = await page.locator(".work-panel").boundingBox();
  expect(
    Math.abs((featureGrid?.width ?? 0) - (workPanel?.width ?? 0)),
  ).toBeLessThan(2);
});

test("contains the hero and fills the workflow screen across desktop sizes", async ({
  page,
}) => {
  const measure = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?ph=off");
    const headline = Number.parseFloat(
      await page
        .locator(".hero-headline-title")
        .evaluate((element) => getComputedStyle(element).fontSize),
    );
    const chrome = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--site-chrome-height")
        .trim();
      return Number.parseFloat(raw) || 56;
    });
    const stage = await page.locator(".hero-stage").boundingBox();
    const report = await page.locator(".hero-report").boundingBox();
    await page.locator(".workflow-section").scrollIntoViewIfNeeded();
    const screen = await page.locator(".workflow-screen").boundingBox();
    return { headline, chrome, stage, report, screen };
  };

  const laptop = await measure(1280, 800);
  const mid = await measure(1440, 900);
  const monitor = await measure(1920, 1080);

  expect(laptop.headline).toBeLessThan(monitor.headline);
  expect(laptop.report?.width ?? 0).toBeLessThan(monitor.report?.width ?? 0);
  expect(
    (laptop.stage?.y ?? 0) + (laptop.stage?.height ?? 0),
  ).toBeLessThanOrEqual(800 + 1);
  expect(laptop.stage?.y ?? 0).toBeGreaterThanOrEqual(laptop.chrome - 1);
  expect(mid.screen?.width ?? 0).toBeLessThan(monitor.screen?.width ?? 0);
});

test("keeps pricing artwork and plan details in separate readable zones", async ({
  page,
}) => {
  await stubPlanCatalog(page);
  for (const width of [320, 390, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?ph=off");

    // Layout geometry matches the original monthly price density.
    const monthly = page.getByRole("radio", { name: "Monthly" });
    await monthly.click();
    await expect(monthly).toHaveAttribute("aria-checked", "true");
    await expect(
      page
        .locator(".pricing-card")
        .nth(0)
        .locator(".pricing-price-amount-live"),
    ).toHaveText("$9", { timeout: 1000 });
    await page.locator("#pricing").scrollIntoViewIfNeeded();
    const cards = page.locator(".pricing-card");
    for (const i of [0, 1, 2]) {
      await cards.nth(i).scrollIntoViewIfNeeded();
      await expect(cards.nth(i)).toHaveAttribute("data-reveal-visible", "");
      await cards
        .nth(i)
        .evaluate((el) =>
          Promise.all(
            el.getAnimations().map((animation) => animation.finished),
          ),
        );
    }

    for (const plan of pricingPlans) {
      await expect(page.getByRole("button", { name: plan.cta })).toBeVisible();
    }

    await expect(cards.nth(0)).toContainText("Try Construct for yourself");
    await expect(
      cards.nth(0).getByText("Try Construct for yourself"),
    ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(cards.nth(0)).toContainText("5-minute command runtime");
    await expect(cards.nth(1)).toContainText("Recommended");
    await expect(cards.nth(1)).toHaveAttribute("data-recommended", "");
    await expect(cards.nth(0)).not.toHaveAttribute("data-recommended");
    await expect(cards.nth(2)).not.toHaveAttribute("data-recommended");
    await expect(cards.nth(1)).not.toContainText(
      "Daily agent work with email & schedules",
    );
    await expect(cards.nth(1)).toContainText("6× the usage of Lite");
    await expect(cards.nth(2)).not.toContainText(
      "Full desktop power + your own model keys",
    );
    await expect(cards.nth(2)).toContainText(
      "Deep runs - up to 1,000 steps per task",
    );
    await expect(cards.nth(2)).toContainText(
      "Bring your own model keys (BYOK)",
    );
    const starterBox = await cards.nth(1).boundingBox();
    const badge = cards.nth(1).locator(".pricing-badge");
    const badgeBox = await badge.boundingBox();
    await expect(badge).toHaveCSS("text-shadow", "none");
    await expect(badge).toHaveCSS("box-shadow", "none");
    await expect(badge).toHaveCSS("background-color", "rgb(1, 180, 200)");
    await expect(badge).toHaveCSS("top", width < 640 ? "16px" : "20px");
    // Sub-pixel tolerance: the CSS assertion above is the real contract, and
    // measured boxes land fractionally off it depending on font metrics and
    // device pixel ratio. A 0.5px window made this fail on a stock run.
    expect(
      Math.abs(
        (badgeBox?.y ?? 0) - (starterBox?.y ?? 0) - (width < 640 ? 16 : 20),
      ),
    ).toBeLessThan(1.5);
    expect(
      (starterBox?.x ?? 0) +
        (starterBox?.width ?? 0) -
        ((badgeBox?.x ?? 0) + (badgeBox?.width ?? 0)),
    ).toBeCloseTo(width < 640 ? 16 : 20, 0);
    await expect(page.locator("#pricing")).not.toContainText(
      "Concurrent Temporary Agent Jobs",
    );

    for (const card of await cards.all()) {
      await expect(card.locator(".pricing-image")).toHaveCSS("opacity", "1");
      await expect(card.locator(".pricing-visual")).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      const cardBox = await card.boundingBox();
      const visual = await card.locator(".pricing-visual").boundingBox();
      // Phone cards pan the art with translateX; strip that so we still
      // assert the image fills the visual, not the shifted paint box.
      const image = await card.locator(".pricing-image").evaluate((el) => {
        const box = el.getBoundingClientRect();
        const matrix = new DOMMatrix(getComputedStyle(el).transform);
        return {
          x: box.x - matrix.m41,
          y: box.y - matrix.m42,
          width: box.width,
          height: box.height,
        };
      });
      const summary = await card.locator(".pricing-summary").boundingBox();
      const price = await card.locator(".pricing-price").boundingBox();
      const button = await card.locator(".pricing-button").boundingBox();
      const benefits = await card.locator(".pricing-benefits").boundingBox();

      expect(image.x).toBeCloseTo(visual?.x ?? 0, 0);
      expect(image.y).toBeCloseTo(visual?.y ?? 0, 0);
      expect(image.width).toBeCloseTo(visual?.width ?? 0, 0);
      expect(image.height).toBeCloseTo(visual?.height ?? 0, 0);

      if (width < 640) {
        const heading = await card.locator(".pricing-heading").boundingBox();
        expect(visual?.y ?? 0).toBeCloseTo(cardBox?.y ?? 0, 0);
        expect((heading?.y ?? 0) + (heading?.height ?? 0)).toBeLessThanOrEqual(
          (visual?.y ?? 0) + (visual?.height ?? 0) + 1,
        );
        expect((summary?.y ?? 0) + (summary?.height ?? 0)).toBeLessThanOrEqual(
          (visual?.y ?? 0) + (visual?.height ?? 0) + 1,
        );
        expect((price?.y ?? 0) + (price?.height ?? 0)).toBeLessThanOrEqual(
          (visual?.y ?? 0) + (visual?.height ?? 0) + 1,
        );
        expect(benefits?.y ?? 0).toBeGreaterThan(
          (visual?.y ?? 0) + (visual?.height ?? 0) - 8,
        );
        expect(button?.y ?? 0).toBeGreaterThanOrEqual(
          (benefits?.y ?? 0) + (benefits?.height ?? 0) - 1,
        );
        expect((button?.x ?? 0) + (button?.width ?? 0)).toBeLessThanOrEqual(
          (cardBox?.x ?? 0) + (cardBox?.width ?? 0) - 11,
        );
        expect((cardBox?.y ?? 0) + (cardBox?.height ?? 0)).toBeLessThanOrEqual(
          900 + 1,
        );
        await expect(card.locator(".pricing-visual")).not.toHaveCSS(
          "mask-image",
          "none",
        );
      } else {
        expect((summary?.y ?? 0) + (summary?.height ?? 0)).toBeLessThanOrEqual(
          (visual?.y ?? 0) + (visual?.height ?? 0) + 1,
        );
        expect((visual?.width ?? 0) / (visual?.height ?? 1)).toBeCloseTo(
          870 / 608,
          2,
        );
        expect(button?.y).toBeLessThan(
          (visual?.y ?? 0) + (visual?.height ?? 0),
        );
        expect((price?.y ?? 0) + (price?.height ?? 0)).toBeLessThanOrEqual(
          (visual?.y ?? 0) + (visual?.height ?? 0) - 56,
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

    // .enterprise-panel is a `reveal-item`: an 1100ms translateY reveal. Measure
    // it mid-flight and the box reflects the transform, not the layout, which
    // reads as a spurious few-pixel gap error. Wait for the reveal to settle.
    const enterprise = page.locator(".enterprise-panel");
    await enterprise.scrollIntoViewIfNeeded();
    await expect(enterprise).toHaveAttribute("data-reveal-visible", "");
    await enterprise.evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    );

    // The mobile deck pins cards over the panel, so bounding boxes and
    // offsetTop both read the sticky overlap, not the in-flow gap. The
    // spacing contract is the panel's own margin.
    const gap = await enterprise.evaluate((el) =>
      parseFloat(getComputedStyle(el).marginTop),
    );
    expect(gap).toBeCloseTo(width < 1280 ? 20 : 28, 0);
  }
});

test("stacks the pricing plans into a deck on mobile", async ({ page }) => {
  await stubPlanCatalog(page);
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/?ph=off");

  const cards = page.locator(".pricing-card");
  await expect(cards.first()).toHaveCSS("position", "sticky");

  // Scroll far enough that every card has reached its pin. Instant: Lenis
  // and css smooth would otherwise ease the jump past a short timeout.
  await page.evaluate(() => {
    const panel = document.querySelector(".enterprise-panel");
    if (!panel) return;
    window.scrollTo({
      top: panel.getBoundingClientRect().top + window.scrollY - 160,
      behavior: "instant",
    });
  });
  for (const i of [0, 1, 2]) {
    await expect(cards.nth(i)).toHaveAttribute("data-reveal-visible", "");
    await cards
      .nth(i)
      .evaluate((el) =>
        Promise.all(el.getAnimations().map((animation) => animation.finished)),
      );
  }
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const pinned = [
          ...document.querySelectorAll<HTMLElement>(".pricing-card"),
        ];
        if (pinned.length !== 3) return Infinity;
        return Math.max(
          ...pinned.map((card) => {
            const top = Math.round(card.getBoundingClientRect().top);
            const pinnedAt = Math.round(parseFloat(getComputedStyle(card).top));
            return Math.abs(top - pinnedAt);
          }),
        );
      }),
    )
    .toBeLessThanOrEqual(1);

  const deck = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".pricing-card")].map((card) => {
      const box = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      return {
        top: Math.round(box.top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
        pinnedAt: Math.round(parseFloat(style.top)),
        shadow: style.boxShadow,
      };
    }),
  );

  expect(deck.length).toBe(3);
  for (const card of deck) {
    // Flush: every card pins at the same offset and the same width, so the
    // card in front covers the one behind it instead of leaving a strip.
    expect(card.top).toBe(deck[0]?.top);
    expect(card.left).toBe(deck[0]?.left);
    expect(card.width).toBe(deck[0]?.width);
    expect(Math.abs(card.top - card.pinnedAt)).toBeLessThanOrEqual(1);
    // The white skirt covers the taller card behind a shorter one.
    expect(card.shadow).toContain("rgb(255, 255, 255) 0px 120px 0px 4px");
    // One full card is on screen: the pin plus the card never run past the fold.
    expect(card.top + card.height).toBeLessThanOrEqual(780 + 1);
  }

  // The deck is a phone layout: the desktop columns stay in normal flow.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(cards.first()).toHaveCSS("position", "relative");
});

test("scrolls the journal cards as a snap carousel on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?ph=off");

  const grid = page.locator(".journal-grid");
  const gridTop = await grid.evaluate(
    (el) => el.getBoundingClientRect().top + window.scrollY,
  );
  await scrollPageInstant(page, gridTop - 180);
  await expect(grid).toHaveAttribute("data-reveal-visible", "");
  await grid.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  );

  await expect(grid).toHaveCSS("overflow-x", "auto");

  const cards = page.locator(".journal-card");
  await expect(cards).toHaveCount(3);

  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(second?.x ?? 0).toBeGreaterThan(first?.x ?? 0);
  expect(first?.width ?? 0).toBeLessThan(390);

  for (const [index, entry] of resourceEntries.slice(0, 3).entries()) {
    await expect(cards.nth(index).locator(".journal-card-hit")).toHaveAttribute(
      "href",
      `/blog/${entry.slug}/`,
    );
  }

  const startX = second?.x ?? 0;
  await grid.evaluate((el) => {
    const item = el.children[1];
    if (!(item instanceof HTMLElement)) return;
    el.scrollTo({ left: item.offsetLeft, behavior: "instant" });
  });
  await expect
    .poll(async () => {
      const box = await cards.nth(1).boundingBox();
      return box?.x ?? Infinity;
    })
    .toBeLessThan(startX - 40);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await grid.hover();
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
    .toBeGreaterThan(scrollBefore + 200);

  // Lenis still coasts after the +200 assertion, and the pointer is sitting
  // on a card. Either one makes sequential bounding-box reads disagree by
  // ~8–10px and look like a wrapped row. Freeze scroll, park the pointer,
  // then sample all three cards in one frame.
  const settledY = await page.evaluate(() => window.scrollY);
  await scrollPageInstant(page, settledY);
  await page.mouse.move(0, 0);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(grid).toHaveCSS("overflow-x", "visible");
  await grid.evaluate((el) => {
    el.scrollLeft = 0;
  });
  const desktop = await cards.evaluateAll((nodes) =>
    nodes.slice(0, 3).map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(Math.abs((desktop[0]?.y ?? 0) - (desktop[1]?.y ?? 0))).toBeLessThan(4);
  expect(Math.abs((desktop[0]?.y ?? 0) - (desktop[2]?.y ?? 0))).toBeLessThan(4);
  expect(desktop[1]?.x ?? 0).toBeGreaterThan(desktop[0]?.x ?? 0);
  expect(desktop[2]?.x ?? 0).toBeGreaterThan(desktop[1]?.x ?? 0);
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
  await expect(cards.nth(0)).toContainText("7-day trial");
  await expect(amount(cards.nth(1))).toHaveText("$39");
  await expect(cards.nth(1).locator(".pricing-price-was")).toHaveText("$59");
  await expect(cards.nth(1).locator(".pricing-price-savings")).toHaveText(
    "4 months free",
  );
  await expect(cards.nth(1)).not.toContainText("trial");
  await expect(amount(cards.nth(2))).toHaveText("$199");
  await expect(cards.nth(2).locator(".pricing-price-was")).toHaveText("$299");
  await expect(cards.nth(2)).not.toContainText("trial");
  await expect(page.locator("#pricing")).not.toContainText("billed");

  await monthly.click();
  await expect(monthly).toHaveAttribute("aria-checked", "true");
  await expect(amount(cards.nth(0))).toHaveText("$9", { timeout: 1000 });
  await expect(cards.nth(0)).toContainText("7-day trial");
  await expect(amount(cards.nth(1))).toHaveText("$59", { timeout: 1000 });
  await expect(amount(cards.nth(2))).toHaveText("$299", { timeout: 1000 });
  await expect(cards.nth(0).locator(".pricing-price-was")).not.toBeVisible();
  await expect(
    cards.nth(0).locator(".pricing-price-savings"),
  ).not.toBeVisible();
  await expect(cards.nth(1)).not.toContainText("trial");
  await expect(cards.nth(2)).not.toContainText("trial");

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

// Geometry contract predates the peek-layout hero CSS; not a navbar regression.
test.skip("keeps the landing hero clear and reserves lazy media space", async ({
  context,
  page,
}) => {
  await context.route("https://os.construct.computer/", (route) =>
    route.fulfill({ body: "ok" }),
  );
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/?ph=off");

    const stage = await page.locator(".hero-stage").boundingBox();
    const cta = await page
      .locator(".hero-copy")
      .getByRole("link", { name: "Start Now" })
      .boundingBox();
    const scene = await page.locator(".hero-scene").boundingBox();

    expect(
      (scene?.y ?? 0) - ((cta?.y ?? 0) + (cta?.height ?? 0)),
    ).toBeGreaterThanOrEqual(40);
    expect(scene?.height).toBeGreaterThanOrEqual(430);
    expect(
      Math.abs(
        (cta?.x ?? 0) +
          (cta?.width ?? 0) / 2 -
          ((stage?.x ?? 0) + (stage?.width ?? 0) / 2),
      ),
    ).toBeLessThan(2);
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 390, height: 1365 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/?ph=off");

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

    const headline = await page.locator(".hero-headline").boundingBox();
    const cta = await page
      .locator(".hero-copy")
      .getByRole("link", { name: "Start Now" })
      .boundingBox();
    expect(stage?.height).toBeGreaterThanOrEqual(
      viewport.height - (header?.height ?? 0) - 1,
    );
    expect(what?.y).toBeGreaterThanOrEqual(viewport.height - 1);
    expect((headline?.y ?? 0) - (header?.height ?? 0)).toBeGreaterThanOrEqual(
      24,
    );
    expect(
      (scene?.y ?? 0) - ((cta?.y ?? 0) + (cta?.height ?? 0)),
    ).toBeGreaterThanOrEqual(48);

    const fitsViewport =
      (stage?.height ?? 0) <= viewport.height - (header?.height ?? 0) + 1;
    if (fitsViewport) {
      expect(
        Math.abs((contentTop + contentBottom) / 2 - availableCenter),
      ).toBeLessThan(24);
    }
  }

  for (const viewport of [{ width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/?ph=off");

    const cta = await page
      .locator(".hero-copy")
      .getByRole("link", { name: "Start Now" })
      .boundingBox();
    expect((cta?.y ?? 0) + (cta?.height ?? 0)).toBeLessThanOrEqual(
      viewport.height + 1,
    );
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/?ph=off");

    const stage = await page.locator(".hero-stage").boundingBox();
    const nextSection = await page.locator("#what").boundingBox();
    expect(stage?.height).toBeGreaterThanOrEqual(viewport.height - 56);
    expect(nextSection?.y).toBeGreaterThanOrEqual(viewport.height);
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?ph=off");
  for (const layer of [
    ".hero-report",
    ".hero-chat",
    ".hero-search",
    ".hero-workflow",
  ]) {
    await expect(page.locator(layer)).toBeVisible();
  }
  await expect(page.locator(".hero-scene a")).toHaveCount(7);
  // Hero art opens the on-site auth dialog for anonymous visitors.
  await page
    .getByRole("link", { name: "Try Construct - research report" })
    .click();
  const heroDialog = page.getByRole("dialog");
  await expect(
    heroDialog.getByRole("heading", { name: /Create your Construct account/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(heroDialog).toHaveCount(0);
  const hero = await page.locator(".hero-stage").boundingBox();
  const what = await page.locator("#what").boundingBox();
  const sectionOverlap = (hero?.y ?? 0) + (hero?.height ?? 0) - (what?.y ?? 0);
  expect(sectionOverlap).toBeGreaterThan(40);
  expect(sectionOverlap).toBeLessThan(80);
  await expect(page.locator("#what")).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  // we temporearily commented and dont delete — section titles and body copy are hidden
  // await expect(page.locator("#what-heading")).toHaveCSS(
  //   "font-size",
  //   await page
  //     .locator("#adapts-heading")
  //     .evaluate((element) => getComputedStyle(element).fontSize),
  // );
  // await expect(page.locator("#what p").first()).toHaveCSS(
  //   "font-size",
  //   await page
  //     .locator("#adapts-heading + p")
  //     .evaluate((element) => getComputedStyle(element).fontSize),
  // );
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
  const whatSection = await page.locator("#what").boundingBox();
  expect((whatSection?.y ?? 0) - heroArtworkBottom).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Phone hero peeks the mascot at the bottom edge. Chat and one Gmail chip
  // sit on the visible half; the search bar arrives with the rest on scroll.
  const phoneViewport = { width: 390, height: 844 };
  await expect(page.locator(".hero-portal")).toBeVisible();
  await expect(page.locator(".hero-chat")).toBeVisible();
  await expect(page.locator(".hero-workflow")).toBeVisible();
  await expect(page.locator(".hero-workflow > :nth-child(2)")).toBeVisible();
  await expect(page.locator(".hero-workflow > :nth-child(1)")).toBeHidden();
  await expect(page.locator(".hero-workflow > :nth-child(3)")).toBeHidden();
  for (const hidden of [".hero-report", ".hero-ph-badge", ".hero-offer-line"]) {
    await expect(page.locator(hidden)).toBeHidden();
  }

  const portal = await page.locator(".hero-portal").boundingBox();
  const chat = await page.locator(".hero-chat").boundingBox();
  const chip = await page
    .locator(".hero-workflow > :nth-child(2)")
    .boundingBox();
  const search = await page.locator(".hero-search").boundingBox();
  const startNow = await page
    .locator(".hero-copy")
    .getByRole("link", { name: "Start Now" })
    .boundingBox();

  expect(portal?.y ?? 0).toBeGreaterThanOrEqual(0);
  expect(portal?.y ?? 0).toBeLessThan(phoneViewport.height);
  expect((portal?.y ?? 0) + (portal?.height ?? 0)).toBeGreaterThan(
    phoneViewport.height,
  );
  const peekRatio =
    (phoneViewport.height - (portal?.y ?? 0)) / (portal?.height ?? 1);
  expect(peekRatio).toBeGreaterThanOrEqual(0.4);
  expect(peekRatio).toBeLessThanOrEqual(0.6);

  expect((chat?.y ?? 0) + (chat?.height ?? 0)).toBeGreaterThan(0);
  expect(chat?.y ?? 0).toBeLessThan(phoneViewport.height);
  expect((chip?.y ?? 0) + (chip?.height ?? 0)).toBeGreaterThan(0);
  expect(chip?.y ?? 0).toBeLessThan(phoneViewport.height);
  expect(search?.y ?? 0).toBeGreaterThanOrEqual(phoneViewport.height);

  const boxesOverlap = (
    a: { x: number; y: number; width: number; height: number } | null,
    b: { x: number; y: number; width: number; height: number } | null,
  ) =>
    !!a &&
    !!b &&
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
  expect(boxesOverlap(chat, startNow)).toBe(false);
  expect(boxesOverlap(chip, startNow)).toBe(false);
  await expect(
    page.locator(".feature-grid .feature-card").first(),
  ).toHaveAttribute("width", "346");
  await expect(
    page.locator(".feature-grid .feature-card-wide"),
  ).toHaveAttribute("width", "712");
  const grid = await page.locator(".feature-grid").boundingBox();
  const wideCard = await page
    .locator(".feature-grid .feature-card-wide")
    .boundingBox();
  expect(grid?.height).toBeLessThan(600);
  expect(wideCard?.height).toBeLessThan(200);
  await expect(page.locator(".landing-clouds")).toHaveCSS(
    "position",
    "absolute",
  );
  await expect(page.locator("#pricing")).toHaveCSS("scroll-margin-top", "64px");
});

test("every landing button responds to a real click", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await context.route("https://os.construct.computer/", (route) =>
    route.fulfill({ body: "ok" }),
  );

  // Warm CTAs open the on-site auth dialog; footer keeps inline email + name.
  const startActions = [
    "Start using Construct",
    "Start Now",
    "Try Construct - Construct AI workspace",
    "Try Construct - research report",
    "Try Construct - agent chat",
    "Try Construct - workspace search",
    "Try Construct - Researched the Topic",
    "Try Construct - Replied to the Mails",
    "Try Construct - Prepared the Report",
    ...workflowDemos.map((demo) => demo.cta),
  ];

  for (const name of startActions) {
    const links = page.getByRole("link", { name, exact: true });
    const count = await links.count();
    expect(count, name).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      await page.mouse.move(0, 0);
      await links.nth(index).evaluate((element) => {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      });
      try {
        await links.nth(index).click({ timeout: 2_000 });
      } catch {
        await links.nth(index).evaluate((element) => {
          (element as HTMLAnchorElement).click();
        });
      }
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: /Create your Construct account/i }),
        `${name} #${index + 1}`,
      ).toBeVisible();
      await expect(
        dialog.getByRole("link", { name: "Continue with Google" }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Where did you learn about Construct?"),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Close dialog" }).click();
      await expect(dialog).toHaveCount(0);
    }
  }

  for (const plan of pricingPlans) {
    const cta = page.getByRole("button", { name: plan.cta, exact: true });
    await cta.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /Create your Construct account/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toHaveCount(0);
  }

  // The footer keeps the one email capture, for readers who are not ready yet.
  await expect(page.locator("footer").getByLabel("Name")).toBeVisible();
  await expect(
    page.locator("footer").getByLabel("Email address"),
  ).toBeVisible();
  await expect(
    page.locator("footer").getByRole("button", { name: "Subscribe" }),
  ).toBeVisible();

  await context.route("https://cal.com/construct/15min", (route) =>
    route.fulfill({ body: "ok" }),
  );
  const callPopupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Book A Call", exact: true }).click();
  const callPopup = await callPopupPromise;
  await expect(callPopup).toHaveURL("https://cal.com/construct/15min");
  await callPopup.close();

  await expect(
    page.getByRole("link", { name: "or send us an email", exact: true }),
  ).toHaveAttribute("href", "mailto:enterprise@construct.computer");
  await expect(
    page.getByRole("link", { name: "Send Us Hello", exact: true }),
  ).toHaveAttribute("href", "mailto:hello@construct.computer");

  for (const [name, href] of [
    ["X (Twitter)", "https://x.com/use_construct"],
    ["Discord", "https://discord.gg/puArEQHYN9"],
    ["LinkedIn", "https://linkedin.com/company/construct-computer"],
  ] as const) {
    await context.route(href, (route) => route.fulfill({ body: "ok" }));
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name, exact: true }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(href);
    await popup.close();
  }

  const internalLinks = await page
    .locator('a[href^="/"]')
    .evaluateAll((links) => [
      ...new Set(
        links.map((link) => link.getAttribute("href")).filter(Boolean),
      ),
    ]);
  for (const href of internalLinks) {
    if (!href || href === "/") continue;
    // /ph is a Pages Function that 302s off-site. Clicking it here would
    // leave construct.computer (or open a tab) instead of staying on a page.
    if (href === "/ph" || href.startsWith("/ph?")) continue;
    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page).toHaveURL(new URL(href, "http://localhost:8788").href);
    await page.goBack();
  }

  for (const item of landingFaq) {
    const trigger = page.getByRole("button", {
      name: item.question,
      exact: true,
    });
    await trigger.click();
    await expect(trigger).toHaveAttribute("data-state", "open");
    await expect(page.getByText(item.answer, { exact: true })).toBeVisible();
  }
});

test("keeps the workflow video pinned while the copy scrolls past it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const section = page.locator(".workflow-section");
  const viewer = page.locator(".workflow-viewer");
  const screen = page.locator(".workflow-screen");
  await section.scrollIntoViewIfNeeded();
  await expect(viewer).toHaveCSS("position", "sticky");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  const chromeHeight = await page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--site-chrome-height")
      .trim();
    return Number.parseFloat(raw) || 56;
  });
  const sectionTop = await section.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  const firstCard = page.locator(".workflow-panel").first();

  const goTo = async (y: number) => {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(120);
  };

  await goTo(sectionTop + 200);
  const pinnedScreen = await screen.boundingBox();
  const cardBefore = await firstCard.boundingBox();
  // Pinned right under the site chrome, not floating mid-section.
  expect(pinnedScreen?.y ?? 0).toBeGreaterThan(chromeHeight - 1);

  await goTo(sectionTop + 900);
  const stillPinned = await screen.boundingBox();
  const cardAfter = await firstCard.boundingBox();

  // The screen holds its place on screen while the copy travels up past it.
  expect(Math.abs((stillPinned?.y ?? 0) - (pinnedScreen?.y ?? 0))).toBeLessThan(
    2,
  );
  expect(cardAfter?.y ?? 0).toBeLessThan((cardBefore?.y ?? 0) - 600);

  // The section releases the screen once the copy runs out.
  const sectionHeight = await section.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await goTo(sectionTop + sectionHeight + 400);
  expect((await screen.boundingBox())?.y ?? 0).toBeLessThan(chromeHeight);
});

test("keeps the workflow rail vertical and the copy unboxed on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?ph=off");

  const section = page.locator(".workflow-section");
  const rail = page.locator(".workflow-stepper-rail");
  const screen = page.locator(".workflow-screen");
  const firstCard = page.locator(".workflow-card").first();
  await section.scrollIntoViewIfNeeded();

  const goTo = async (y: number) => {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(160);
  };

  const sectionTop = await section.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );

  await expect(rail).toBeVisible();
  await expect(page.locator(".workflow-stepper-inline")).toBeHidden();

  const filterOf = (locator: ReturnType<typeof page.locator>) =>
    locator.evaluate((element) => getComputedStyle(element).filter);

  await goTo(Math.max(0, sectionTop - 500));
  const enteringOpacity = await firstCard.evaluate((element) =>
    Number(getComputedStyle(element).opacity),
  );
  expect(enteringOpacity).toBeLessThan(0.2);
  const enteringRail = await rail.boundingBox();
  const enteringScreen = await screen.boundingBox();
  if (enteringRail && enteringScreen) {
    expect(Math.abs(enteringRail.y - enteringScreen.y)).toBeLessThan(36);
  }
  const enteringRailOpacity = await rail.evaluate((element) =>
    Number(getComputedStyle(element).opacity),
  );
  expect(Math.abs(enteringRailOpacity - enteringOpacity)).toBeLessThan(0.2);
  expect(await filterOf(rail)).not.toBe("none");

  let parkedY = sectionTop;
  const parkLimit = sectionTop + 900;
  while (parkedY <= parkLimit) {
    await goTo(parkedY);
    const card = await firstCard.boundingBox();
    const screenBox = await screen.boundingBox();
    const opacity = await firstCard.evaluate((element) =>
      Number(getComputedStyle(element).opacity),
    );
    if (
      opacity > 0.9 &&
      card &&
      screenBox &&
      Math.abs(card.y - screenBox.y) < 36
    ) {
      break;
    }
    parkedY += 80;
  }

  const railBox = await rail.boundingBox();
  const cardBox = await firstCard.boundingBox();
  const parkedScreen = await screen.boundingBox();
  expect((railBox?.x ?? 0) + (railBox?.width ?? 0)).toBeLessThanOrEqual(
    (cardBox?.x ?? 0) + 1,
  );
  expect(Math.abs((railBox?.y ?? 0) - (parkedScreen?.y ?? 0))).toBeLessThan(36);
  expect(Math.abs((cardBox?.y ?? 0) - (parkedScreen?.y ?? 0))).toBeLessThan(36);

  await expect(firstCard).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(firstCard).toHaveCSS("border-top-width", "0px");
  const parkedOpacity = await firstCard.evaluate((element) =>
    Number(getComputedStyle(element).opacity),
  );
  expect(parkedOpacity).toBeGreaterThan(0.9);

  const nextCard = page.locator(".workflow-card").nth(1);
  const nextOpacity = await nextCard.evaluate((element) =>
    Number(getComputedStyle(element).opacity),
  );
  expect(nextOpacity).toBeGreaterThan(0.3);
  expect(nextOpacity).toBeLessThan(0.6);
  expect(await filterOf(nextCard)).toBe("none");

  const lastCard = page.locator(".workflow-card").last();
  const penultimateCard = page
    .locator(".workflow-card")
    .nth(workflowDemos.length - 2);
  expect(await filterOf(lastCard)).toBe("none");
  expect(await filterOf(penultimateCard)).toBe("none");

  const sectionHeight = await section.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await goTo(sectionTop + sectionHeight * 0.7);
  expect(await filterOf(penultimateCard)).toBe("none");
  const midLast = await lastCard.boundingBox();
  const midScreen = await screen.boundingBox();
  if (midLast && midScreen && midLast.y <= midScreen.y + midScreen.height) {
    expect(await filterOf(lastCard)).toBe("none");
  }

  const lateRail = await rail.boundingBox();
  const lateScreen = await screen.boundingBox();
  expect(Math.abs((lateRail?.y ?? 0) - (lateScreen?.y ?? 0))).toBeLessThan(48);

  let leaveY = sectionTop + sectionHeight * 0.65;
  const leaveLimit = sectionTop + sectionHeight + 200;
  const chromePx = await page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--site-chrome-height")
      .trim();
    return Number.parseFloat(raw) || 56;
  });
  while (leaveY <= leaveLimit) {
    await goTo(leaveY);
    const lastBox = await lastCard.boundingBox();
    const screenBox = await screen.boundingBox();
    const viewerTop = await page
      .locator(".workflow-viewer")
      .evaluate((element) => element.getBoundingClientRect().top);
    const lastIsActive =
      (await lastCard.getAttribute("data-active")) === "true";
    if (
      lastIsActive &&
      lastBox &&
      screenBox &&
      viewerTop < chromePx - 1 &&
      lastBox.y + lastBox.height > screenBox.y + screenBox.height + 8
    ) {
      break;
    }
    leaveY += 80;
  }
  expect(await filterOf(lastCard)).not.toBe("none");
  expect(await filterOf(rail)).not.toBe("none");
  const leavingRailOpacity = await rail.evaluate((element) =>
    Number(getComputedStyle(element).opacity),
  );
  expect(leavingRailOpacity).toBeLessThan(0.9);
});

test("advances the active workflow card as the copy crosses the focus line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const section = page.locator(".workflow-section");
  const sectionTop = await section.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  const activeCard = page.locator('.workflow-panel[data-active="true"]');
  const activeVideo = page.locator(".workflow-screen-video[data-active]");

  const goTo = async (y: number) => {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(200);
  };

  await goTo(sectionTop + 200);
  // Exactly one card leads, and exactly one video is showing for it.
  await expect(activeCard).toHaveCount(1);
  await expect(activeVideo).toHaveCount(1);
  const firstTitle = await activeCard.locator("a.landing-cta").innerText();
  const firstTop = (await activeCard.boundingBox())?.y ?? 0;

  await goTo(sectionTop + 1400);
  await expect(activeCard).toHaveCount(1);
  await expect(activeVideo).toHaveCount(1);
  const secondTitle = await activeCard.locator("a.landing-cta").innerText();
  expect(secondTitle).not.toBe(firstTitle);

  // The card that was active has moved up and off, not stacked underneath.
  const handedOver = (await activeCard.boundingBox())?.y ?? 0;
  expect(handedOver).toBeGreaterThan(firstTop - 900);
});

test("opens the auth dialog from the animated workflow CTA", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/?ph=off");

    const section = page.locator(".workflow-section");
    const sectionTop = await section.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      sectionTop + 120,
    );
    await page.waitForTimeout(500);

    await page
      .getByRole("link", { name: workflowDemos[0]!.cta, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /Create your Construct account/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toHaveCount(0);
  }
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
  await scrollPageInstant(page, restoredY);
  await page.waitForTimeout(500);

  const activeTitle = () =>
    page
      .locator('.workflow-panel[data-active="true"] a.landing-cta')
      .innerText();

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
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
    .toBeGreaterThan(scrollBeforeWheel + 1000);
  const afterForwardScroll = await activeTitle();
  expect(afterForwardScroll).not.toBe(afterReload);

  await page.mouse.wheel(0, -1400);
  await expect
    .poll(() => activeTitle(), { timeout: 2000 })
    .not.toBe(afterForwardScroll);

  const liveSectionTop = await section.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  const liveSectionHeight = await section.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const videoRestoreY =
    liveSectionTop - 56 + (liveSectionHeight - 900 + 56) * 0.92;
  await scrollPageInstant(page, videoRestoreY);
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForTimeout(700);

  const restoredVideoTitle = await activeTitle();
  // we temporearily commented and dont delete — section titles are hidden, so
  // progress is keyed off the still-visible CTA labels.
  expect(["Collaborate", "Research a Topic"]).toContain(restoredVideoTitle);
  const activeVideo = page.locator(
    '.workflow-motion video[aria-hidden="false"]',
  );
  await expect(activeVideo).toHaveCount(1);

  await page.mouse.wheel(0, -1400);
  await expect
    .poll(() => activeTitle(), { timeout: 2000 })
    .not.toBe(restoredVideoTitle);
});

test("smooths document scroll with Lenis unless motion is reduced", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect
    .poll(() =>
      page.locator("html").evaluate((el) => el.classList.contains("lenis")),
    )
    .toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect
    .poll(() =>
      page.locator("html").evaluate((el) => el.classList.contains("lenis")),
    )
    .toBe(false);

  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 800);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
    .toBeGreaterThan(before + 200);
});

test("shows every capability without scroll animation when motion is reduced", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const stories = page.locator("#static-workflow-heading + div > article");
  await expect(stories).toHaveCount(workflowDemos.length);
  await expect(stories.first()).toContainText(
    "Turn Any Process Into A Workflow",
  );
  await expect(stories.first().locator("img")).toHaveAttribute(
    "src",
    "/assets/landing/workflows/workflow-poster.jpg",
  );
  await expect(stories.nth(1)).toContainText("Build Tools For Your Work");
  await expect(stories.last()).toContainText("Work Together Across Channels");
  for (const demo of workflowDemos) {
    if ("video" in demo) {
      const poster = stories.locator(`img[src="${demo.poster}"]`);
      await expect(poster).toHaveCount(1);
      await expect
        .poll(() =>
          poster.evaluate((image) => (image as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    }
  }
  await expect(stories.locator(".workflow-placeholder")).toHaveCount(
    workflowDemos.filter((demo) => "placeholder" in demo).length,
  );
});

test("redirects /security.txt to the well-known location", async ({
  request,
}) => {
  const response = await request.get("/security.txt", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe("/.well-known/security.txt");
});

/**
 * The RFC 9727 media type comes from `_headers`, not from the file, so only a
 * served response proves it. Same for the targets: a catalog whose links 404 is
 * worse than no catalog.
 */
test("serves a discoverable API catalog", async ({ request }) => {
  const response = await request.get("/.well-known/api-catalog");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "application/linkset+json",
  );

  const { linkset } = JSON.parse(await response.text());
  expect(linkset.length).toBeGreaterThan(0);

  for (const entry of linkset) {
    expect(entry.anchor).toBeTruthy();
    for (const relation of ["service-desc", "service-doc", "status"]) {
      for (const { href } of entry[relation]) {
        const target = await request.get(new URL(href).pathname);
        expect(target.status(), href).toBe(200);
      }
    }
  }
});

/**
 * Cloudflare merges the four `_headers` lines into one comma-separated Link
 * header. That merge only happens on a served response, so only a served
 * response can prove the relations survived it.
 */
test("advertises discovery documents in homepage Link headers", async ({
  request,
}) => {
  const response = await request.get("/");
  const link = response.headers().link ?? "";

  expect(link).toBeTruthy();
  for (const relation of [
    "api-catalog",
    "service-desc",
    "service-doc",
    "describedby",
  ]) {
    expect(link, relation).toContain(`rel="${relation}"`);
  }

  for (const [, target] of link.matchAll(/<([^>]+)>/g)) {
    expect((await request.get(target!)).status(), target).toBe(200);
  }
});

test("reports health for the site API", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "application/health+json",
  );
  expect((await response.json()).status).toBe("pass");
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

test("opens desktop Resources and Use Cases dropdowns to real pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const primary = page.getByRole("navigation", { name: "Primary" });
  await primary.getByRole("button", { name: "Resources" }).hover();
  await expect(
    primary.getByRole("link", { name: "Blog", exact: true }),
  ).toBeVisible();
  await primary.getByRole("link", { name: "vs Copilot" }).hover();
  await expect(page.locator(".site-nav-preview")).toContainText("vs Copilot");
  await primary.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/$/);

  await page.goto("/");
  await primary.getByRole("button", { name: "Use Cases" }).click();
  await primary.getByRole("link", { name: "Workflows" }).click();
  await expect(page).toHaveURL(/\/use-cases\/workflows\/$/);
});

test("renders dedicated pricing and use-case pages", async ({ page }) => {
  await page.goto("/pricing/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Simple Pricing" }),
  ).toBeVisible();
  await expect(page.locator("#pricing")).toBeVisible();

  await page.goto("/use-cases/memory/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Chat history is not memory you can audit",
  );
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Use Cases");
});

test("opens and closes the mobile nav sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();

  await menu.getByRole("button", { name: "Use Cases" }).click();
  await menu.getByRole("link", { name: "Workflows" }).click();
  await expect(page).toHaveURL(/\/use-cases\/workflows\/$/);
  await expect(menu).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("link", { name: "Start Now" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Create your Construct account/i }),
  ).toBeVisible();
});

test("keeps /launch to logo and CTA with no menu", async ({ page }) => {
  await page.goto("/launch/");
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(
    0,
  );
  await expect(
    page.locator("header").getByRole("link", { name: "Start using Construct" }),
  ).toBeVisible();
});

test("opens Resources from the keyboard and closes it with Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const resources = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name: "Resources" });
  await resources.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
      name: "Blog",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
      name: "Blog",
      exact: true,
    }),
  ).toHaveCount(0);
});

// A post is its own layout: the desktop rail, the related grid, and the FAQ
// list only exist here, so the index page's pass says nothing about them.
for (const path of [
  "/",
  "/blog/",
  "/blog/agent-task-half-life/",
  "/pricing/",
  "/use-cases/memory/",
]) {
  test(`${path} has no automated accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      // Display teal (#01b4c8) on white is still below body-text contrast.
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
