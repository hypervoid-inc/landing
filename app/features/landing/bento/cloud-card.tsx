import { useEffect, useRef } from "react";
import { Mascot } from "./mascot";
import "./cloud-card.css";

/*
 * Laid out in art pixels on a 1384-wide card. The phone is the design's
 * 3D render; the welcome text, the computer and the water are code. All
 * timings come from the reference video, one keyframe per 60fps frame.
 */

const LOOP = 6934;
/** The welcome content is laid out in its design asset's pixels, at 1.1x. */
const WELCOME_SCALE = 1.1;
const FRAMES = 416;

/** Welcome content: [frame, y offset in art px, opacity]. */
const welcome: [number, number, number][] = [
  [0, 25, 0],
  [20, 25, 0],
  [22, 16, 0.23],
  [24, -1, 0.29],
  [26, -10, 0.35],
  [28, -15, 0.4],
  [30, -16, 0.46],
  [32, -15, 0.52],
  [34, -12, 0.58],
  [36, -9, 0.64],
  [38, -6, 0.7],
  [40, -4, 0.76],
  [42, -2, 0.82],
  [44, -1, 0.88],
  [46, 0, 0.93],
  [48, 0, 1],
  [346, 0, 1],
  [347, -2, 0.95],
  [348, -5, 0.9],
  [349, -9, 0.85],
  [350, -14, 0.8],
  [351, -19, 0.75],
  [352, -24, 0.7],
  [353, -28, 0.65],
  [354, -31, 0.6],
  [355, -32, 0.56],
  [356, -31, 0.5],
  [357, -28, 0.46],
  [358, -22, 0.41],
  [359, -11, 0.36],
  [360, 6, 0.31],
  [361, 20, 0.25],
  [362, 25, 0],
  [FRAMES, 25, 0],
];

/*
 * Ripples: rings leave the phone's base on a steady cadence, slowing as
 * they spread (like a real ripple losing energy), widening and softening
 * while they fade. Three are in flight at once.
 */
const RIPPLES = 3;
const RIPPLE_MS = 3600;
const RIPPLE_FROM = 806;
const RIPPLE_TO = 1130;

/** Ridge of the wave stroke inside its 1400 x 408 art box. */
const RIDGE_Y = 223;

const WAVE_PATH =
  "M106 70C110 140 150 200 250 233C420 238 560 222 690 223C860 224 1000 238 1140 234C1230 225 1290 170 1300 60";

/**
 * The phone-bottom-shaped wave, as one soft blurred stroke. A moving
 * ripple adds a faint light crest just ahead of its dark trough.
 */
function Wave({ crest }: { crest?: boolean }) {
  return (
    <svg viewBox="0 0 1400 408" aria-hidden>
      <defs>
        <linearGradient
          id="cloud-wave-fade"
          x1="0"
          y1="60"
          x2="0"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#13a5c5" stopOpacity="0" />
          <stop offset="0.5" stopColor="#13a5c5" stopOpacity="0.45" />
          <stop offset="1" stopColor="#13a5c5" />
        </linearGradient>
      </defs>
      {crest ? (
        <path
          d={WAVE_PATH}
          transform="translate(0 30)"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.38"
          strokeWidth="16"
          strokeLinecap="round"
        />
      ) : null}
      <path
        d={WAVE_PATH}
        fill="none"
        stroke="url(#cloud-wave-fade)"
        strokeWidth="24"
        strokeLinecap="round"
      />
    </svg>
  );
}

function frameOffset(frame: number) {
  return Math.min(1, Math.max(0, frame / FRAMES));
}

/** Coded replacement for the cloud control feature video. */
export function CloudCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timing = { duration: LOOP, iterations: Infinity };
    const animations: Animation[] = [];

    const content = root.querySelector<HTMLElement>(".cloud-welcome");
    if (content) {
      animations.push(
        content.animate(
          welcome.map(([f, y, o]) => ({
            offset: frameOffset(f),
            transform: `translateY(${(y / WELCOME_SCALE).toFixed(2)}em)`,
            opacity: o,
          })),
          timing,
        ),
      );
    }

    root.querySelectorAll<HTMLElement>("[data-ripple]").forEach((wave) => {
      const ring = wave.firstElementChild as SVGElement | null;
      const phase = -(Number(wave.dataset.ripple) * RIPPLE_MS) / RIPPLES;
      const ripple = {
        duration: RIPPLE_MS,
        delay: phase,
        iterations: Infinity,
      };
      const y = (ridge: number) => `${(ridge - RIDGE_Y * 0.98).toFixed(1)}em`;
      animations.push(
        wave.animate(
          [
            { transform: `translateY(${y(RIPPLE_FROM)}) scale(1, 0.85)` },
            { transform: `translateY(${y(RIPPLE_TO)}) scale(1.12, 1.6)` },
          ],
          { ...ripple, easing: "cubic-bezier(0.22, 0.55, 0.35, 1)" },
        ),
      );
      if (ring) {
        animations.push(
          ring.animate(
            [
              { opacity: 0 },
              { opacity: 0.62, offset: 0.14 },
              { opacity: 0.38, offset: 0.55 },
              { opacity: 0 },
            ],
            ripple,
          ),
        );
      }
    });

    if (reduced) {
      // Hold a quiet frame with the welcome message showing.
      animations.forEach((a) => {
        a.currentTime = 1000;
        a.pause();
      });
      return () => animations.forEach((a) => a.cancel());
    }

    const observer = new IntersectionObserver(
      ([entry]) =>
        animations.forEach((a) =>
          entry?.isIntersecting ? a.play() : a.pause(),
        ),
      { rootMargin: "160px" },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div ref={ref} className="cloud">
      <div className="cloud-water" aria-hidden>
        <div className="cloud-wave cloud-wave-rest">
          <Wave />
        </div>
        <div className="cloud-wave cloud-wave-rest">
          <Wave />
        </div>
        {Array.from({ length: RIPPLES }, (_, i) => (
          <div key={i} className="cloud-wave cloud-ripple" data-ripple={i}>
            <Wave crest />
          </div>
        ))}
      </div>

      <div className="cloud-contact" aria-hidden />
      <img
        className="cloud-phone"
        src="/assets/landing/features/cloud/phone.webp"
        alt=""
        decoding="async"
        loading="lazy"
      />

      <div className="cloud-welcome" aria-hidden>
        <p className="cloud-line cloud-hi">
          Hi <b>User,</b>
        </p>
        <p className="cloud-line cloud-name">Welcome</p>
        <p className="cloud-line cloud-date">Wednesday, 6th</p>
        <span className="cloud-pc">
          <img
            src="/assets/landing/clippy/computer.webp"
            alt=""
            decoding="async"
            loading="lazy"
          />
          <Mascot className="cloud-pc-mascot" eyes="#4aa3df" />
        </span>
      </div>

      <h3 className="cloud-title">
        Everything On Cloud,
        <br />
        Control from Any Device
      </h3>
    </div>
  );
}
