import { useEffect, useRef } from "react";
import { TILE_RADIUS, tiles, track } from "./automations-data";
import "./automations-card.css";

/*
 * Everything is placed in art pixels on a 1384-wide card (the design
 * file's size). A deck card is laid out in the design asset's own pixels
 * (1223 x 972), with its scale and offset taken from the reference video.
 */

const FRAME_MS = 1000 / 60;
const LOOP = 5550;
const SIDES = 4;

/** Mascot patch center inside the card asset; `track` follows this point. */
const ANCHOR_X = 610;
const ANCHOR_Y = 405;
/** Outer rim of the card inside the asset. */
const RIM_LEFT = 139;
const RIM_RIGHT = 1083;
const RIM_TOP = 139;

type Pose = { x: number; y: number; s: number };

function focusAt(frame: number): Pose {
  const [cx, cy, s] = track[frame % track.length]!;
  return { x: cx - ANCHOR_X * s, y: cy - ANCHOR_Y * s, s };
}

const hero = focusAt(0);

/**
 * The deck unfolds between the focused card and the hero card's frame:
 * card k (1..4) on a side sits k/4 of the way from the focused card to the
 * hero rect, in scale, outer edge and top. All cards share the hero frame
 * while the camera is in close.
 */
function poseAt(frame: number, k: number): Pose {
  const f = focusAt(frame);
  if (k === 0) return f;
  const t = Math.abs(k) / SIDES;
  const s = f.s + t * (hero.s - f.s);
  const top =
    f.y +
    RIM_TOP * f.s +
    t * (hero.y + RIM_TOP * hero.s - (f.y + RIM_TOP * f.s));
  const edge = (p: Pose) => p.x + (k > 0 ? RIM_RIGHT : RIM_LEFT) * p.s;
  const e = edge(f) + t * (edge(hero) - edge(f));
  return {
    x: e - (k > 0 ? RIM_RIGHT : RIM_LEFT) * s,
    y: top - RIM_TOP * s,
    s,
  };
}

// Circuit traces, each drawn from under the deck outward.
const traces = [
  "M334 430V318L282.5 283V-10",
  "M388 430V298L335.5 263V-10",
  "M746 430V-10",
  "M1151.5 430V318L1203.5 283V-10",
  "M1098 430V298L1150.5 263V-10",
  "M300 575H132L102 629H-10",
  "M300 629H152L122 681.5H-10",
  "M1080 565H1345L1374 617.6H1394",
  "M1080 617.6H1325L1354 671H1394",
  // Below the deck, under the haze.
  "M282.5 700V1394",
  "M335.5 700V1394",
  "M746 700V1394",
  "M1151 700V1394",
  "M1203.5 700V1394",
];

/** Traces from this index on run below the deck, under the haze. */
const LOWER_TRACES = 9;

/** Drawn fraction of each trace over the loop (ms, fraction). */
const drawn: [number, number][] = [
  [0, 0],
  [367, 0],
  [483, 1],
  [1700, 1],
  [1817, 0],
  [3033, 0],
  [3150, 1],
  [4383, 1],
  [4517, 0],
  [LOOP, 0],
];

/** Opacity of the cyan head that leads each draw and retract. */
const headOpacity: [number, number][] = [
  [0, 0],
  [367, 0],
  [368, 1],
  [733, 1],
  [867, 0],
  [1600, 0],
  [1667, 1],
  [1817, 1],
  [1818, 0],
  [3033, 0],
  [3034, 1],
  [3400, 1],
  [3533, 0],
  [4267, 0],
  [4350, 1],
  [4517, 1],
  [4518, 0],
  [LOOP, 0],
];
const HEAD_PX = 130;

function Card({ focus }: { focus?: boolean }) {
  return (
    <>
      <img
        className="auto-face"
        src="/assets/landing/features/automations/card.webp"
        alt=""
        decoding="async"
        loading="lazy"
      />
      {focus ? (
        <img
          className="auto-mascot"
          src="/assets/landing/features/automations/mascot.webp"
          alt=""
          decoding="async"
          loading="lazy"
        />
      ) : null}
    </>
  );
}

const deckOrder: number[] = [];
for (let n = SIDES; n >= 1; n--) deckOrder.push(n, -n);

/** Coded replacement for the automations feature video. */
export function AutomationsCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animations: Animation[] = [];
    const frames = track.length;

    root.querySelectorAll<HTMLElement>("[data-deck]").forEach((card) => {
      const k = Number(card.dataset.deck);
      const keyframes: Keyframe[] = [];
      for (let i = 0; i < frames; i++) {
        const p = poseAt(i, k);
        keyframes.push({
          offset: (i * FRAME_MS) / LOOP,
          transform: `translate(${p.x.toFixed(2)}em, ${p.y.toFixed(2)}em) scale(${p.s.toFixed(4)})`,
        });
      }
      keyframes.push({ ...keyframes[0]!, offset: 1 });
      animations.push(
        card.animate(keyframes, { duration: LOOP, iterations: Infinity }),
      );
    });

    root.querySelectorAll<SVGPathElement>(".auto-trace").forEach((path) => {
      animations.push(
        path.animate(
          drawn.map(([t, p]) => ({
            offset: t / LOOP,
            strokeDashoffset: 1 - p,
          })),
          { duration: LOOP, iterations: Infinity },
        ),
      );
    });
    root.querySelectorAll<SVGPathElement>(".auto-head").forEach((path) => {
      const h = HEAD_PX / path.getTotalLength();
      path.style.strokeDasharray = `${h} 2`;
      animations.push(
        path.animate(
          drawn.map(([t, p]) => ({
            offset: t / LOOP,
            strokeDashoffset: h - p,
          })),
          { duration: LOOP, iterations: Infinity },
        ),
        path.animate(
          headOpacity.map(([t, o]) => ({ offset: t / LOOP, opacity: o })),
          { duration: LOOP, iterations: Infinity },
        ),
      );
    });

    if (reduced) {
      // Hold the centered, spread-out deck with its traces drawn.
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
    <div ref={ref} className="auto">
      {["auto-pattern", "auto-pattern auto-pattern-soft"].map((name) => (
        <svg key={name} className={name} viewBox="0 0 1384 1344" aria-hidden>
          {tiles.map(([x, y, w, h]) => (
            <rect
              key={`${x}-${y}`}
              x={x + 1}
              y={y + 1}
              width={w - 2}
              height={h - 2}
              rx={TILE_RADIUS}
            />
          ))}
        </svg>
      ))}

      <svg className="auto-lines" viewBox="0 0 1384 1384" aria-hidden>
        {traces.map((d, i) => (
          <g
            key={d}
            className={i >= LOWER_TRACES ? "auto-trace-low" : undefined}
          >
            <path d={d} pathLength={1} className="auto-trace" />
            <path d={d} pathLength={1} className="auto-head" />
          </g>
        ))}
      </svg>

      <div className="auto-deck" aria-hidden>
        {deckOrder.map((k) => (
          <div
            key={k}
            className="auto-card"
            data-deck={k}
            style={{ zIndex: SIDES + 1 - Math.abs(k) }}
          >
            <Card />
          </div>
        ))}
        {/* Under the focused card: only the backdrop and side cards blur. */}
        <div className="auto-blur auto-blur-1" />
        <div className="auto-blur auto-blur-2" />
        <div className="auto-blur auto-blur-3" />
        <div className="auto-card" data-deck={0} style={{ zIndex: 10 }}>
          <Card focus />
        </div>
      </div>

      <h3 className="auto-title">
        Orchestrate Complex
        <br />
        Multi-step Automations
      </h3>
    </div>
  );
}
