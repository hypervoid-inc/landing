import { describe, expect, it } from "vitest";

import { APP_PROMPT_MAX_CHARS } from "../../platform/env";
import {
  continuationParams,
  parseShellCookie,
  returnKind,
  returnShell,
  serializeShellCookie,
  shellUrl,
} from "./shell-choice";

describe("shell choice", () => {
  it("opens each shell at its own origin and carries a prompt through", () => {
    expect(shellUrl("desktop")).toBe("https://os.construct.computer");
    expect(shellUrl("dashboard")).toBe("https://app.construct.computer");
    expect(shellUrl("dashboard", "Draft a brief & send it")).toBe(
      "https://app.construct.computer/?prompt=Draft%20a%20brief%20%26%20send%20it",
    );
    expect(shellUrl("desktop", "   ")).toBe("https://os.construct.computer");
    const long = "x".repeat(APP_PROMPT_MAX_CHARS + 50);
    expect(shellUrl("desktop", long)).toBe(
      `https://os.construct.computer/?prompt=${"x".repeat(APP_PROMPT_MAX_CHARS)}`,
    );
  });

  it("reads only a valid remembered shell", () => {
    expect(parseShellCookie("a=1; construct_shell=desktop; b=2")).toBe(
      "desktop",
    );
    expect(parseShellCookie("construct_shell=dashboard")).toBe("dashboard");
    expect(parseShellCookie("construct_shell=terminal")).toBeNull();
    expect(parseShellCookie("")).toBeNull();
  });

  it("shares the cookie across construct.computer only on the real domain", () => {
    const real = serializeShellCookie("dashboard", "construct.computer");
    expect(real).toMatch(
      /^construct_shell=dashboard; Domain=\.construct\.computer;/,
    );
    expect(real).toContain("SameSite=Lax");
    expect(real).toContain("Secure");
    expect(serializeShellCookie("desktop", "localhost")).not.toContain(
      "Domain=",
    );
  });

  it("carries only return params on to the app, and only on a return", () => {
    expect(continuationParams("")).toBeNull();
    expect(continuationParams("?prompt=hi&utm_source=x")).toBeNull();
    const paid = continuationParams(
      "?billing_status=success&status=active&email=a%40b.c&subscription_id=sub_1",
    );
    expect(paid?.toString()).toBe("billing_status=success&status=active");
    expect(shellUrl("dashboard", null, paid)).toBe(
      "https://app.construct.computer/?billing_status=success&status=active",
    );
    const portal = continuationParams("?open=settings&section=billing");
    expect(shellUrl("desktop", "Plan it", portal)).toBe(
      "https://os.construct.computer/?prompt=Plan%20it&open=settings&section=billing",
    );
    expect(continuationParams(`?open=file&path=${"x".repeat(2000)}`)?.has("path")).toBe(false);
  });

  it("names what the visitor came back from", () => {
    const kind = (q: string) => returnKind(continuationParams(q)!);
    expect(kind("?billing_status=success")).toBe("paid");
    expect(kind("?billing_status=success&status=active")).toBe("paid");
    expect(kind("?billing_status=success&status=processing")).toBe("paid");
    expect(kind("?billing_status=success&status=failed")).toBe("declined");
    expect(
      kind("?billing_status=success&status=requires_payment_method"),
    ).toBe("declined");
    expect(kind("?billing_status=failed")).toBe("declined");
    expect(kind("?billing_status=payment_method")).toBe("card");
    expect(kind("?billing_status=payment_method&status=failed")).toBe(
      "declined",
    );
    expect(kind("?billing_status=canceled")).toBe("canceled");
    // Unknown statuses get the default note, as the apps ignore them.
    expect(kind("?billing_status=weird")).toBe("link");
    expect(kind("?open=settings&section=billing")).toBe("billing");
    expect(kind("?open=home")).toBe("link");
  });

  it("returns to the remembered app, but never the desktop on a phone", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
    const phone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile";
    expect(returnShell("desktop", mac)).toBe("desktop");
    expect(returnShell("desktop", phone)).toBe("dashboard");
    expect(returnShell("dashboard", mac)).toBe("dashboard");
    expect(returnShell(null, mac)).toBeNull();
  });
});
