/**
 * The show's sound: a handful of short, soft cues synthesised in the page, so
 * nothing is downloaded. Everything sits in A minor pentatonic: the wake plays
 * the first half of a six-note motif, each finished job adds a rising note,
 * and the claim plays the whole motif.
 *
 * Tuned to soothe, not to cut through (psychoacoustics, not taste):
 * - Unpleasantness tracks energy at 2.5 to 5.5 kHz, where the ear canal
 *   resonates (Kumar et al. 2008, JASA), so fundamentals sit at 220 to 660 Hz,
 *   every tone is low-passed from about 2.5 kHz and the output is shelved
 *   down above 3.8 kHz. Nothing is built from noise clicks.
 * - Fast onsets startle (Blumenthal 1988): taps rise over 3 to 8 ms, tones
 *   over 5 to 10 ms, air over about 60 ms.
 * - Kalimba and marimba-like sine tones, wood taps and bubble pops: musical
 *   timbres read clearly without being sharp (Brewster's earcon guidelines).
 * - Cues are matched by loudness (the loudest 100 ms), not by peak level, and
 *   kept few: repetition wears a sound out, so speech bubbles stay silent.
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
  | "dawn"
  | "logo";

export type Sound = {
  readonly muted: boolean;
  /** Moves the background music to a part of the show (music.ts SCENES). */
  scene(scene: Scene): void;
  /** Dips the music while a speech bubble is up: music makes reading harder. */
  duck(on: boolean): void;
  /** Fades the music out while `el` is scrolled out of view or the page is hidden. */
  observe(el: Element): void;
  /** Call from inside a tap: creates or resumes the audio context. */
  unlock(): void;
  /** `step` raises a "note" or "chip" cue along the motif's scale. */
  play(cue: Cue, opts?: { step?: number }): void;
  /** `byUser` marks a deliberate switch, which may take over the silent switch. */
  setMuted(muted: boolean, byUser?: boolean): void;
  subscribe(listener: (muted: boolean) => void): () => void;
  dispose(): void;
};

import { MUSIC_SR, SCENES, STEMS, type Scene, type Stem } from "./music";

const STORE_KEY = "construct.show.muted";
export const SR = 48000;
const TAU = Math.PI * 2;
/** A minor pentatonic over two octaves, in semitones above A3 (220 Hz). */
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19];
/** The motif: A C E G A C. */
const MOTIF = [0, 3, 7, 10, 12, 15];
const NOTE = (semis: number) => 220 * Math.pow(2, semis / 12);
const sec = (s: number) => Math.round(s * SR);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ── DSP (shared primitives with the film's score) ──────────────────────────────────────
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


/** A raised-cosine fade-in over `n` samples: soft, with no corner to click. */
const rise = (i: number, n: number) => (i >= n ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * i) / n));
/** Two one-pole low-passes in a row: a gentle 12 dB/octave roll-off. */
function soften(buf: Float32Array, cutoff: number) {
  const a = new OnePole(cutoff), b = new OnePole(cutoff);
  for (let i = 0; i < buf.length; i++) buf[i] = b.run(a.run(buf[i]!));
  return buf;
}

/**
 * A kalimba or soft marimba note: a sine fundamental, a soft octave and twelfth, and a
 * faint fourth partial that is gone within a few hundredths of a second (the
 * mallet), over a breath of low "felt". Rolled off from 2.6 kHz.
 */
