/**
 * Gemini image-generation rates, in USD per million tokens.
 *
 * Output images are billed as tokens, and the count scales with resolution
 * (1K ≈ 1120 tokens, 2K ≈ 1680, 4K ≈ 2520), so cost is computed from the
 * `usageMetadata` the API actually returns rather than from a per-image guess.
 * Reference images count as input tokens, which is why attaching four of them
 * is worth about a cent per call.
 *
 * Verified against ai.google.dev/gemini-api/docs/pricing on 2026-07-29. Rates
 * move; if a total looks wrong, check there first.
 */
export const modelPricing = {
  "gemini-3-pro-image": { input: 2.0, output: 120.0 },
  "gemini-3.1-flash-image": { input: 0.5, output: 60.0 },
  "gemini-3.1-flash-lite-image": { input: 0.25, output: 30.0 },
  // Older generation: output is billed flat per image, not per token.
  "gemini-2.5-flash-image": { input: 0.3, output: 0, perImage: 0.039 },
};

/**
 * Nano Banana 2, and the reason the set finally holds its mascot.
 *
 * `gemini-3-pro-image` was the default until 2026-08-09 and is a generation
 * older despite the "pro". On the same prompt and the same references it
 * produced the mascot correctly about one card in three — the rest came back
 * as bones, cubes, ghosts with legs, or two shapes joined end to end — and no
 * amount of rewriting the contract moved that number. Swapping to this model
 * fixed all three of the worst cards on the first try, and costs about 20% less
 * a call.
 *
 * It is also the model that is not being switched off: Google shuts down
 * several older image models, the pro preview among them, on 2026-08-17.
 */
export const defaultModel = "gemini-3.1-flash-image";

export function ratesFor(model) {
  const rates = modelPricing[model];
  if (!rates) {
    throw new Error(
      `No pricing for "${model}". Add it to scripts/og/pricing.mjs so runs stay costed.`,
    );
  }
  return rates;
}

/**
 * Cost of one call in USD. `usage` is Gemini's `usageMetadata`; missing counts
 * are treated as zero so a pricing gap never crashes a generation run.
 */
export function costOf(model, usage) {
  const rates = ratesFor(model);
  const input = usage?.promptTokenCount ?? 0;
  const output = usage?.candidatesTokenCount ?? 0;
  return {
    input,
    output,
    usd:
      (input / 1e6) * rates.input +
      (rates.perImage ?? 0) +
      (output / 1e6) * rates.output,
  };
}

/** Cents matter here — runs are single-digit dollars, so never round to 2dp. */
export function formatUsd(value) {
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

export function formatTokens(value) {
  return value.toLocaleString("en-US");
}
