/**
 * The show's background music: a soft lo-fi bed, composed in code and
 * synthesised on the viewer's device (in a worker, see music.worker.ts), so
 * nothing is downloaded and it shares a key and a palette with the cues in
 * sound.ts.
 *
 * 80 BPM, eight-bar loops (24 s) that all start together and loop sample for
 * sample, so the show moves between them by fading layers in and out rather
 * than cutting:
 * - night: A minor (Am9, Fmaj9, Cmaj9, Em7) for the evening and the shift;
 * - morning: the lift to C major (Cmaj9, Fmaj9, Am9, G6) for dawn and after.
 * Each has warm electric-piano keys and a "warm" stem (a slow pad plus a
 * round bass); a soft beat is shared, and the morning adds a kalimba line.
 *
 * Gentle by construction, for the same reasons as the cues: nothing above
 * about 2.5 kHz to speak of (no hats, no vinyl crackle), slow attacks, no
 * tremolo, and levels well under the cues.
 */

export const MUSIC_SR = 24000;
export const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
export const LOOP_BARS = 8;
export const LOOP_SECONDS = BAR * LOOP_BARS;
const N = Math.round(LOOP_SECONDS * MUSIC_SR);
const TAU = Math.PI * 2;
const at = (beats: number) => Math.round(beats * BEAT * MUSIC_SR);
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type Stem = "nightKeys" | "nightWarm" | "morningKeys" | "morningWarm" | "beat" | "arp";
export const STEMS: Stem[] = ["nightKeys", "nightWarm", "morningKeys", "morningWarm", "beat", "arp"];

let seed = 0x5eed1e;
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
  set(type: "lp" | "bp", freq: number, q = 0.707) {
    const w = (TAU * Math.min(freq, MUSIC_SR * 0.45)) / MUSIC_SR, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
    const [b0, b1, b2] = type === "lp" ? [(1 - cw) / 2, 1 - cw, (1 - cw) / 2] : [al, 0, -al];
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
  z = 0; a: number;
  constructor(f: number) { this.a = 1 - Math.exp((-TAU * f) / MUSIC_SR); }
  run(x: number) { return (this.z += this.a * (x - this.z)); }
}
/** Two one-pole low-passes: a gentle 12 dB/octave roll-off. */
function soften(buf: Float32Array, cutoff: number) {
  const a = new OnePole(cutoff), b = new OnePole(cutoff);
  // Twice round the loop, so the filters' state at the seam matches the start.
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < buf.length; i++) {
    const y = b.run(a.run(buf[i]!));
    if (pass === 1) buf[i] = y;
  }
  return buf;
}
const rise = (i: number, n: number) => (i >= n ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * i) / n));

/** Adds a voice into the loop, wrapping past the end so the loop is seamless. */
function place(loop: Float32Array, start: number, voice: Float32Array, gain = 1) {
  for (let i = 0; i < voice.length; i++) loop[(start + i) % loop.length]! += voice[i]! * gain;
}

/** A soft, looped Schroeder room: run over two passes so its tail wraps into the start. */
function room(loop: Float32Array, wet: number, decay = 0.8) {
  const combs = [1123, 1201, 1367, 1499].map((len) => ({ buf: new Float32Array(len), i: 0, lp: new OnePole(2600) }));
  const aps = [229, 79].map((len) => ({ buf: new Float32Array(len), i: 0 }));
  const out = new Float32Array(loop.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let n = 0; n < loop.length; n++) {
      const x = loop[n]!;
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
      if (pass === 1) out[n] = x + acc * wet;
    }
  }
  return out;
}

