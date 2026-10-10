import { expect, test, type Page } from "@playwright/test";

/**
 * `?clippy=now` collapses the dwell delay to zero. A query param is the only
 * override that reaches a root mounted widget without bundler surgery, and it is
 * inert for a prerendered SPA.
 * `?ph=off` keeps sticky chrome header-only so Clippy geometry stays stable.
 * Clippy still waits for a trusted gesture (click, key, or wheel) before opening.
 */
const POST = "/blog/ai-agent-memory/?clippy=now&ph=off";

/** Harmless keydown that counts as the first interaction. */
async function engage(page: Page) {
  await expect(page.locator("main")).toBeVisible();
  // useEffect listeners attach after paint; a key before that is lost.
  await page.waitForTimeout(150);
  await page.keyboard.press("Shift");
}

async function gotoAndEngage(page: Page, url: string) {
  await page.goto(url);
  await engage(page);
}

test.beforeEach(async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  page.goto = ((url, options) => {
    const target = new URL(String(url), "http://localhost:8788");
    if (!target.searchParams.has("ph")) {
      target.searchParams.set("ph", "off");
    }
    return originalGoto(
      `${target.pathname}${target.search}${target.hash}`,
      options,
    );
  }) as typeof page.goto;
});

test("opens the auth dialog from the single CTA", async ({ page }) => {
  await gotoAndEngage(page, POST);

  const tip = page.getByRole("complementary", { name: "Construct" });
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("It looks like you're researching AI agents");
  await expect(tip.getByRole("button")).toHaveCount(1);
  await expect(tip.getByRole("link")).toHaveCount(1);

  // Scoped to the tip: blog bodies now carry their own inline CTAs, so an
  // unscoped link lookup matches those too.
  await tip.getByRole("link", { name: "Try Construct" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Create your Construct account/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});
