/** Types for `pricing.mjs`, which stays plain JS so build scripts can run it directly. */

export type ModelRates = {
  input: number;
  output: number;
  perImage?: number;
};

export declare const modelPricing: Record<string, ModelRates>;
export declare const defaultModel: string;

export declare function ratesFor(model: string): ModelRates;

export declare function costOf(
  model: string,
  usage:
    { promptTokenCount?: number; candidatesTokenCount?: number } | undefined,
): { input: number; output: number; usd: number };

export declare function formatUsd(value: number): string;
export declare function formatTokens(value: number): string;