function tone(f: number, { dur = 0.9, attack = 0.006, tau = 0.42 } = {}) {
  const n = sec(dur), out = new Float32Array(n);
  const felt = new Biquad().set("lp", 600, 0.7);
  const atk = sec(attack);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v =
      Math.sin(TAU * f * t) * Math.exp(-t / tau) +
      // An octave and a twelfth, soft: the part a phone speaker actually plays.
      Math.sin(TAU * 2 * f * t) * 0.24 * Math.exp(-t / (tau * 0.35)) +
      Math.sin(TAU * 3 * f * t) * 0.08 * Math.exp(-t / (tau * 0.15)) +
      Math.sin(TAU * 4 * f * t) * 0.045 * Math.exp(-t / 0.03) +
      felt.run(noise()) * 0.1 * Math.exp(-t / 0.008);
    out[i] = v * rise(i, atk);
  }
  return tailFade(soften(out, 2600), sec(0.06));
}
/** A bubble pop: a sine sweeping up onto its pitch over 30 ms, with a soft round tail. */
function bubble(f: number) {
  const n = sec(0.16), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * f * (0.55 + 0.45 * Math.min(1, t / 0.03))) / SR;
    out[i] = (Math.sin(ph) + Math.sin(2 * ph) * 0.08) * Math.exp(-t / 0.05) * rise(i, sec(0.004));
  }
  return tailFade(soften(out, 2000), sec(0.02));
}
/** A wood tap: a short sine that drops onto 880 Hz, like a small block. */
function wood(f = 880) {
  const n = sec(0.08), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 + 0.18 * Math.exp(-t / 0.006))) / SR;
    out[i] = (Math.sin(ph) + Math.sin(ph * 2.7) * 0.06 * Math.exp(-t / 0.01)) * Math.exp(-t / 0.018) * rise(i, sec(0.003));
  }
  return tailFade(soften(out, 2400), sec(0.01));
}
/** The pull-chain lamp, warmed: a low plastic body and a gentle snap, no hiss. */
function lamp() {
  const n = sec(0.3), out = new Float32Array(n);
  const body = new Biquad().set("bp", 1100, 2), snap = new Biquad().set("bp", 1500, 3);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = noise();
    ph += (TAU * (140 + 80 * Math.exp(-t / 0.006))) / SR;
    let v = body.run(x) * 1.1 * Math.exp(-t / 0.008) + Math.sin(ph) * 0.9 * Math.exp(-t / 0.035);
    if (t >= 0.045) v += snap.run(noise()) * 0.8 * Math.exp(-(t - 0.045) / 0.006);
    out[i] = v * rise(i, sec(0.002));
  }
  return tailFade(soften(out, 2200), sec(0.02));
}
/** The CRT coming on: a low thump and a short, warm hum. No coil whine. */
function crt(humHz = 110) {
  const n = sec(0.8), out = new Float32Array(n);
  const bp = new Biquad().set("bp", 300, 0.7);
  let p1 = 0, p2 = 0.37, ph = 0, wob = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (55 + 60 * Math.exp(-t / 0.04))) / SR;
    const thump = Math.sin(ph) * Math.exp(-t / 0.12);
    p1 = (p1 + humHz / SR) % 1; p2 = (p2 + humHz / 2 / SR) % 1;
    wob += 4 / SR;
    const hum = Math.tanh(bp.run(2 * p1 - 1 + (2 * p2 - 1) * 0.6) * 2) * Math.exp(-t / 0.22) * (0.75 + 0.25 * Math.sin(TAU * wob));
    out[i] = (thump * 0.7 + hum * 0.5) * rise(i, sec(0.015));
  }
  return tailFade(soften(out, 900), sec(0.08));
}
/** Paper stamp: the pad meeting the paper. Thud and paper, nothing bright. */
function stamp() {
  const n = sec(0.22), out = new Float32Array(n);
  const lp = new Biquad().set("lp", 380, 0.8), paper = new Biquad().set("bp", 900, 0.9);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = noise();
    ph += (TAU * (100 + 60 * Math.exp(-t / 0.012))) / SR;
    out[i] = (Math.sin(ph) * 0.9 * Math.exp(-t / 0.05) + lp.run(x) * 1.1 * Math.exp(-t / 0.03) + paper.run(x) * 0.4 * Math.exp(-t / 0.02)) * rise(i, sec(0.003));
  }
  return tailFade(soften(out, 1800), sec(0.02));
}
/** Soft air past the camera: band-passed noise sweeping between 300 Hz and 1.4 kHz. */
function air(down: boolean, dur = 0.5) {
  const n = sec(dur), out = new Float32Array(n);
  const bp = new Biquad();
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = i / n;
    if ((i & 31) === 0) bp.set("bp", down ? 1400 * Math.pow(300 / 1400, p) : 300 * Math.pow(1400 / 300, p), 0.9);
    const env = Math.sin(Math.PI * Math.pow(p, down ? 0.6 : 1.4));
    out[i] = bp.run(noise()) * env * rise(i, sec(0.06)) * (t >= 0 ? 1 : 0);
  }
  return tailFade(soften(out, 1600), sec(0.04));
}
/** Dawn: a C major chord blooming slowly, two sines a few cents apart per note. */
function dawn() {
  const n = sec(2.2), out = new Float32Array(n);
  const notes = [261.6, 329.6, 392.0, 523.3];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    notes.forEach((f, k) => { v += (Math.sin(TAU * f * 0.998 * t) + Math.sin(TAU * f * 1.002 * t + k)) * (k === 3 ? 0.5 : 1); });
    out[i] = v * rise(i, sec(0.35)) * Math.exp(-t / 0.9);
  }
  return tailFade(soften(out, 1500), sec(0.3));
}
const blank = (s: number) => new Float32Array(sec(s));

