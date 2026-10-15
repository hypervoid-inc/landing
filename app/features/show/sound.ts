/**
 * The show's sound: a dozen short cues synthesised in the page from the same
 * voices as the launch film's score (video/scripts/score-launch.mjs), so the
 * two share one palette and nothing is downloaded. Everything sits in A minor
 * pentatonic: the wake plays the first half of a six-note motif, each finished
 * job adds a rising note, and the claim plays the whole motif.
 *
 * Browsers only start audio from a gesture, so the context is created on the
 * first tap inside the frame (the show's own "tap to wake"). Until then the
 * show is silent, and it never needs sound to make sense. The buffers are
 * rendered ahead of time in idle moments, so the first tap does no work.
 *
 * On iPhone, Web Audio follows the silent switch by default and mixes with the
 * viewer's own music. Only when the viewer turns sound on themselves do we ask
 * for the "playback" session, which plays through the switch.
 */

export type Cue =
  | "wake"
  | "blip"
  | "chip"
  | "pop"
  | "chime"
  | "whooshIn"
  | "whooshOut"
  | "lamp"
  | "crt"
  | "tick"
  | "note"
  | "stamp"
  | "birds"
  | "logo";

export type Sound = {
  readonly muted: boolean;
  /** Call from inside a tap: creates or resumes the audio context. */
  unlock(): void;
  /** `step` raises a "note" or "chip" cue along the motif's scale. */
  play(cue: Cue, opts?: { step?: number }): void;
  /** `byUser` marks a deliberate switch, which may take over the silent switch. */
  setMuted(muted: boolean, byUser?: boolean): void;
  subscribe(listener: (muted: boolean) => void): () => void;
  dispose(): void;
};

const STORE_KEY = "construct.show.muted";
export const SR = 48000;
const TAU = Math.PI * 2;
/** A minor pentatonic over two octaves, in semitones above A4. */
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19];
/** The motif: A C E G A C. */
const MOTIF = [0, 3, 7, 10, 12, 15];
const NOTE = (semis: number) => 440 * Math.pow(2, semis / 12);
const sec = (s: number) => Math.round(s * SR);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ── DSP, ported from the film's score ──────────────────────────────────────
let seed = 0x9167517;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;

class Biquad {
  b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0; z1 = 0; z2 = 0;
  set(type: "lp" | "hp" | "bp", freq: number, q = 0.707) {
    const f = clamp(freq, 10, SR * 0.45);
    const w = (TAU * f) / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    let b0: number, b1: number, b2: number;
    if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
    else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cw) / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x: number) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}
class OnePole {
  z = 0; a = 0;
  constructor(f: number) { this.a = 1 - Math.exp((-TAU * f) / SR); }
  run(x: number) { return (this.z += this.a * (x - this.z)); }
}
function tailFade(buf: Float32Array, n: number) {
  const L = buf.length;
  for (let i = Math.max(0, L - n); i < L; i++) buf[i]! *= (L - i) / n;
  return buf;
}
/** Adds `src` into `dst` at `at` seconds. */
function mixIn(dst: Float32Array, src: Float32Array, at: number, gain = 1) {
  const o = sec(at);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i]! += src[i]! * gain;
  return dst;
}
/** A small Schroeder room, mono in and out, for the motif cues. */
function room(input: Float32Array, wet = 0.22, decay = 0.78) {
  const combs = [1687, 1801, 2053, 2251].map((len) => ({ buf: new Float32Array(len), i: 0, lp: new OnePole(3200) }));
  const aps = [347, 113].map((len) => ({ buf: new Float32Array(len), i: 0 }));
  const out = new Float32Array(input.length);
  for (let n = 0; n < input.length; n++) {
    const x = input[n]!;
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i]!;
      c.buf[c.i] = x + c.lp.run(y) * decay;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    acc /= combs.length;
    for (const a of aps) {
      const d = a.buf[a.i]!;
      const y = -acc + d;
      a.buf[a.i] = acc + d * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      acc = y;
    }
    out[n] = x + acc * wet;
  }
  return tailFade(out, sec(0.08));
}

