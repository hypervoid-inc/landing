import { describe, expect, it } from "vitest";

import type { ByokModel, ByokSettings } from "../../platform/api/schemas";
import {
  byokUsageTotals,
  connectedProviderCount,
  formatTokens,
  groupModelsByVendor,
  modelsForSlot,
  providerConnectionState,
  readyProviderCount,
  upgradeCopy,
} from "./byok-format";

const NO_PROVIDERS = {
  openrouter: false,
  openai: false,
  anthropic: false,
  bedrock: false,
  xai: false,
};

function settings(overrides: Partial<ByokSettings> = {}): ByokSettings {
  return {
    mode: "auto",
    ready: true,
    allowed: true,
    requiredPlan: "starter",
    allowedPlans: ["starter", "pro"],
    providers: { ...NO_PROVIDERS },
    providersReady: { ...NO_PROVIDERS },
    slots: {
      main: null,
      subagent: null,
      vision: null,
      coding: null,
      compaction: null,
    },
    monthlyLimitUsd: null,
    bedrockRegion: null,
    xaiAuth: null,
    ...overrides,
  };
}

function model(overrides: Partial<ByokModel> = {}): ByokModel {
  return {
    id: "anthropic/claude-opus-5",
    label: "Claude Opus 5",
    source: "openrouter",
    vendor: "Anthropic",
    status: "available",
    ...overrides,
  } as ByokModel;
}

describe("providerConnectionState", () => {
  it("reports disconnected when no key is stored", () => {
    expect(providerConnectionState(settings(), "openai")).toBe("disconnected");
  });

  it("reports connected when the stored key works", () => {
    const s = settings({
      providers: { ...NO_PROVIDERS, openai: true },
      providersReady: { ...NO_PROVIDERS, openai: true },
    });
    expect(providerConnectionState(s, "openai")).toBe("connected");
  });

  it("distinguishes a stored-but-broken key from a working one", () => {
    // This is the case that silently falls back on auto and hard-fails on
    // exclusive, so it must not read as plain "connected".
    const s = settings({
      providers: { ...NO_PROVIDERS, openai: true },
      providersReady: { ...NO_PROVIDERS },
    });
    expect(providerConnectionState(s, "openai")).toBe("needs_attention");
  });
});

describe("provider counts", () => {
  it("counts stored and working keys separately", () => {
    const s = settings({
      providers: { ...NO_PROVIDERS, openai: true, anthropic: true },
      providersReady: { ...NO_PROVIDERS, openai: true },
    });
    expect(connectedProviderCount(s)).toBe(2);
    expect(readyProviderCount(s)).toBe(1);
  });
});

describe("groupModelsByVendor", () => {
  it("groups by vendor and sorts both levels", () => {
    const grouped = groupModelsByVendor([
      model({ id: "b", label: "Zeta", vendor: "OpenAI" }),
      model({ id: "a", label: "Alpha", vendor: "OpenAI" }),
      model({ id: "c", label: "Gamma", vendor: "Anthropic" }),
    ]);

    expect(grouped.map((g) => g.vendor)).toEqual(["Anthropic", "OpenAI"]);
    expect(grouped[1]?.models.map((m) => m.label)).toEqual(["Alpha", "Zeta"]);
  });

  it("falls back to source when vendor is empty", () => {
    const grouped = groupModelsByVendor([
      model({ vendor: "", source: "bedrock" }),
    ]);
    expect(grouped[0]?.vendor).toBe("bedrock");
  });

  it("returns an empty list for no models", () => {
    expect(groupModelsByVendor([])).toEqual([]);
  });
});

describe("modelsForSlot", () => {
  const visionCapable = model({
    id: "v",
    capabilities: {
      tools: true,
      vision: true,
      reasoning: true,
      streaming: true,
    },
  });
  const textOnly = model({
    id: "t",
    capabilities: {
      tools: true,
      vision: false,
      reasoning: true,
      streaming: true,
    },
  });

  it("excludes non-vision models from the vision slot", () => {
    expect(modelsForSlot([visionCapable, textOnly], "vision")).toEqual([
      visionCapable,
    ]);
  });

  it("leaves other slots unfiltered", () => {
    expect(modelsForSlot([visionCapable, textOnly], "main")).toHaveLength(2);
  });

  it("keeps models that don't declare capabilities", () => {
    // Absent capability data shouldn't silently hide a usable model.
    expect(modelsForSlot([model()], "vision")).toHaveLength(1);
  });
});

describe("byokUsageTotals", () => {
  it("sums prompt and completion tokens", () => {
    expect(
      byokUsageTotals({
        periodStart: 1,
        estimatedCostUsd: 12.5,
        isPartial: true,
        promptTokens: 1000,
        completionTokens: 500,
        providers: [],
      }),
    ).toEqual({ costUsd: 12.5, tokens: 1500, isPartial: true });
  });

  it("returns null when there is no usage yet", () => {
    expect(byokUsageTotals(undefined)).toBeNull();
  });
});

describe("formatTokens", () => {
  it("abbreviates at thousand and million boundaries", () => {
    expect(formatTokens(999)).toBe("999");
    expect(formatTokens(1500)).toBe("1.5K");
    expect(formatTokens(2_500_000)).toBe("2.5M");
  });
});

describe("upgradeCopy", () => {
  it("names the required plan", () => {
    expect(upgradeCopy(settings())).toContain("starter");
  });

  it("falls back to the first allowed plan", () => {
    expect(
      upgradeCopy({ requiredPlan: null, allowedPlans: ["pro"] }),
    ).toContain("pro");
  });

  it("stays generic when the API names no plan", () => {
    expect(upgradeCopy({ requiredPlan: null, allowedPlans: [] })).toContain(
      "paid plan",
    );
  });
});