/** Every cue, rendered once, with its level: dBFS RMS over its loudest 100 ms. */
export function renderCues(): Record<Cue, { data: Float32Array; db: number }> {
  const arp = (steps: number[], gap: number, tail: number) => {
    const out = blank(gap * steps.length + tail);
    steps.forEach((s, i) => mixIn(out, tone(NOTE(s)), i * gap, 0.8));
    return out;
  };
  const wake = mixIn(arp(MOTIF.slice(0, 3), 0.12, 1.0), bubble(330), 0, 0.35);
  const logo = arp(MOTIF, 0.1, 1.1);
  mixIn(logo, dawn(), 0.5, 0.18);
  const reply = blank(1.0);
  mixIn(reply, tone(NOTE(15), { dur: 0.8 }), 0, 0.8);
  mixIn(reply, tone(NOTE(19), { dur: 0.8 }), 0.12, 0.7);
  return {
    wake: { data: room(wake, 0.18), db: -18 },
    chip: { data: tone(NOTE(SCALE[3]!), { dur: 0.5, tau: 0.22 }), db: -23 },
    pop: { data: bubble(392), db: -24 },
    chime: { data: room(reply, 0.18), db: -21 },
    whooshIn: { data: air(false), db: -27 },
    whooshOut: { data: air(true), db: -28 },
    lamp: { data: lamp(), db: -22 },
    crt: { data: crt(), db: -26 },
    tick: { data: wood(), db: -30 },
    note: { data: room(tone(NOTE(0)), 0.16), db: -21 },
    stamp: { data: stamp(), db: -21 },
    dawn: { data: dawn(), db: -24 },
    logo: { data: room(logo, 0.22), db: -17 },
  };
}

/**
 * Sets each cue's loudness: RMS over its loudest 100 ms window lands on `db`.
 * Matching by loudness rather than peak keeps a short bright tap from
 * sounding far louder than a round tone at the same peak.
 */