/** Electric-piano pluck: a filtered saw with a soft octave and a bell partial. */
function pluck(f: number, dur = 0.7) {
  const n = sec(dur), out = new Float32Array(n);
  let p = rnd(), po = 0, pb = 0;
  const lp = new Biquad();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 31) === 0) lp.set("lp", f * (1.3 + 4.5 * Math.exp(-t / 0.06)), 1.1);
    const dt = f / SR;
    let s = 2 * p - 1;
    if (p < dt) { const k = p / dt; s -= k + k - k * k - 1; }
    else if (p > 1 - dt) { const k = (p - 1) / dt; s -= k * k + k + k + 1; }
    p += dt; if (p >= 1) p -= 1;
    po += (TAU * f * 2) / SR; pb += (TAU * f * 3.01) / SR;
    out[i] = (lp.run(s) * 0.7 + Math.sin(po) * 0.25 * Math.exp(-t / 0.2) + Math.sin(pb) * 0.1 * Math.exp(-t / 0.09)) * Math.min(1, t / 0.002) * Math.exp(-t / 0.2);
  }
  return tailFade(out, sec(0.05));
}
/** Soft glass bell. */
function chime(f: number, dur = 1.0, decay = 0.34) {
  const n = sec(dur), out = new Float32Array(n);
  const parts = [[1, 1, 1], [2, 0.28, 0.55], [3.01, 0.12, 0.35], [5.43, 0.05, 0.18]] as const;
  const ph = parts.map(() => rnd());
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    parts.forEach(([m, g, d], k) => { v += Math.sin(TAU * (ph[k]! + f * m * t)) * g * Math.exp(-t / (decay * d)); });
    out[i] = v * Math.min(1, t / 0.003) * 0.6;
  }
  return tailFade(out, sec(0.06));
}
/** Bubbly pop: a sine falling fast onto its pitch, plus a tiny tick. */
function pop(f: number) {
  const n = sec(0.12), out = new Float32Array(n);
  const hp = new Biquad().set("hp", 2500);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 + 0.9 * Math.exp(-t / 0.012))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / 0.032) * Math.min(1, t / 0.0015) + hp.run(noise()) * 0.25 * Math.exp(-t / 0.002);
  }
  return tailFade(out, sec(0.004));
}
/** The pull-chain lamp: contact click, plastic body, low thunk, then the spring snapping over. */
function lamp() {
  const n = sec(0.34), out = new Float32Array(n);
  const hp = new Biquad().set("hp", 2800), body = new Biquad().set("bp", 1750, 3);
  const hp2 = new Biquad().set("hp", 4000), snap = new Biquad().set("bp", 3300, 4);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = noise();
    let v = hp.run(x) * 1.2 * Math.exp(-t / 0.0011) + body.run(x) * 1.7 * Math.exp(-t / 0.007);
    ph += (TAU * (150 + 90 * Math.exp(-t / 0.006))) / SR;
    v += Math.sin(ph) * 0.8 * Math.exp(-t / 0.03) * Math.min(1, t / 0.0008);
    if (t >= 0.042) {
      const tr = t - 0.042, y = noise();
      ph2 += (TAU * 310) / SR;
      v += hp2.run(y) * Math.exp(-tr / 0.0009) + snap.run(y) * 1.4 * Math.exp(-tr / 0.005) + Math.sin(ph2) * 0.3 * Math.exp(-tr / 0.02);
    }
    out[i] = v;
  }
  return tailFade(out, sec(0.008));
}
/** The CRT coming on: relay click, soft thump, a short in-key buzz and a fading coil whine. */
function crt(humHz = 110) {
  const n = sec(0.9), out = new Float32Array(n);
  const bp = new Biquad().set("bp", 420, 0.7), lp = new Biquad().set("lp", 2400), hp = new Biquad().set("hp", 3200);
  let p1 = 0, p2 = 0.37, ph = 0, wob = 0, w1 = 0, w2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (50 + 72 * Math.exp(-t / 0.03))) / SR;
    const thump = Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.12);
    p1 = (p1 + humHz / SR) % 1; p2 = (p2 + humHz / 2 / SR) % 1;
    wob += (5 + 9 * Math.exp(-t / 0.3)) / SR;
    const buzz = Math.tanh(lp.run(bp.run(2 * p1 - 1 + (2 * p2 - 1) * 0.6)) * 3) * Math.min(1, t / 0.01) * Math.exp(-t / 0.2) * (0.55 + 0.45 * Math.sin(TAU * wob));
    const wf = 5400 + 4200 * Math.exp(-t / 0.4);
    w1 += (TAU * wf) / SR; w2 += (TAU * wf * 1.5) / SR;
    const whine = (Math.sin(w1) + Math.sin(w2) * 0.3) * Math.min(1, t / 0.02) * Math.exp(-t / 0.25);
    out[i] = thump * 0.6 + buzz * 0.55 + whine * 0.04 + hp.run(noise()) * 0.5 * Math.exp(-t / 0.0015);
  }
  return tailFade(out, sec(0.06));
}
/** Wall-clock tick: a bright ring on a little wood. */
function tick() {
  const n = sec(0.07), out = new Float32Array(n);
  const hp = new Biquad().set("hp", 3600);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (hp.run(noise()) * 0.9 * Math.exp(-t / 0.0012) + Math.sin(TAU * 2130 * t) * 0.55 * Math.exp(-t / 0.007) + Math.sin(TAU * 830 * t) * 0.45 * Math.exp(-t / 0.012)) * Math.min(1, t / 0.0003);
  }
  return tailFade(out, sec(0.003));
}
/** Paper stamp: pad thud, die click, a breath of paper. */
function stamp() {
  const n = sec(0.24), out = new Float32Array(n);
  const lp = new Biquad().set("lp", 380, 0.8), hp = new Biquad().set("hp", 3000), bp = new Biquad().set("bp", 2300, 2), paper = new Biquad().set("bp", 950, 0.9);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = noise();
    ph += (TAU * (92 + 60 * Math.exp(-t / 0.012))) / SR;
    out[i] = Math.sin(ph) * 0.9 * Math.exp(-t / 0.05) * Math.min(1, t / 0.0015) + lp.run(x) * 1.2 * Math.exp(-t / 0.03) + hp.run(x) * 0.5 * Math.exp(-t / 0.0015) + bp.run(x) * 0.8 * Math.exp(-t / 0.006) + paper.run(x) * 0.5 * Math.exp(-t / 0.022);
  }
  return tailFade(out, sec(0.008));
}
/** Glass whoosh through the screen; `down` sweeps the other way, for coming back out. */
function whoosh(down: boolean, dur = 0.55, peakAt = 0.2) {
  const n = sec(dur), out = new Float32Array(n);
  const bp = new Biquad(), glass = new Biquad();
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = Math.min(1, t / (peakAt * 1.6));
    if ((i & 31) === 0) {
      const f = down ? 3600 * Math.pow(260 / 3600, p) : 260 * Math.pow(3600 / 260, p);
      bp.set("bp", f, 1.3); glass.set("bp", f * 2.1, 9);
    }
    const env = t < peakAt ? Math.pow(t / peakAt, 2.2) : Math.exp(-(t - peakAt) / 0.085);
    const x = noise();
    out[i] = (bp.run(x) * 1.5 + glass.run(x) * 1.1) * env;
  }
  return tailFade(out, sec(0.02));
}
/** One bird chirp: a sine that sweeps up, hooks down and trills. */
function chirp(f0: number, f1: number, dur: number) {
  const n = sec(dur), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n, t = i / SR;
    ph += (TAU * (f0 + (f1 - f0) * Math.sin(Math.PI * Math.min(1, p * 1.25) * 0.62) + 90 * Math.sin(TAU * 58 * t))) / SR;
    out[i] = (Math.sin(ph) + Math.sin(ph * 2) * 0.15) * Math.sin(Math.PI * p);
  }
  return out;
}
const blank = (s: number) => new Float32Array(sec(s));

