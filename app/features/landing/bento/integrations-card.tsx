import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  DiscordLogo,
  DriveLogo,
  GithubLogo,
  GmailLogo,
  MeetLogo,
  SlackLogo,
  TelegramLogo,
} from "./integration-logos";
import { mascotPath } from "./mascot";
import "./integrations-card.css";

/*
 * Scene geometry is in card units (card width = 1107), traced from the
 * reference video. Each icon flies its own lane at a constant speed; two
 * copies half a cycle apart give one launch per lane every 5.034s, so the
 * stream never shows a seam.
 */
const icons: {
  name: string;
  label: string;
  delays: [number, number];
  logo: ReactNode;
}[] = [
  {
    name: "github",
    label: "GitHub",
    delays: [-5.281, -0.248],
    logo: <GithubLogo />,
  },
  {
    name: "meet",
    label: "Google Meet",
    delays: [-8.252, -3.219],
    logo: <MeetLogo />,
  },
  {
    name: "telegram",
    label: "Telegram",
    delays: [-10.045, -5.012],
    logo: <TelegramLogo />,
  },
  {
    name: "slack",
    label: "Slack",
    delays: [-9.84, -4.807],
    logo: <SlackLogo />,
  },
  {
    name: "gmail",
    label: "Gmail",
    delays: [-8.533, -3.5],
    logo: <GmailLogo />,
  },
  {
    name: "discord",
    label: "Discord",
    delays: [-7.952, -2.919],
    logo: <DiscordLogo />,
  },
  {
    name: "drive",
    label: "Google Drive",
    delays: [-6.127, -1.094],
    logo: <DriveLogo />,
  },
];

const beamTop =
  "M870 134.1 L845 132.1 L820 129.6 L796 126.7 L771 123.2 L746 119.3 L721 115 L697 110.2 L672 105 L647 99.3 L622 93.3 L597 86.9 L573 80.1 L548 72.9 L523 65.4 L498 57.5 L473 49.3 L449 40.8 L424 31.9 L399 22.8 L374 13.4 L350 3.8 L325 -6.2 L300 -16.3";
const beamBottom =
  "M870 410.1 L848 412.2 L827 414.9 L805 418.1 L783 421.8 L761 425.9 L740 430.6 L718 435.6 L696 441 L674 446.7 L653 452.8 L631 459.1 L609 465.7 L587 472.5 L566 479.5 L544 486.6 L522 493.9 L500 501.3 L479 508.7 L457 516.2 L435 523.7 L413 531.1 L392 538.5 L370 545.8";
const beamFill = `${beamTop} L-10 -16 L-10 556 ${beamBottom
  .slice(1)
  .split(" L")
  .reverse()
  .map((point) => `L${point}`)
  .join(" ")} Z`;

const lanes = [
  "M870 139.5 L843 138.3 L817 136.8 L790 135.1 L764 133.1 L737 130.7 L711 128 L684 124.8 L658 121.2 L631 117.1 L605 112.4 L578 107.1 L552 101.3 L525 94.7 L499 87.5 L472 79.5 L446 70.7 L419 61 L393 50.5 L366 39.1 L340 26.7 L313 13.4 L287 -1.1 L260 -16.5",
  "M870 195 L832 197.7 L794 198.9 L757 198.8 L719 197.4 L681 194.9 L643 191.3 L605 186.7 L567 181.3 L530 175.1 L492 168.2 L454 160.8 L416 153 L378 144.7 L340 136.2 L303 127.5 L265 118.8 L227 110.1 L189 101.5 L151 93.2 L113 85.2 L76 77.6 L38 70.5 L0 64.1",
  "M870 270.5 L0 270.5",
  "M870 340 L837 340.4 L805 341.2 L772 342.4 L740 344 L707 345.9 L674 348.4 L642 351.3 L609 354.6 L577 358.5 L544 362.9 L511 367.8 L479 373.3 L446 379.4 L413 386 L381 393.3 L348 401.2 L316 409.8 L283 419.1 L250 429 L218 439.7 L185 451 L153 463.2 L120 476.1",
  "M870 404.5 L847 406.7 L823 409 L800 411.4 L776 414 L753 416.8 L729 419.8 L706 423.1 L682 426.7 L659 430.6 L635 434.8 L612 439.5 L588 444.5 L565 449.9 L541 455.8 L518 462.2 L494 469.1 L471 476.5 L447 484.5 L424 493.1 L400 502.3 L377 512.1 L353 522.6 L330 533.9",
];

// Sparkles at the mouth of the beam: x, y, opacity.
const sparkles = [
  [809, 99, 1],
  [852, 107, 0.6],
  [835, 112, 0.45],
  [821, 113, 0.45],
  [805, 118, 0.5],
  [829, 129, 0.8],
  [836, 149, 0.5],
  [809, 161, 0.6],
  [822, 185, 0.55],
  [816, 212, 0.5],
  [836, 242, 0.45],
  [816, 274, 0.4],
  [829, 297, 0.4],
  [797, 316, 0.45],
  [817, 346, 0.4],
  [824, 366, 0.35],
  [797, 378, 0.4],
  [811, 401, 0.3],
  [804, 428, 0.5],
  [781, 150, 0.3],
  [774, 236, 0.3],
  [786, 300, 0.3],
  [771, 390, 0.3],
] as const;

/** Coded replacement for the integrations feature video. */
export function IntegrationsCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) root.removeAttribute("data-paused");
        else root.setAttribute("data-paused", "");
      },
      { rootMargin: "160px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="integ">
      <svg className="integ-scene" viewBox="0 0 1107 540" aria-hidden>
        <defs>
          <linearGradient
            id="integ-beam"
            x1="0"
            x2="870"
            y1="0"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.3" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="0.48" stopColor="#fff" stopOpacity="0.26" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient
            id="integ-lane"
            x1="0"
            x2="870"
            y1="0"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.08" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path d={beamFill} fill="url(#integ-beam)" />
        <path d={beamTop} className="integ-beam-edge" />
        <path d={beamBottom} className="integ-beam-edge" />
        {lanes.map((d) => (
          <path key={d.slice(0, 12)} d={d} className="integ-lane" />
        ))}
        {sparkles.map(([x, y, a]) => (
          <circle
            key={`${x},${y}`}
            cx={x}
            cy={y}
            r="1.6"
            fill="#fff"
            fillOpacity={a}
          />
        ))}
      </svg>

      <h3 className="integ-title">
        200+
        <br />
        Integrations
      </h3>

      <ul className="integ-icons" aria-label="Connected apps include">
        {icons.flatMap(({ name, label, delays, logo }) =>
          delays.map((delay, copy) => (
            <li
              key={`${name}-${copy}`}
              className={`integ-icon integ-${name}`}
              style={{ "--delay": `${delay}s` } as CSSProperties}
              aria-hidden={copy === 1 || undefined}
            >
              <span className="integ-disc">{logo}</span>
              {copy === 0 ? <span className="sr-only">{label}</span> : null}
            </li>
          )),
        )}
      </ul>

      <div className="integ-box" aria-hidden>
        <div className="integ-box-inner">
          <svg className="integ-mascot" viewBox="-52 -51 104 102">
            <path d={mascotPath} fill="#fff" />
            <rect x="-22.9" y="-17.7" width="16.3" height="34.8" rx="8.15" />
            <rect x="6.6" y="-17.7" width="16.3" height="34.8" rx="8.15" />
          </svg>
        </div>
      </div>
    </div>
  );
}
