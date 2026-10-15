import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * /app/, where emails send people to pick the desktop or the dashboard. The
 * API is stubbed so the signed-in and signed-out states are both exercised.
 */

const API = "https://api.construct.computer/api";

const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "ada",
  email: "ada@example.com",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  timezone: "Europe/London",
  onboardingCompleted: true,
  createdAt: "2026-03-14T10:00:00.000Z",
};

/** Echoes the origin: the client sends `credentials: "include"`. */
function json(route: Route, body: unknown, status = 200) {
  const origin = route.request().headers().origin ?? "http://localhost:8788";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

async function stubSession(page: Page, signedIn: boolean) {
  let session = signedIn;
  await page.route(`${API}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/logout")) {
      session = false;
      return json(route, { ok: true });
    }
    if (path.endsWith("/auth/me")) {
      return session
        ? json(route, USER)
        : json(route, { error: "Unauthorized" }, 401);
    }
    return json(route, {});
  });
}

test("offers both apps to a signed-out visitor, without site chrome", async ({
  page,
}) => {
  await stubSession(page, false);
  await page.goto("/app/");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "How do you like to work?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Desktop" }),
  ).toHaveAttribute("href", "https://os.construct.computer");
  await expect(
    page.getByRole("link", { name: "Open Dashboard" }),
  ).toHaveAttribute("href", "https://app.construct.computer");
  await expect(
    page
      .getByText("You'll sign in on the next screen. Same account in both.")
      .last(),
  ).toBeVisible();
  await expect(page.locator("nav")).toHaveCount(0);
  await expect(page.getByText("Signed in as")).toHaveCount(0);
});

test("shows who is signed in and lets them switch account", async ({
  page,
}) => {
  await stubSession(page, true);
  await page.goto("/app/");

  await expect(page.getByText("Signed in as Ada Lovelace")).toBeVisible();
  await page.getByRole("button", { name: "Not you?" }).click();
  await expect(page.getByText("Signed in as")).toHaveCount(0);
});

test("carries a prompt through to both apps", async ({ page }) => {
  await stubSession(page, true);
  await page.goto("/app/?prompt=Draft%20a%20brief");

  await expect(
    page.getByRole("link", { name: "Open Desktop" }),
  ).toHaveAttribute(
    "href",
    "https://os.construct.computer/?prompt=Draft%20a%20brief",
  );
  await expect(
    page.getByRole("link", { name: "Open Dashboard" }),
  ).toHaveAttribute(
    "href",
    "https://app.construct.computer/?prompt=Draft%20a%20brief",
  );
});

test("remembers the app this browser opened", async ({ page }) => {
  await stubSession(page, true);
  await page.route("https://app.construct.computer/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "dashboard" }),
  );
  await page.goto("/app/");
  await page.getByRole("link", { name: "Open Dashboard" }).click();
  await page.waitForURL("https://app.construct.computer/**");

  await page.goto("/app/");
  const dashboard = page.getByRole("region", { name: "Dashboard" });
  await expect(dashboard.getByText("Last used")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Desktop" }).getByText("Last used"),
  ).toHaveCount(0);
});

test("on a phone, leads with the dashboard and explains the desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubSession(page, false);
  await page.goto("/app/");

  await expect(page.getByRole("link", { name: "Open Desktop" })).toBeHidden();
  await expect(
    page.getByText("Construct OS needs a laptop or desktop."),
  ).toBeVisible();
  await expect(page.getByText("Best on your phone")).toBeVisible();

  const dashboardTop = (await page
    .getByRole("heading", { name: "Dashboard" })
    .boundingBox())!.y;
  const desktopTop = (await page
    .getByRole("heading", { name: "Desktop" })
    .boundingBox())!.y;
  expect(dashboardTop).toBeLessThan(desktopTop);
});

test("follows the system theme and remembers a switch", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await stubSession(page, false);
  await page.goto("/app/");

  const root = page.locator(".ac");
  await expect(root).not.toHaveAttribute("data-theme");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Switch to dark theme" }),
  ).toBeVisible();
});