/** Electric piano: a sine lightly frequency-modulated by itself, the "bark" fading as the note rings. */
function ep(f: number, beats: number, vel: number) {
  const len = Math.round((beats * BEAT + 0.6) * MUSIC_SR), out = new Float32Array(len);
  const held = beats * BEAT;
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    const index = 0.9 * vel * Math.exp(-t / 0.3) + 0.12;
    const v = Math.sin(TAU * f * t + index * Math.sin(TAU * f * t)) + Math.sin(TAU * 2 * f * t) * 0.06 * Math.exp(-t / 0.4);
    const release = t < held ? 1 : Math.exp(-(t - held) / 0.12);
    out[i] = v * vel * Math.exp(-t / 1.8) * release * rise(i, Math.round(0.008 * MUSIC_SR));
  }
  return out;
}
/** Pad: two slightly detuned soft tones per note, slow to arrive and leave. */
function pad(notes: number[], beats: number) {
  const len = Math.round(beats * BEAT * MUSIC_SR), out = new Float32Array(len);
  const fade = Math.round(0.5 * MUSIC_SR);
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    let v = 0;
    notes.forEach((m, k) => {
      const f = midi(m);
      v += Math.sin(TAU * f * 0.997 * t + k) + Math.sin(TAU * f * 1.003 * t) + Math.sin(TAU * 3 * f * t) * 0.08;
    });
    out[i] = v * rise(i, fade) * rise(len - 1 - i, fade);
  }
  return out;
}
/** Round bass: a sine with its octave and twelfth, so a phone speaker can imply it. */
function bass(f: number, beats: number, vel: number) {
  const len = Math.round((beats * BEAT + 0.15) * MUSIC_SR), out = new Float32Array(len);
  const held = beats * BEAT;
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    const v = Math.sin(TAU * f * t) + Math.sin(TAU * 2 * f * t) * 0.4 + Math.sin(TAU * 3 * f * t) * 0.12;
    const release = t < held ? 1 : Math.exp(-(t - held) / 0.05);
    out[i] = v * vel * Math.exp(-t / 1.2) * release * rise(i, Math.round(0.012 * MUSIC_SR));
  }
  return out;
}
/** Kalimba: a sine with a soft octave and a fast mallet partial. */
function kalimba(f: number, vel: number) {
  const len = Math.round(1.1 * MUSIC_SR), out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    const v = Math.sin(TAU * f * t) * Math.exp(-t / 0.45) + Math.sin(TAU * 2 * f * t) * 0.18 * Math.exp(-t / 0.12) + Math.sin(TAU * 4 * f * t) * 0.03 * Math.exp(-t / 0.02);
    out[i] = v * vel * rise(i, Math.round(0.006 * MUSIC_SR));
  }
  return out;
}
/** Lo-fi kick: a low sine dropping to 52 Hz, no click. */
function kick() {
  const len = Math.round(0.4 * MUSIC_SR), out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    ph += (TAU * (52 + 58 * Math.exp(-t / 0.03))) / MUSIC_SR;
    out[i] = (Math.sin(ph) + Math.sin(2 * ph) * 0.25) * Math.exp(-t / 0.16) * rise(i, Math.round(0.004 * MUSIC_SR));
  }
  return out;
}
/** A soft rim: a little body and a dull knock, low-passed. */
function rim() {
  const len = Math.round(0.14 * MUSIC_SR), out = new Float32Array(len);
  const bp = new Biquad().set("bp", 1300, 1.2);
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    out[i] = (bp.run(noise()) * 0.9 * Math.exp(-t / 0.03) + Math.sin(TAU * 220 * t) * 0.6 * Math.exp(-t / 0.04)) * rise(i, Math.round(0.003 * MUSIC_SR));
  }
  return out;
}
/** A brush: a breath of band-passed noise, kept low. */
function brush(vel: number) {
  const len = Math.round(0.09 * MUSIC_SR), out = new Float32Array(len);
  const bp = new Biquad().set("bp", 1800, 0.6);
  for (let i = 0; i < len; i++) {
    const t = i / MUSIC_SR;
    out[i] = bp.run(noise()) * vel * Math.exp(-t / 0.025) * rise(i, Math.round(0.006 * MUSIC_SR));
  }
  return out;
}

type Chord = { bass: number; keys: number[]; pad: number[] };
const NIGHT: Chord[] = [
  { bass: 45, keys: [60, 64, 67, 71], pad: [57, 64, 67] }, // Am9
  { bass: 41, keys: [57, 60, 64, 67], pad: [53, 60, 64] }, // Fmaj9
  { bass: 48, keys: [59, 62, 64, 67], pad: [55, 59, 64] }, // Cmaj9
  { bass: 40, keys: [59, 62, 64, 67], pad: [52, 59, 62] }, // Em7
];
const MORNING: Chord[] = [
  { bass: 48, keys: [64, 67, 71, 74], pad: [55, 60, 64] }, // Cmaj9
  { bass: 41, keys: [64, 67, 69, 72], pad: [53, 60, 64] }, // Fmaj9
  { bass: 45, keys: [64, 67, 71, 72], pad: [57, 60, 64] }, // Am9
  { bass: 43, keys: [62, 64, 67, 71], pad: [55, 59, 62] }, // G6
];
/** Per chord (two bars): when the keys play, in beats, how long, and how hard. */
const COMP: Array<[number, number, number]> = [
  [0, 2.2, 0.8],
  [2.5, 1.2, 0.55],
  [5.5, 2.0, 0.7],
  [7.5, 0.4, 0.35],
];
const jitter = () => Math.round((rnd() - 0.5) * 0.016 * MUSIC_SR);