/** Every cue, rendered once, with its level in dB (relative to a full-scale peak). */
export function renderCues(): Record<Cue, { data: Float32Array; db: number }> {
  const arp = (steps: number[], gap: number, tail: number) => {
    const out = blank(gap * steps.length + tail);
    steps.forEach((s, i) => mixIn(out, pluck(NOTE(s)), i * gap, 0.8));
    return out;
  };
  const wake = mixIn(arp(MOTIF.slice(0, 3), 0.085, 0.9), pop(523), 0, 0.5);
  mixIn(wake, chime(NOTE(MOTIF[2]! + 12), 0.9), 0.17, 0.25);
  const logo = arp(MOTIF, 0.075, 1.0);
  mixIn(logo, chime(NOTE(MOTIF[5]! + 12), 1.1), 0.375, 0.35);
  const reply = blank(1.1);
  mixIn(reply, chime(NOTE(15 + 12)), 0, 0.8);
  mixIn(reply, chime(NOTE(19 + 12)), 0.09, 0.7);
  const birds = blank(0.8);
  mixIn(birds, chirp(3300, 4500, 0.085), 0, 0.7);
  mixIn(birds, chirp(3600, 4800, 0.07), 0.13, 0.6);
  mixIn(birds, chirp(3100, 4200, 0.1), 0.42, 0.5);
  const night = mixIn(blank(0.9), lamp(), 0, 1);
  return {
    wake: { data: room(wake), db: -6 },
    blip: { data: pop(880), db: -14.5 },
    chip: { data: pluck(NOTE(SCALE[4]!), 0.5), db: -11 },
    pop: { data: pop(660), db: -10 },
    chime: { data: room(reply), db: -13 },
    whooshIn: { data: whoosh(false), db: -15 },
    whooshOut: { data: whoosh(true), db: -14.5 },
    lamp: { data: night, db: -4.5 },
    crt: { data: crt(), db: -14 },
    tick: { data: tick(), db: -12.5 },
    note: { data: room(pluck(NOTE(0), 0.8)), db: -9.5 },
    stamp: { data: stamp(), db: -5.5 },
    birds: { data: birds, db: -21.5 },
    logo: { data: room(logo, 0.28), db: -5 },
  };
}

