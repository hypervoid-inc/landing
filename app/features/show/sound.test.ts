import { describe, expect, it } from "vitest";

import { normalise, renderCues, SR } from "./sound";

/** Power spectrum of a cue, averaged over Hann-windowed frames. */
function spectrum(x: Float32Array, n = 4096) {
  const acc = new Float64Array(n / 2);
  for (let s = 0; s < Math.max(1, x.length - n + 1); s += n / 2) {
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = (x[s + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    // In-place radix-2 FFT.
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j]!, re[i]!];
        [im[i], im[j]] = [im[j]!, im[i]!];
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
          const a = i + k, b = a + len / 2;
          const tr = re[b]! * wr - im[b]! * wi, ti = re[b]! * wi + im[b]! * wr;
          re[b] = re[a]! - tr; im[b] = im[a]! - ti;
          re[a] = re[a]! + tr; im[a] = im[a]! + ti;
        }
      }
    }
    for (let k = 0; k < n / 2; k++) acc[k]! += re[k]! * re[k]! + im[k]! * im[k]!;
  }
  return { acc, hz: (k: number) => (k * SR) / n };
}

describe("show sound cues", () => {
  const cues = renderCues();

  it("renders every cue as finite, short audio", () => {
    for (const [name, { data }] of Object.entries(cues)) {
      expect(data.length, name).toBeGreaterThan(0);
      expect(data.length / SR, name).toBeLessThan(2.5);
      expect(data.every(Number.isFinite), name).toBe(true);
    }
  });

  // Unpleasantness tracks energy at 2.5 to 5.5 kHz (Kumar et al. 2008); keep it
  // a sliver of every cue, and keep the spectral centroid low and warm.
  it("keeps every cue out of the ear's harsh band", () => {
    for (const [name, { data }] of Object.entries(cues)) {
      const { acc, hz } = spectrum(data);
      let total = 0, harsh = 0, weighted = 0;
      acc.forEach((p, k) => {
        total += p;
        weighted += p * hz(k);
        if (hz(k) >= 2500 && hz(k) < 5500) harsh += p;
      });
      expect(harsh / total, `${name} harsh share`).toBeLessThan(0.03);
      expect(weighted / total, `${name} centroid`).toBeLessThan(1300);
    }
  });

  it("balances cues by loudness and never runs hot", () => {
    for (const [name, { data, db }] of Object.entries(cues)) {
      const out = normalise(Float32Array.from(data), db);
      const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(peak, name).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(peak, name).toBeGreaterThan(0.005);
    }
  });

  it("starts and ends every cue near silence, so nothing clicks", () => {
    for (const [name, { data, db }] of Object.entries(cues)) {
      const out = normalise(Float32Array.from(data), db);
      expect(Math.abs(out[0]!), name).toBeLessThan(0.01);
      expect(Math.abs(out[out.length - 1]!), name).toBeLessThan(0.01);
    }
  });
});
