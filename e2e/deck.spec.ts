import { expect, test } from "@playwright/test";

/**
 * The investor deck at /deck/: slides hosted here so replay and analytics
 * see them, kept out of search, and framing YouTube and nothing else.
 */

test("/deck/ frames YouTube only and stays out of search", async ({ request }) => {
  const response = await request.get("/deck/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const csp = response.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com;");
  expect(csp).not.toContain("figma");

  const slide = await request.get("/assets/deck/01.webp");
  expect(slide.status()).toBe(200);
  expect(slide.headers()["x-robots-tag"]).toContain("noindex");
});

test("/deck/ shows every slide and pages with the keyboard and the rail", async ({ page }) => {
  await page.goto("/deck/");
  const slides = page.locator("section[data-slide]");
  await expect(slides).toHaveCount(12);
  await expect(page.getByRole("img", { name: /^A squad of AI employees for your Team\./ })).toBeVisible();

  const rail = page.getByRole("navigation", { name: "Slides" });
  await expect(rail.getByRole("button")).toHaveCount(12);
  await expect(rail.getByRole("button", { name: "1. Cover" })).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("ArrowRight");
  await expect(rail.getByRole("button", { name: "2. Problem" })).toHaveAttribute("aria-current", "true");

  await rail.getByRole("button", { name: "12. Try it" }).click();
  await expect(rail.getByRole("button", { name: "12. Try it" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("link", { name: "Try Construct with code SEEDINVEST" })).toHaveAttribute(
    "href",
    "/?promo=SEEDINVEST&utm_source=deck",
  );
});

test("a deck video loads from YouTube only once it's played", async ({ page }) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ body: "" }));
  await page.goto("/deck/");
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Slides" }).getByRole("button", { name: "3. Solution" }).click();
  await page.locator("section[data-slide='2']").getByRole("button", { name: "Play Construct demo" }).first().click();
  await expect(page.locator('iframe[title="Construct demo"]')).toHaveAttribute(
    "src",
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/0lQWyT4PAA8\?autoplay=1&enablejsapi=1/,
  );
});

test("Download PDF asks for an email and checks it before sending", async ({ page }) => {
  const sends: number[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith("/api/deck/send")) sends.push(response.status());
  });
  await page.goto("/deck/");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const dialog = page.getByRole("dialog", { name: "Get the deck as a PDF" });
  await expect(dialog).toBeVisible();

  // Typing in the dialog never pages the deck behind it, which the modal
  // hides from the accessibility tree, hence the CSS locator.
  await dialog.getByPlaceholder("you@fund.com").fill("jane@example.com");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(800);
  await expect(page.locator('nav[aria-label="Slides"] [aria-current="true"]')).toHaveAttribute("aria-label", "1. Cover");

  // A reserved test domain passes Turnstile and is refused before any mail
  // goes out. Only reserved domains here: a local .dev.vars may hold a real
  // EMAIL_API_TOKEN, and anything deliverable would really be sent.
  const send = dialog.getByRole("button", { name: "Email me the PDF" });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(dialog.getByRole("alert")).toHaveText("That address can't take mail. Try another.");
  expect(sends).toEqual([400]);
});

test("the deck PDF is served for the email to attach, and kept out of search", async ({ request }) => {
  const response = await request.get("/assets/deck/construct-computer-deck.pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const body = await response.body();
  expect(body.subarray(0, 8).toString()).toBe("%PDF-1.4");
  expect(body.length).toBeLessThan(3.5 * 2 ** 20);
});

test("the bar under the slide pages back and forth", async ({ page }) => {
  await page.goto("/deck/");
  const where = page.getByRole("button", { name: /^All slides, on / });
  await expect(where).toHaveAccessibleName("All slides, on 1 of 12");
  await expect(page.getByRole("button", { name: "Previous slide" })).toBeDisabled();
  await page.getByRole("button", { name: "Next slide" }).click();
  await expect(where).toHaveAccessibleName("All slides, on 2 of 12");
  await page.getByRole("button", { name: "Previous slide" }).click();
  await expect(where).toHaveAccessibleName("All slides, on 1 of 12");
});

test("the last slide is reachable with Next and with End, focus on the bar", async ({ page }) => {
  await page.goto("/deck/");
  const where = page.getByRole("button", { name: /^All slides, on / });
  const next = page.getByRole("button", { name: "Next slide" });
  // Disabling the focused Next button as the jump landed used to stop it a slide short.
  for (let slide = 2; slide <= 12; slide++) {
    await next.click();
    await expect(where).toHaveAccessibleName(`All slides, on ${slide} of 12`);
  }
  await expect(next).toBeDisabled();
  await page.keyboard.press("Home");
  await expect(where).toHaveAccessibleName("All slides, on 1 of 12");
  await next.click();
  await page.keyboard.press("End");
  await expect(where).toHaveAccessibleName("All slides, on 12 of 12");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the deck is one scroll of full-width slides with the bar to find your way", async ({ page }) => {
    await page.goto("/deck/");
    await expect(page.getByRole("navigation", { name: "Slides" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const first = await page.locator("section[data-slide='0'] figure").boundingBox();
    expect(first!.width).toBeGreaterThan(360);

    const where = page.getByRole("button", { name: /^All slides, on / });
    await expect(where).toHaveAccessibleName("All slides, on 1 of 12");
    await where.click();
    const grid = page.getByRole("dialog", { name: "Slides" });
    await expect(grid.getByRole("button")).toHaveCount(13);
    await grid.getByRole("button", { name: "9. Business model" }).click();
    await expect(grid).toBeHidden();
    await expect(where).toHaveAccessibleName("All slides, on 9 of 12");
    await expect(page.locator("section[data-slide='8']")).toBeInViewport();

    await page.getByRole("button", { name: "Download PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Get the deck as a PDF" })).toBeVisible();
  });
});

test("a deck link unfurls into its own card, and preview bots may fetch it", async ({ request }) => {
  const html = await (await request.get("/deck/")).text();
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/construct\.computer\/og\/deck\.jpg\?v=[^"]+"\/>/);
  expect(html).toContain('<meta property="og:title" content="Construct Computer pre-seed deck"/>');
  expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');

  const card = await request.get("/og/deck.jpg");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/jpeg");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/User-agent: Twitterbot\nContent-Signal: [^\n]+\nAllow: \/\n/);
});
