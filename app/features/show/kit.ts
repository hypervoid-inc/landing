/**
 * The small engine behind the playable show at /embed/ (Night Shift). The
 * show is drawn on a fixed 960 by 720 artboard that the host scales to fit,
 * so every position below is in design pixels. A show is one async script;
 * aborting its signal stops it wherever it is waiting.
 */

export const BOARD_W = 960;
export const BOARD_H = 720;

export class Stopped extends Error {
  constructor() {
    super("show stopped");
  }
}

export const reducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Resolves after `ms`, or throws `Stopped` the moment the show is aborted. */
export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Stopped());
    const id = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new Stopped());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** One Web Animations call that finishes in place and can be awaited. */
export function tween(
  el: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
  signal?: AbortSignal,
): Promise<void> {
  const quick = reducedMotion();
  const animation = el.animate(keyframes, {
    fill: "forwards",
    ...options,
    duration: quick ? 1 : options.duration,
    delay: quick ? 0 : options.delay,
  });
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      animation.cancel();
      reject(new Stopped());
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    animation.finished
      .then(() => {
        signal?.removeEventListener("abort", onAbort);
        try {
          animation.commitStyles();
        } catch {
          // An element that left the page cannot keep a style; nothing to keep.
        }
        animation.cancel();
        resolve();
      })
      .catch(() => {
        signal?.removeEventListener("abort", onAbort);
        if (signal?.aborted) reject(new Stopped());
        else resolve();
      });
  });
}

/** The two curves every move uses: settle on entry, glide between places. */
export const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
export const EASE_MOVE = "cubic-bezier(.77,0,.175,1)";
export const EASE_SPRING = "cubic-bezier(.34,1.56,.64,1)";

/**
 * Waits for a click on one of `targets` and resolves with its index. With
 * `timeoutMs` the show moves on by itself and resolves with `fallback`, so a
 * viewer who only watches still sees the whole night.
 */
export function untilTap(
  targets: Element[],
  signal: AbortSignal,
  { timeoutMs, fallback = 0 }: { timeoutMs?: number; fallback?: number } = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const cleanups: Array<() => void> = [];
    let timer = 0;
    const finish = (value: number) => {
      cleanups.forEach((fn) => fn());
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = () => {
      cleanups.forEach((fn) => fn());
      window.clearTimeout(timer);
      reject(new Stopped());
    };
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    targets.forEach((target, index) => {
      const handler = (event: Event) => {
        event.stopPropagation();
        finish(index);
      };
      target.addEventListener("click", handler);
      cleanups.push(() => target.removeEventListener("click", handler));
    });
    if (timeoutMs) timer = window.setTimeout(() => finish(fallback), timeoutMs);
  });
}

/** Escapes text the viewer typed before it goes into markup. */
export function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  html = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** "11:42 PM" for a 24 hour time. */
export function clockLabel(hours: number, minutes: number): string {
  const h = ((hours % 24) + 24) % 24;
  return `${((h + 11) % 12) + 1}:${pad2(minutes)} ${h < 12 ? "AM" : "PM"}`;
}

export type LocalContext = {
  hours: number;
  minutes: number;
  /** "11:42 pm" */
  time: string;
  /** The city part of the browser's time zone, or "your city". */
  city: string;
  /** Between 9 pm and 5 am, when the story can start right now. */
  night: boolean;
  /** "Oct 14" */
  date: string;
};

/** What the browser already knows. Read locally, never sent anywhere. */
export function localContext(now = new Date()): LocalContext {
  let zone: string;
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    zone = "";
  }
  const city = zone.includes("/") ? zone.split("/").pop()!.replace(/_/g, " ") : "your city";
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return {
    hours,
    minutes,
    time: clockLabel(hours, minutes).toLowerCase(),
    city,
    night: hours >= 21 || hours < 5,
    date: now.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

/** The first word of what the viewer typed, tidied into a first name. */
export function firstName(raw: string): string {
  const word = raw.trim().split(/\s+/)[0] ?? "";
  const clean = word.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 14);
  return clean ? clean[0]!.toUpperCase() + clean.slice(1) : "";
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A damped spring stepped on animation frames. Used where something is let
 * go and has to come home with a little life: the pull chain, a bobbing tag.
 */
export function springTo(
  from: number,
  to: number,
  onFrame: (value: number) => void,
  { stiffness = 260, damping = 14, velocity = 0 } = {},
): Promise<void> {
  return new Promise((resolve) => {
    let x = from;
    let v = velocity;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const force = -stiffness * (x - to) - damping * v;
      v += force * dt;
      x += v * dt;
      onFrame(x);
      if (Math.abs(x - to) < 0.2 && Math.abs(v) < 0.2) {
        onFrame(to);
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// ── Homography: lays any rectangle onto the CRT's tilted screen ─────────────
export type Pt = readonly [number, number];
export type Quad = readonly [Pt, Pt, Pt, Pt];

function homography(w: number, h: number, q: Quad): number[] {
  const src: Pt[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]!;
    const [u, v] = q[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    [A[c], A[p]] = [A[p]!, A[c]!];
    const d = A[c]![c] || 1e-12;
    for (let k = c; k < 9; k++) A[c]![k]! /= d;
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r]![c]!;
      if (f === 0) continue;
      for (let k = c; k < 9; k++) A[r]![k]! -= f * A[c]![k]!;
    }
  }
  return A.map((row) => row[8]!);
}

/** CSS `matrix3d` that maps a w by h box at 0,0 (origin 0 0) onto `q`. */
export function quadTransform(w: number, h: number, q: Quad): string {
  const [a, b, c, d, e, f, g, i] = homography(w, h, q);
  const m = [a, d, 0, g, b, e, 0, i, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +(v ?? 0).toFixed(8)).join(",")})`;
}