export function normalise(data: Float32Array, db: number) {
  const win = sec(0.1), hop = sec(0.025);
  let loudest = 0;
  for (let s = 0; s + 1 < Math.max(data.length - win, 1); s += hop) {
    let sum = 0;
    const end = Math.min(data.length, s + win);
    for (let i = s; i < end; i++) sum += data[i]! * data[i]!;
    loudest = Math.max(loudest, Math.sqrt(sum / win));
  }
  if (data.length <= win) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
    loudest = Math.sqrt(sum / win);
  }
  let g = loudest > 0 ? Math.pow(10, db / 20) / loudest : 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!) * g);
  if (peak > 0.5) g *= 0.5 / peak; // never hot, whatever the shape
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

  // ── background music ────────────────────────────────────────────────
  let stems: Record<Stem, Float32Array> | null = null;
  let worker: Worker | null = null;
  let musicOn = false;
  let current: Scene = "off";
  let visible = true;
  let observer: IntersectionObserver | null = null;
  let outroTimer = 0;
  const stemGain = new Map<Stem, GainNode>();
  let keysFilter: BiquadFilterNode | null = null;
  let duckGain: GainNode | null = null;
  let viewGain: GainNode | null = null;
  const sources: AudioBufferSourceNode[] = [];

  const renderMusic = () => {
    if (worker || stems) return;
    try {
      worker = new Worker(new URL("./music.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<Record<Stem, Float32Array>>) => {
        stems = event.data;
        worker?.terminate();
        worker = null;
        startMusic();
      };
      worker.postMessage(null);
    } catch {
      worker = null; // No workers: the show plays with cues only.
    }
  };

  /** Moves every layer toward a scene; `delay` holds off first, for the lights-out breath. */
  const applyScene = (scene: Scene, tau: number, delay = 0) => {
    if (!ctx || !musicOn) return;
    const at = ctx.currentTime + delay;
    const { gains, keysCutoff } = SCENES[scene];
    for (const name of STEMS) {
      const g = stemGain.get(name)!.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      if (delay) g.setTargetAtTime(0, ctx.currentTime, 0.05);
      g.setTargetAtTime(gains[name], at, tau);
    }
    keysFilter!.frequency.setTargetAtTime(keysCutoff, at, tau);
  };

  /** Starts every layer looping together, silent, once the audio and the stems are both ready. */
  const startMusic = () => {
    if (musicOn || !ctx || !out || !stems || ctx.state === "closed") return;
    keysFilter = ctx.createBiquadFilter();
    keysFilter.type = "lowpass";
    keysFilter.frequency.value = SCENES[current].keysCutoff;
    keysFilter.Q.value = 0.5;
    const bus = ctx.createGain();
    duckGain = ctx.createGain();
    viewGain = ctx.createGain();
    viewGain.gain.value = visible ? 1 : 0;
    keysFilter.connect(bus);
    bus.connect(duckGain).connect(viewGain).connect(out);
    const when = ctx.currentTime + 0.08;
    for (const name of STEMS) {
      const data = stems[name];
      const buffer = ctx.createBuffer(1, data.length, MUSIC_SR);
      buffer.getChannelData(0).set(data);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g).connect(name.endsWith("Keys") ? keysFilter : bus);
      stemGain.set(name, g);
      src.start(when);
      sources.push(src);
    }
    stems = null; // The buffers hold the audio now.
    musicOn = true;
    applyScene(current, 1.2);
  };

  const applyView = () => {
    const show = visible && document.visibilityState !== "hidden";
    if (ctx && viewGain) viewGain.gain.setTargetAtTime(show ? 1 : 0, ctx.currentTime, show ? 0.6 : 0.25);
  };
  const onVisibility = () => applyView();
  document.addEventListener("visibilitychange", onVisibility);

  const render = () => {
    if (rendered) return rendered;
    const cues = renderCues();
    rendered = Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, normalise(v.data, v.db)])) as Record<Cue, Float32Array>;
    return rendered;
  };
  // Render while the poster sits idle, so the wake tap finds everything ready.
  const hasIdle = "requestIdleCallback" in window;
  const warmUp = () => {
    render();
    renderMusic();
  };
  const idleId = hasIdle ? window.requestIdleCallback(warmUp, { timeout: 1500 }) : window.setTimeout(warmUp, 400);

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
          out.gain.value = 0.85;
          // A gentle limiter, so cues that overlap (the claim's stamp and motif) never distort.
          const limit = ctx.createDynamicsCompressor();
          limit.threshold.value = -9;
          limit.knee.value = 6;
          limit.ratio.value = 6;
          limit.attack.value = 0.002;
          limit.release.value = 0.15;
          // Gentle on the ears: shelve the presence band down, dip the ear-canal peak, cap the top.
          const shelf = ctx.createBiquadFilter();
          shelf.type = "highshelf"; shelf.frequency.value = 3800; shelf.gain.value = -5;
          const dip = ctx.createBiquadFilter();
          dip.type = "peaking"; dip.frequency.value = 3000; dip.Q.value = 0.8; dip.gain.value = -2.5;
          const cap = ctx.createBiquadFilter();
          cap.type = "lowpass"; cap.frequency.value = 9000; cap.Q.value = 0.5;
          out.connect(shelf).connect(dip).connect(cap).connect(limit).connect(ctx.destination);
        }
        if (ctx.state !== "running") void ctx.resume().catch(() => undefined);
        renderMusic();
        startMusic();
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
      const drift = cue === "wake" || cue === "logo" || cue === "dawn" ? 0 : (Math.random() - 0.5) * 0.6;
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
      if (!next && out && ctx) out.gain.setTargetAtTime(0.85, ctx.currentTime, 0.015);
      listeners.forEach((fn) => fn(muted));
    },
    scene(scene) {
      if (scene === current) return;
      current = scene;
      window.clearTimeout(outroTimer);
      // The end card should not loop forever: let it settle, then fade away.
      if (scene === "end") outroTimer = window.setTimeout(() => sound.scene("outro"), 45000);
      const tau = { off: 0.4, evening: 1.0, night: 0.9, dawn: 1.3, end: 1.0, outro: 2.2 }[scene];
      applyScene(scene, tau, scene === "night" ? 0.8 : 0);
    },
    duck(on) {
      if (ctx && duckGain) duckGain.gain.setTargetAtTime(on ? 0.5 : 1, ctx.currentTime, on ? 0.12 : 0.5);
    },
    observe(el) {
      observer?.disconnect();
      if (!("IntersectionObserver" in window)) return;
      // Inside an X post, the frame can scroll out of the timeline while still running.
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          visible = !entry || entry.intersectionRatio >= 0.35;
          applyView();
        },
        { threshold: [0, 0.35, 0.7] },
      );
      observer.observe(el);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      listeners.clear();
      window.clearTimeout(outroTimer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      worker?.terminate();
      sources.forEach((src) => {
        try {
          src.stop();
        } catch {
          // Already stopped.
        }
      });
      void ctx?.close().catch(() => undefined);
      ctx = null;
    },
  };
  return sound;
}
