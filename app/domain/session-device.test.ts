import { describe, expect, it } from "vitest";
import {
  ChromeIcon,
  LaptopIcon,
  MicrosoftIcon,
  SafariIcon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { resolveSessionDevice } from "./session-device";

describe("resolveSessionDevice", () => {
  it("maps Chrome on macOS to Chrome icon + label", () => {
    const info = resolveSessionDevice({
      surface: "web",
      deviceLabel: null,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(info.icon).toBe(ChromeIcon);
    expect(info.label).toBe("Chrome on macOS");
    expect(info.browser).toBe("chrome");
    expect(info.deviceClass).toBe("laptop");
  });

  it("prefers Edge over Chrome when both appear in UA", () => {
    const info = resolveSessionDevice({
      surface: "web",
      deviceLabel: null,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    });
    expect(info.icon).toBe(MicrosoftIcon);
    expect(info.label).toBe("Edge on Windows");
  });

  it("maps Safari iPhone to Safari icon", () => {
    const info = resolveSessionDevice({
      surface: "web",
      deviceLabel: null,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    expect(info.icon).toBe(SafariIcon);
    expect(info.label).toBe("Safari on iOS");
    expect(info.deviceClass).toBe("phone");
  });

  it("uses surface icon for native apps", () => {
    const info = resolveSessionDevice({
      surface: "mobile_app",
      deviceLabel: null,
      userAgent: "ConstructMobile/1.0",
    });
    expect(info.icon).toBe(SmartPhone01Icon);
    expect(info.label).toBe("Mobile app");
  });

  it("prefers stored deviceLabel over UA-derived label", () => {
    const info = resolveSessionDevice({
      surface: "web",
      deviceLabel: "Office laptop",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(info.label).toBe("Office laptop");
    expect(info.icon).toBe(ChromeIcon);
  });

  it("falls back to laptop icon when browser unknown on Mac", () => {
    const info = resolveSessionDevice({
      surface: "web",
      deviceLabel: null,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    expect(info.icon).toBe(LaptopIcon);
    expect(info.label).toBe("macOS");
  });
});
