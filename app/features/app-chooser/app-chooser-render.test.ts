import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "../auth/auth-provider";
import { AppChooserPage } from "./app-chooser-page";

// Escaped so the source itself stays free of the characters it checks for.
const DASHES = new RegExp("[\\u2013\\u2014]");

/**
 * `/app/` is prerendered before anyone's sign-in is known, so the HTML must
 * already offer both apps with working links and say nothing about who is
 * signed in.
 */
describe("app chooser", () => {
  it("prerenders both doors with working links and no site chrome", () => {
    const html = renderToString(
      createElement(AuthProvider, null, createElement(AppChooserPage)),
    );

    expect(html).toContain("How do you like to <em>work?</em>");
    expect(html).toContain('href="https://os.construct.computer"');
    expect(html).toContain('href="https://app.construct.computer"');
    expect(html).toContain("Open Desktop");
    expect(html).toContain("Open Dashboard");
    expect(html).toContain("Construct OS needs a laptop or desktop");
    // No theme chosen yet: CSS follows the system, the toggle offers dark.
    expect(html).not.toContain("data-theme");
    expect(html).toContain('aria-label="Switch to dark theme"');
    expect(html).not.toContain("Signed in as");
    expect(html).not.toContain("<nav");
    expect(html).not.toMatch(DASHES);
  });
});
