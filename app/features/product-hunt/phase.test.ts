import { describe, expect, it } from "vitest";

import { PH_GO_LIVE_MS, PH_END_MS } from "./config";
import {
  countdownParts,
  formatCountdownLabel,
  isProductHuntAuthPath,
  parsePhOverride,
  remainingUntilGoLive,
  resolveProductHuntPhase,
} from "./phase";
import { isPhBannerActive } from "./chrome";

describe("resolveProductHuntPhase", () => {
  it("returns pre before go-live", () => {
    expect(resolveProductHuntPhase(PH_GO_LIVE_MS - 1)).toBe("pre");
  });

  it("returns live at go-live", () => {
    expect(resolveProductHuntPhase(PH_GO_LIVE_MS)).toBe("live");
  });

  it("returns live until end exclusive of end", () => {
    expect(resolveProductHuntPhase(PH_END_MS - 1)).toBe("live");
    expect(resolveProductHuntPhase(PH_END_MS)).toBe("hidden");
  });

  it("honors ?ph= overrides", () => {
    expect(resolveProductHuntPhase(PH_GO_LIVE_MS - 1, "off")).toBe("hidden");
    expect(resolveProductHuntPhase(PH_END_MS + 1, "pre")).toBe("pre");
    expect(resolveProductHuntPhase(PH_GO_LIVE_MS - 1, "live")).toBe("live");
  });
});

describe("parsePhOverride", () => {
  it("reads ph query param", () => {
    expect(parsePhOverride("?ph=off")).toBe("off");
    expect(parsePhOverride("?clippy=off&ph=live")).toBe("live");
    expect(parsePhOverride("?ph=nope")).toBeNull();
  });
});

describe("countdown", () => {
  it("formats remaining time", () => {
    const parts = countdownParts(2 * 86_400_000 + 3 * 3600_000 + 4 * 60_000 + 5_000);
    expect(parts).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
    expect(formatCountdownLabel(parts)).toBe("2d 03h 04m 05s");
    expect(remainingUntilGoLive(PH_GO_LIVE_MS)).toBe(0);
  });
});

describe("isProductHuntAuthPath", () => {
  it("matches login and account with trailing slashes", () => {
    expect(isProductHuntAuthPath("/login")).toBe(true);
    expect(isProductHuntAuthPath("/login/")).toBe(true);
    expect(isProductHuntAuthPath("/account")).toBe(true);
    expect(isProductHuntAuthPath("/")).toBe(false);
  });
});

describe("isPhBannerActive", () => {
  it("requires pre or live phase", () => {
    expect(isPhBannerActive("pre")).toBe(true);
    expect(isPhBannerActive("live")).toBe(true);
    expect(isPhBannerActive("hidden")).toBe(false);
  });
});
