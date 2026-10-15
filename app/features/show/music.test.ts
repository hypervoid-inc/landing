import { describe, expect, it } from "vitest";

import { LOOP_SECONDS, MUSIC_SR, renderStems, SCENES, STEMS } from "./music";

describe("show music", () => {
  const stems = renderStems();

  it("renders every stem as one seamless, finite loop", () => {
    for (const name of STEMS) {
      const x = stems[name];
      expect(x.length, name).toBe(Math.round(LOOP_SECONDS * MUSIC_SR));
      expect(x.every(Number.isFinite), name).toBe(true);
      // The last sample runs into the first with no jump.
      expect(Math.abs(x[0]! - x[x.length - 1]!), name).toBeLessThan(0.05);
    }
  });

  it("stays soft: low peaks and almost nothing in the ear's harsh band", () => {
    const n = 2048;
    for (const name of STEMS) {
      const x = stems[name];
      const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(peak, name).toBeLessThan(0.35);
      let total = 0, harsh = 0;
      for (let s = 0; s + n < x.length; s += n * 16) {
        for (let k = 1; k < n / 2; k += 3) {
          const f = (k * MUSIC_SR) / n;
          let re = 0, im = 0;
          for (let i = 0; i < n; i++) {
            const v = x[s + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
            re += v * Math.cos((2 * Math.PI * k * i) / n);
            im -= v * Math.sin((2 * Math.PI * k * i) / n);
          }
          total += re * re + im * im;
          if (f >= 2500 && f < 5500) harsh += re * re + im * im;
        }
      }
      expect(harsh / total, name).toBeLessThan(0.01);
    }
  });

  it("keeps the poster and the outro silent", () => {
    for (const scene of ["off", "outro"] as const) {
      expect(Object.values(SCENES[scene].gains).every((g) => g === 0)).toBe(true);
    }
  });
});