function keysStem(chords: Chord[]) {
  const loop = new Float32Array(N);
  chords.forEach((c, k) => {
    for (const [beat, len, vel] of COMP) {
      c.keys.forEach((m, j) => {
        // A slow, soft strum: lowest note first.
        place(loop, at(k * 8 + beat) + j * Math.round(0.014 * MUSIC_SR) + jitter(), ep(midi(m), len, vel * (0.92 + rnd() * 0.12)), 0.5);
      });
    }
  });
  return soften(room(loop, 0.28), 2200);
}
function warmStem(chords: Chord[]) {
  const loop = new Float32Array(N);
  chords.forEach((c, k) => {
    place(loop, at(k * 8), pad(c.pad, 8.6), 0.16);
    const root = midi(c.bass), fifth = midi(c.bass + 7);
    place(loop, at(k * 8), bass(root, 1.6, 0.9));
    place(loop, at(k * 8 + 2.5), bass(root, 1.0, 0.6));
    place(loop, at(k * 8 + 4), bass(root, 1.6, 0.85));
    place(loop, at(k * 8 + 6.5), bass(fifth, 1.0, 0.55));
  });
  return soften(room(loop, 0.18), 900);
}
function beatStem() {
  const loop = new Float32Array(N);
  const k = kick(), r = rim();
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const b = bar * 4;
    place(loop, at(b) + jitter(), k, 1);
    place(loop, at(b + 2.5) + jitter(), k, 0.7);
    place(loop, at(b + 1) + jitter(), r, 0.5);
    place(loop, at(b + 3) + jitter(), r, 0.55);
    // Swung eighths on the brush, the off-beats lazier and softer.
    for (let e = 0; e < 8; e++) place(loop, at(b + e * 0.5 + (e % 2 ? 0.08 : 0)) + jitter(), brush(e % 2 ? 0.18 : 0.3), 1);
  }
  return soften(loop, 2600);
}
function arpStem() {
  const loop = new Float32Array(N);
  // C major pentatonic, in the cues' key and register (MIDI 67 to 79).
  const lines = [
    [72, 76, 79, 76],
    [69, 72, 76, 72],
    [69, 72, 76, 79],
    [67, 71, 74, 76],
  ];
  lines.forEach((line, k) => {
    for (let bar = 0; bar < 2; bar++) {
      const b = k * 8 + bar * 4;
      const pattern: Array<[number, number]> = bar === 0 ? [[0, 0], [1.5, 1], [2, 2], [3, 1]] : [[0.5, 2], [2, 3], [3.5, 1]];
      for (const [beat, n] of pattern) place(loop, at(b + beat) + jitter(), kalimba(midi(line[n]!), 0.6 + rnd() * 0.2));
    }
  });
  return soften(room(loop, 0.3), 2400);
}

/** Scales a loop so its RMS lands on `db` dBFS. */
function level(loop: Float32Array, db: number) {
  let sum = 0;
  for (let i = 0; i < loop.length; i++) sum += loop[i]! * loop[i]!;
  const rms = Math.sqrt(sum / loop.length);
  const g = rms > 0 ? Math.pow(10, db / 20) / rms : 0;
  for (let i = 0; i < loop.length; i++) loop[i]! *= g;
  return loop;
}

/** Every stem, one 24 s loop each at MUSIC_SR, levelled for the mix. */
export function renderStems(): Record<Stem, Float32Array> {
  seed = 0x5eed1e;
  return {
    nightKeys: level(keysStem(NIGHT), -27),
    nightWarm: level(warmStem(NIGHT), -29),
    morningKeys: level(keysStem(MORNING), -27),
    morningWarm: level(warmStem(MORNING), -29),
    beat: level(beatStem(), -33),
    arp: level(arpStem(), -31),
  };
}

/** How loud each stem is in each part of the show (0 to 1), and the keys' brightness. */
export type Scene = "off" | "evening" | "night" | "dawn" | "end" | "outro";
export const SCENES: Record<Scene, { gains: Record<Stem, number>; keysCutoff: number }> = {
  off: { gains: { nightKeys: 0, nightWarm: 0, morningKeys: 0, morningWarm: 0, beat: 0, arp: 0 }, keysCutoff: 2200 },
  evening: { gains: { nightKeys: 1, nightWarm: 0.55, morningKeys: 0, morningWarm: 0, beat: 0.75, arp: 0 }, keysCutoff: 2000 },
  night: { gains: { nightKeys: 0.9, nightWarm: 1, morningKeys: 0, morningWarm: 0, beat: 0, arp: 0 }, keysCutoff: 750 },
  dawn: { gains: { nightKeys: 0, nightWarm: 0, morningKeys: 1, morningWarm: 0.8, beat: 0.6, arp: 0.8 }, keysCutoff: 2200 },
  end: { gains: { nightKeys: 0, nightWarm: 0, morningKeys: 0.55, morningWarm: 0.8, beat: 0, arp: 0.35 }, keysCutoff: 1400 },
  outro: { gains: { nightKeys: 0, nightWarm: 0, morningKeys: 0, morningWarm: 0, beat: 0, arp: 0 }, keysCutoff: 1400 },
};
