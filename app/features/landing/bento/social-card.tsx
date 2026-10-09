import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Mascot } from "./mascot";
import { FacebookLogo, LinkedinLogo, RedditLogo, XLogo } from "./social-logos";
import "./social-card.css";

const chipKinds = [
  { name: "Twitter", logo: <XLogo />, width: 139.2 },
  { name: "Reddit", logo: <RedditLogo />, width: 134.2 },
  { name: "LinkedIn", logo: <LinkedinLogo />, width: 153.4 },
] as const;

/*
 * Chip rows, top to bottom: offset of the first Twitter chip in card units
 * (card width = 540), traced from the reference. Rows alternate direction
 * and each travels exactly one Twitter/Reddit/LinkedIn period per 7.934s
 * loop, so the grid repeats without a seam.
 */
const rowOffsets = [15.6, 113, 168.2, 113, -10.4, 176.5, 65.6, 178, 20];
// Chip widths fit each label with equal 19.5u padding on both ends
// (icon 20.6 + gap 14.6 + rendered Inter text). PERIOD is one
// Twitter/Reddit/LinkedIn run including gaps.
const PERIOD = 468.5;
const GAP = 13.9;

function ChipRow({ index, offset }: { index: number; offset: number }) {
  const chips: ReactNode[] = [];
  let x = offset - PERIOD;
  for (let rep = 0; rep < 4; rep++) {
    for (const kind of chipKinds) {
      chips.push(
        <span
          key={`${rep}-${kind.name}`}
          className="social-chip"
          style={{ "--x": x, "--w": kind.width } as CSSProperties}
        >
          {kind.logo}
          {kind.name}
        </span>,
      );
      x += kind.width + GAP;
    }
  }
  return (
    <div className="social-row" style={{ "--row": index } as CSSProperties}>
      {chips}
    </div>
  );
}

const posts = [
  {
    side: "right",
    name: "Aryan Zutshi",
    handle: "@aryanzutshi",
    avatar: "/assets/landing/features/social/aryan.webp",
    highlight: "Agent working an an employ",
    rest: " is the new meta",
    logo: <LinkedinLogo />,
  },
  {
    side: "left",
    name: "Anne Hathaway",
    handle: "@annehathaway",
    avatar: "/assets/landing/features/social/anne.webp",
    lead: "Construct ",
    highlight: "posting from my behalf",
    rest: " is the best for my content management...",
    logo: <FacebookLogo />,
  },
] as const;

// Sparkles above the button: x, y, radius, opacity, twinkle phase.
const sparkles = [
  [214, 286, 1.5, 0.7, 0],
  [226, 262, 1.2, 0.6, 1],
  [238, 246, 1.6, 0.8, 2],
  [252, 238, 1.1, 0.5, 0],
  [262, 226, 1.4, 0.7, 1],
  [276, 232, 1.2, 0.6, 2],
  [289, 222, 1.6, 0.8, 0],
  [300, 240, 1.1, 0.5, 1],
  [312, 250, 1.5, 0.7, 2],
  [324, 266, 1.2, 0.6, 0],
  [334, 288, 1.4, 0.7, 1],
  [246, 274, 1, 0.5, 2],
  [296, 270, 1, 0.5, 0],
  [270, 254, 1.3, 0.6, 1],
  [203, 300, 1, 0.45, 2],
  [344, 302, 1, 0.45, 0],
] as const;

// The plain cyan mound behind the button, in the source artwork's 984x392 box.
const humpEdge =
  "M0 170C200 170 300 165 360 110C420 55 450 48 492 48C534 48 564 55 624 110C684 165 784 170 984 170";
const humpPath = `${humpEdge}L984 392L0 392Z`;

/*
 * Post flights, in card units. Each post rides one cubic curve from the
 * button up and off the card. Its speed follows 1 + a*cos(2*pi*t): quick
 * out of the button, slowest (never stopped) mid-card, quick again on the
 * way out, so it flows instead of parking. Scale and tilt ease with it.
 */
const POST_LOOP = 3300;
const POST_VISIBLE = 0.56;
const flights = {
  right: {
    delay: 220,
    curve: [
      [272, 296],
      [300, 200],
      [325, 60],
      [442, -110],
    ],
    scale: [0.05, 1, 1.02],
    tilt: [0, 12, 4],
  },
  left: {
    delay: 1750,
    curve: [
      [262, 298],
      [175, 230],
      [165, 80],
      [70, -110],
    ],
    scale: [0.042, 0.83, 0.847],
    tilt: [0, -12, -4],
  },
} as const;

