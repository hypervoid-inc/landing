import { describe, expect, it } from "vitest";

import { normalise, renderCues, SR } from "./sound";

describe("show sound cues", () => {
  const cues = renderCues();

  it("renders every cue as finite, short audio", () => {
    for (const [name, { data }] of Object.entries(cues)) {
      expect(data.length, name).toBeGreaterThan(0);
      expect(data.length / SR, name).toBeLessThan(2);
      expect(data.every(Number.isFinite), name).toBe(true);
    }
  });

  it("normalises each cue to its level, never past full scale", () => {
    for (const [name, { data, db }] of Object.entries(cues)) {
      const out = normalise(Float32Array.from(data), db);
      const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(peak, name).toBeCloseTo(Math.pow(10, db / 20), 4);
      expect(peak, name).toBeLessThan(0.65);
    }
  });

  it("starts and ends every cue near silence, so nothing clicks", () => {
    for (const [name, { data }] of Object.entries(cues)) {
      const out = normalise(Float32Array.from(data), -6);
      expect(Math.abs(out[0]!), name).toBeLessThan(0.05);
      expect(Math.abs(out[out.length - 1]!), name).toBeLessThan(0.01);
    }
  });
});
