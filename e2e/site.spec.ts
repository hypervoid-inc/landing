import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

import { directoryListings } from "../app/content/directory-listings";
import { resourceEntries } from "../app/content/resources";
import {
  landingFaq,
  pricingPlans,
  workflowDemos,
} from "../app/content/landing";
import { canonicalRoutes } from "../app/lib/route-manifest";

const API = "https://api.construct.computer/api";

/** Jump without Lenis coasting, native scrollTo is overwritten mid-lerp. */
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
    // Compact OG thumb beside the title, not a full-column crop.
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
      path: "/blog/agent-task-half-life/",
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
    // Read the revision date off the entry rather than hardcoding one: every
    // post revised since would otherwise fail a test about author bylines.
    // The format mirrors `formatDate` in content-shell, which cannot be
    // imported here: it is a .tsx module and this runs outside the app build.
    const entry = resourceEntries.find(
      ({ slug }) => `/blog/${slug}/` === profile.path,
    )!;
    expect(Boolean(entry.updated), profile.path).toBe(profile.updated);
    if (entry.updated) {
      const revised = new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(`${entry.updated}T00:00:00Z`));
      await expect(author).toContainText(`Updated ${revised}`);
    } else {
      await expect(author).not.toContainText("Updated");
    }
    await expect(
      page.getByRole("list", { name: "Resource tags" }),
    ).toContainText(profile.tag);
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
      primary.getByRole("link", { name: "Blog", exact: true }),
    ).toHaveAttribute("href", "/blog/");
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

test("keeps sticky chrome visible when Start Now opens after scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await scrollPageInstant(page, 800);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(8);

  await page
    .locator("header")
    .getByRole("link", { name: "Start using Construct" })
    .click();

  const chrome = page.locator(".site-sticky-chrome");
  await expect(chrome).toBeInViewport();
  await expect(page.locator("header")).toBeInViewport();
  const box = await chrome.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(8);
  await expect(
    page.getByRole("dialog").getByRole("heading", {
      name: /Create your Construct account/i,
    }),
  ).toBeVisible();
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
    dialog.getByRole("link", { name: "Open Construct" }),
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
    dialog.getByRole("link", { name: "Open Construct" }),
  ).toBeVisible();
  await expect(dialog.getByText(/persistent cloud workspace/i)).toBeVisible();

  await dialog.getByRole("button", { name: "Stay on the site" }).click();
  await expect(dialog).toBeHidden();
});

test("reopens welcome from seeded post-login flag when authenticated", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Seed once per tab, subsequent navigations must not re-arm the flag.
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
    dialog.getByRole("link", { name: "Open Construct" }),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Stay on the site" }).click();
  await expect(dialog).toBeHidden();

  // Flag was consumed, a cold already-authed load must not re-open welcome.
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Welcome,\s*Ada/i }),
  ).toHaveCount(0);
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
  // ~8-10px and look like a wrapped row. Freeze scroll, park the pointer,
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

test("every landing button responds to a real click", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await context.route("https://app.construct.computer/", (route) =>
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
      const dialog = page.getByRole("dialog");
      // Held as a handle: on a slow runner the click can land and still
      // report a timeout, and the open dialog then hides every link behind it
      // from role queries, so looking the link up again would wait forever.
      const link = await links.nth(index).elementHandle();
      try {
        await links.nth(index).click({ timeout: 2_000 });
      } catch {
        if ((await dialog.count()) === 0) {
          await link?.evaluate((element) => {
            (element as HTMLAnchorElement).click();
          });
        }
      }
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
  // we temporearily commented and dont delete, section titles are hidden, so
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

test("guesses the page a mistyped URL meant", async ({ page }) => {
  await page.goto("/blog/zenmode");
  const guess = page.locator("main p", { hasText: "Did you mean" });
  await expect(guess.getByRole("link")).toHaveAttribute(
    "href",
    "/blog/zen-mode/",
  );
  // A miss on a parameterised route used to hydrate into two copies of the page.
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator(".nf-stage")).toHaveCount(1);

  await page.goto("/definitely-not-a-page");
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  await expect(page.getByText("Did you mean")).toHaveCount(0);
});

test("plays the 404 game from the keyboard and quits with Escape", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/definitely-not-a-page");
  const stage = page.getByRole("group", {
    name: "Catch the busywork, a mini game",
  });
  await expect(stage).toHaveAttribute("data-phase", "idle");
  await expect(stage).toContainText("It looks like you’re lost.");

  await stage.getByRole("button", { name: "Play" }).click();
  await expect(stage).toHaveAttribute("data-phase", "playing");
  await expect(stage).toBeFocused();

  // Parked in a corner the work piles up, so the round ends on its own.
  await page.keyboard.down("ArrowLeft");
  const again = stage.getByRole("button", { name: "Play again" });
  await expect(again).toBeFocused({ timeout: 60_000 });
  await page.keyboard.up("ArrowLeft");
  await expect(stage).toContainText("That’s a job for a computer");
  await expect(
    stage.getByRole("link", { name: "Give Construct the real ones" }),
  ).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "playing");
  await page.keyboard.press("Escape");
  await expect(stage).toHaveAttribute("data-phase", "idle");
});