type Flight = (typeof flights)[keyof typeof flights];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function flightKeyframes({ curve, scale, tilt }: Flight): Keyframe[] {
  const [p0, p1, p2, p3] = curve;
  const steps = 72;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = t + (0.62 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
    const v = 1 - u;
    const x =
      v * v * v * p0[0] +
      3 * v * v * u * p1[0] +
      3 * v * u * u * p2[0] +
      u * u * u * p3[0];
    const y =
      v * v * v * p0[1] +
      3 * v * v * u * p1[1] +
      3 * v * u * u * p2[1] +
      u * u * u * p3[1];
    const s =
      scale[0] +
      (scale[1] - scale[0]) * smoothstep(0, 0.32, u) +
      (scale[2] - scale[1]) * smoothstep(0.32, 1, u);
    const r =
      tilt[1] * smoothstep(0, 0.4, u) +
      (tilt[2] - tilt[1]) * smoothstep(0.4, 1, u);
    frames.push({
      offset: t * POST_VISIBLE,
      opacity: Math.min(1, t / 0.03),
      transform: `translate(calc(${x.toFixed(1)} * var(--u)), calc(${y.toFixed(1)} * var(--u))) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`,
    });
  }
  const last = frames[frames.length - 1]!;
  frames.push({ ...last, offset: POST_VISIBLE + 0.001, opacity: 0 });
  frames.push({ ...last, offset: 1, opacity: 0 });
  return frames;
}

/** Coded replacement for the social manager feature video. */
export function SocialCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const animations: Animation[] = [];
    root.querySelectorAll<HTMLElement>("[data-flight]").forEach((post) => {
      const side = post.dataset.flight as keyof typeof flights;
      const flight = flights[side];
      animations.push(
        post.animate(flightKeyframes(flight), {
          duration: POST_LOOP,
          delay: flight.delay,
          iterations: Infinity,
          fill: "both",
        }),
      );
    });

    if (reduced) {
      // A settled scene with one post on show.
      animations.forEach((a, i) => {
        a.currentTime = i === 0 ? 1120 : 4250;
        a.pause();
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry?.isIntersecting;
        if (visible) root.removeAttribute("data-paused");
        else root.setAttribute("data-paused", "");
        if (!reduced)
          animations.forEach((a) => (visible ? a.play() : a.pause()));
      },
      { rootMargin: "160px" },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div ref={ref} className="social">
      <div className="social-rows" aria-hidden>
        {rowOffsets.map((offset, index) => (
          <ChipRow key={index} index={index} offset={offset} />
        ))}
      </div>
      <div className="social-glow" aria-hidden />

      <ul className="social-posts" aria-label="Posts published by Construct">
        {posts.map((post) => (
          <li
            key={post.name}
            className={`social-post social-post-${post.side}`}
            data-flight={post.side}
          >
            <img
              className="social-avatar"
              src={post.avatar}
              alt=""
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className="social-name">{post.name}</span>
            <span className="social-handle">{post.handle}</span>
            <span className="social-mark">{post.logo}</span>
            <p className="social-text">
              {"lead" in post ? post.lead : null}
              <mark>{post.highlight}</mark>
              {post.rest}
            </p>
          </li>
        ))}
      </ul>

      <svg
        className="social-hump"
        viewBox="0 0 984 392"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient
            id="social-hump-body"
            x1="0"
            y1="48"
            x2="0"
            y2="350"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#17d4e2" />
            <stop offset="0.12" stopColor="#20d4e1" />
            <stop offset="0.34" stopColor="#4bd5e1" stopOpacity="0.84" />
            <stop offset="0.67" stopColor="#8ed8dc" stopOpacity="0.5" />
            <stop offset="1" stopColor="#d4d4d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={humpPath} fill="url(#social-hump-body)" />
      </svg>
      {/* Thin light line along the top of the mound, brightest over the
          crest and shoulders and dying out toward the sides. */}
      <svg
        className="social-hump-edge"
        viewBox="0 0 984 392"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={humpEdge} />
      </svg>
      <svg className="social-sparkles" viewBox="0 0 540 540" aria-hidden>
        {sparkles.map(([x, y, r, a, phase]) => (
          <circle
            key={`${x},${y}`}
            cx={x}
            cy={y}
            r={r}
            fillOpacity={a}
            className={`social-spark social-spark-${phase}`}
          />
        ))}
      </svg>
      <div className="social-button" aria-hidden>
        <Mascot className="social-button-mascot" eyes="#13bccc" />
      </div>

      <h3 className="social-title">
        Works as Your Social
        <br />
        Manager
      </h3>
    </div>
  );
}