/** Peak-normalises each cue to its level, so the dB table above is the mix. */
export function normalise(data: Float32Array, db: number) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
  const g = peak > 0 ? Math.pow(10, db / 20) / peak : 0;
  // Half a millisecond of fade-in: a transient that starts at full level clicks on some speakers.
  const head = sec(0.0005);
  for (let i = 0; i < data.length; i++) data[i]! *= g * (i < head ? i / head : 1);
  return data;
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

export function createSound(): Sound {
  let muted = readMuted();
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let rendered: Record<Cue, Float32Array> | null = null;
  const buffers = new Map<Cue, AudioBuffer>();
  const listeners = new Set<(m: boolean) => void>();
  /** The last time each cue played, so a burst of the same cue never stacks up. */
  const lastAt = new Map<Cue, number>();

  const render = () => {
    if (rendered) return rendered;
    const cues = renderCues();
    rendered = Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, normalise(v.data, v.db)])) as Record<Cue, Float32Array>;
    return rendered;
  };
  // Render while the poster sits idle, so the wake tap finds everything ready.
  const hasIdle = "requestIdleCallback" in window;
  const idleId = hasIdle ? window.requestIdleCallback(() => render(), { timeout: 1500 }) : window.setTimeout(() => render(), 400);

  const buffer = (cue: Cue) => {
    if (!ctx) return null;
    let b = buffers.get(cue);
    if (!b) {
      const data = render()[cue];
      b = ctx.createBuffer(1, data.length, SR);
      b.getChannelData(0).set(data);
      buffers.set(cue, b);
    }
    return b;
  };

  const sound: Sound = {
    get muted() {
      return muted;
    },
    unlock() {
      if (muted) return;
      try {
        if (!ctx) {
          const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return;
          ctx = new AC({ latencyHint: "interactive" });
          out = ctx.createGain();
          out.gain.value = 0.9;
          // A gentle limiter, so cues that overlap (the claim's stamp and motif) never distort.
          const limit = ctx.createDynamicsCompressor();
          limit.threshold.value = -9;
          limit.knee.value = 6;
          limit.ratio.value = 6;
          limit.attack.value = 0.002;
          limit.release.value = 0.15;
          out.connect(limit).connect(ctx.destination);
        }
        if (ctx.state !== "running") void ctx.resume().catch(() => undefined);
      } catch {
        ctx = null;
      }
    },
    play(cue, opts = {}) {
      if (muted || !ctx || !out || ctx.state === "closed") return;
      const now = ctx.currentTime;
      if (now - (lastAt.get(cue) ?? -1) < 0.045) return;
      lastAt.set(cue, now);
      const b = buffer(cue);
      if (!b) return;
      const src = ctx.createBufferSource();
      src.buffer = b;
      // A touch of pitch and level drift, so repeats never sound like a loop.
      const drift = cue === "wake" || cue === "logo" ? 0 : (Math.random() - 0.5) * 0.5;
      const step = opts.step === undefined ? 0 : SCALE[clamp(opts.step, 0, SCALE.length - 1)]!;
      src.playbackRate.value = Math.pow(2, (step + drift) / 12);
      const g = ctx.createGain();
      g.gain.value = Math.pow(10, ((Math.random() - 0.5) * 2) / 20);
      src.connect(g).connect(out);
      src.start(now + 0.001);
    },
    setMuted(next, byUser = false) {
      muted = next;
      try {
        localStorage.setItem(STORE_KEY, next ? "1" : "0");
      } catch {
        // Only a convenience across visits.
      }
      if (!next) {
        // Turning sound on by hand is a clear ask to hear it, even with the iPhone on silent.
        const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
        if (byUser && session) {
          try {
            session.type = "playback";
          } catch {
            // Older Safari: the silent switch still applies.
          }
        }
        sound.unlock();
      } else if (out && ctx) {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
        window.setTimeout(() => {
          if (muted && out) out.gain.value = 0;
        }, 120);
      }
      if (!next && out && ctx) out.gain.setTargetAtTime(0.9, ctx.currentTime, 0.015);
      listeners.forEach((fn) => fn(muted));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      listeners.clear();
      void ctx?.close().catch(() => undefined);
      ctx = null;
    },
  };
  return sound;
}