test("keeps the 404 game still until Play under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/definitely-not-a-page");
  const stage = page.getByRole("group", {
    name: "Catch the busywork, a mini game",
  });
  const play = stage.getByRole("button", { name: "Play" });
  await expect(play).toBeEnabled();
  await expect(stage).toContainText("Fancy a quick game?");

  // Neither the keys nor a pass of the pointer starts anything.
  await page.keyboard.press("ArrowRight");
  await stage.hover();
  await expect(stage).toHaveAttribute("data-phase", "idle");

  await play.click();
  await expect(stage).toHaveAttribute("data-phase", "playing");
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

test("opens desktop Blog and Use Cases dropdowns to real pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const primary = page.getByRole("navigation", { name: "Primary" });
  const blog = primary.getByRole("link", { name: "Blog", exact: true });
  await blog.hover();
  const menu = primary.getByRole("group", { name: "Blog" });
  // `resourceEntries` is newest first, the order the /blog/ grid uses.
  const newest = resourceEntries.slice(0, 7);
  const posts = menu.getByRole("list").getByRole("link");
  await expect(posts).toHaveCount(newest.length);
  for (const [index, entry] of newest.entries()) {
    await expect(posts.nth(index)).toHaveAccessibleName(entry.title);
    await expect(posts.nth(index)).toHaveAttribute(
      "href",
      `/blog/${entry.slug}/`,
    );
  }
  await expect(menu.getByRole("link", { name: "All posts" })).toHaveAttribute(
    "href",
    "/blog/",
  );

  // Starts at the trigger, or as close to it as the right gutter allows.
  // Polled, because the panel's entry animation transforms its box.
  const triggerBox = (await blog.boundingBox())!;
  const panel = page.locator(".site-nav-panel");
  await expect
    .poll(async () => {
      const box = (await panel.boundingBox())!;
      const right = box.x + box.width;
      return (
        box.x <= triggerBox.x &&
        (Math.abs(right - (1280 - 16)) <= 1 ||
          Math.abs(box.x - triggerBox.x) < 16)
      );
    })
    .toBe(true);

  await posts.nth(1).hover();
  await expect(page.locator(".site-nav-preview")).toContainText(
    newest[1]!.title,
  );
  await posts.nth(1).click();
  await expect(page).toHaveURL(new RegExp(`/blog/${newest[1]!.slug}/$`));

  // The trigger is the section link itself.
  await page.goto("/");
  await blog.click();
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

  // Blog is a split row: the chevron lists the newest posts, the label links.
  await page.getByRole("button", { name: "Open menu" }).click();
  await menu.getByRole("button", { name: "Blog menu" }).click();
  await expect(
    menu.getByRole("link", { name: resourceEntries[0]!.title, exact: true }),
  ).toBeVisible();
  await menu.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
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

test("opens Blog from the keyboard, closes it with Escape, and follows it with Enter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const primary = page.getByRole("navigation", { name: "Primary" });
  const blog = primary.getByRole("link", { name: "Blog", exact: true });
  const allPosts = primary.getByRole("link", { name: "All posts" });
  await blog.focus();
  await page.keyboard.press("ArrowDown");
  await expect(blog).toHaveAttribute("aria-expanded", "true");
  await expect(allPosts).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(allPosts).toHaveCount(0);

  // Enter keeps its link meaning rather than toggling the menu.
  await blog.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/blog\/$/);
});

// A post is its own layout: the desktop rail, the related grid, and the FAQ
// list only exist here, so the index page's pass says nothing about them.
for (const path of [
  "/",
  "/blog/",
  "/blog/agent-task-half-life/",
  "/blog/grokbot-alternative/",
  // Tables, a long FAQ list, and a mid-article link.
  "/blog/best-ai-employee-platforms/",
  // The only post with a captioned video.
  "/blog/zen-mode/",
  // The only post whose figures sit in keyboard-reachable scroll regions.
  "/blog/agent-verification-gap/",
  "/pricing/",
  "/use-cases/memory/",
  // The 404 page: a focusable game stage with its own controls.
  "/definitely-not-a-page",
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
