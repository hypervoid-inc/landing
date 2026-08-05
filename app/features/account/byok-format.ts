import type {
  ByokMode,
  ByokModel,
  ByokProvider,
  ByokSettings,
  ByokSlot,
  ByokUsage,
} from "../../platform/api/schemas";

export const PROVIDER_LABEL: Record<ByokProvider, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  bedrock: "Amazon Bedrock",
  xai: "xAI",
};

export const PROVIDER_KEY_HINT: Record<ByokProvider, string> = {
  openrouter: "Starts with sk-or-",
  openai: "Starts with sk-",
  anthropic: "Starts with sk-ant-",
  bedrock: "Access key ID and secret, joined by a colon",
  xai: "Starts with xai-",
};

export const SLOT_LABEL: Record<ByokSlot, string> = {
  main: "Main",
  subagent: "Subagents",
  vision: "Vision",
  coding: "Coding",
  compaction: "Compaction",
};

export const SLOT_HINT: Record<ByokSlot, string> = {
  main: "Drives the primary conversation.",
  subagent: "Used by delegated agents.",
  vision: "Handles images and screenshots.",
  coding: "Used for code generation and edits.",
  compaction: "Summarizes long histories.",
};

export const MODE_LABEL: Record<ByokMode, string> = {
  off: "Off",
  auto: "Automatic",
  exclusive: "Only my keys",
};

export const MODE_DESCRIPTION: Record<ByokMode, string> = {
  off: "Construct bills you for all inference.",
  auto: "Use your keys when they work, fall back to Construct otherwise.",
  exclusive: "Never fall back — requests fail if your keys are unavailable.",
};

/**
 * A stored key isn't necessarily a working one, and the difference matters:
 * "connected" with a dead key silently falls back (auto) or fails (exclusive).
 */
export type ProviderConnectionState =
  | "disconnected"
  | "connected"
  | "needs_attention";

export function providerConnectionState(
  settings: Pick<ByokSettings, "providers" | "providersReady">,
  provider: ByokProvider,
): ProviderConnectionState {
  if (!settings.providers[provider]) return "disconnected";
  return settings.providersReady[provider] ? "connected" : "needs_attention";
}

export function connectedProviderCount(
  settings: Pick<ByokSettings, "providers">,
): number {
  return Object.values(settings.providers).filter(Boolean).length;
}

export function readyProviderCount(
  settings: Pick<ByokSettings, "providersReady">,
): number {
  return Object.values(settings.providersReady).filter(Boolean).length;
}

/** Group models for a <select>, so a long flat list stays navigable. */
export function groupModelsByVendor(
  models: ByokModel[],
): Array<{ vendor: string; models: ByokModel[] }> {
  const groups = new Map<string, ByokModel[]>();
  for (const model of models) {
    const key = model.vendor || model.source || "Other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(model);
    else groups.set(key, [model]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([vendor, list]) => ({
      vendor,
      models: [...list].sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

/**
 * Vision is the one slot with a hard requirement — a model without it cannot
 * fill the slot at all.
 */
export function modelsForSlot(
  models: ByokModel[],
  slot: ByokSlot,
): ByokModel[] {
  if (slot !== "vision") return models;
  return models.filter((model) => model.capabilities?.vision !== false);
}

export function byokUsageTotals(usage: ByokUsage | undefined): {
  costUsd: number;
  tokens: number;
  isPartial: boolean;
} | null {
  if (!usage) return null;
  return {
    costUsd: usage.estimatedCostUsd,
    tokens: usage.promptTokens + usage.completionTokens,
    isPartial: usage.isPartial,
  };
}

export function formatTokens(n: number): string {
  if (n < 1_000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Copy for the locked state, naming the cheapest plan that unlocks BYOK. */
export function upgradeCopy(
  settings: Pick<ByokSettings, "requiredPlan" | "allowedPlans">,
): string {
  const target = settings.requiredPlan ?? settings.allowedPlans[0] ?? null;
  return target
    ? `Bring your own API keys on the ${target} plan and above.`
    : "Bring your own API keys on a paid plan.";
}
