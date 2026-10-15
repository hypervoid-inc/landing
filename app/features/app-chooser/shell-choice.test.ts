import { describe, expect, it } from "vitest";

import { APP_PROMPT_MAX_CHARS } from "../../platform/env";
import {
  parseShellCookie,
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
});
