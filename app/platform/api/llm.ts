import { apiRequest } from "./client";
import {
  ByokModelsResponseSchema,
  ByokSettingsSchema,
  type BedrockRegion,
  type ByokMode,
  type ByokProvider,
  type ByokSlots,
} from "./schemas";

export { BEDROCK_REGIONS, BYOK_PROVIDERS, BYOK_SLOTS } from "./schemas";
export type {
  BedrockRegion,
  ByokMode,
  ByokModel,
  ByokProvider,
  ByokProviderFlags,
  ByokSettings,
  ByokSlot,
  ByokSlots,
} from "./schemas";

export async function getByokSettings() {
  return apiRequest("/v1/llm/byok", { schema: ByokSettingsSchema });
}

export async function updateByokSettings(input: {
  mode?: ByokMode;
  /** null clears the limit. */
  monthlyLimitUsd?: number | null;
  slots?: Partial<ByokSlots>;
}) {
  return apiRequest("/v1/llm/byok", {
    method: "PATCH",
    schema: ByokSettingsSchema,
    body: JSON.stringify(input),
  });
}

/**
 * The key never reaches analytics: `scrubNetworkCapture` redacts request bodies
 * on /llm/byok before session replay records them.
 *
 * Responds 204 with no body, so no schema — parsing would reject an empty body.
 */
export async function setByokKey(
  provider: ByokProvider,
  apiKey: string,
  region?: BedrockRegion,
) {
  return apiRequest(`/v1/llm/byok/keys/${encodeURIComponent(provider)}`, {
    method: "PUT",
    body: JSON.stringify({ apiKey, ...(region ? { region } : {}) }),
  });
}

export async function removeByokKey(provider: ByokProvider) {
  return apiRequest(`/v1/llm/byok/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
}

/** Only returns models for providers with a working key. */
export async function getByokModels() {
  return apiRequest("/v1/llm/byok/models", {
    schema: ByokModelsResponseSchema,
  });
}
