import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { AutomationsCard } from "./automations-card";
import { CloudCard } from "./cloud-card";
import { IntegrationsCard } from "./integrations-card";
import { SchedulesCard } from "./schedules-card";
import { SocialCard } from "./social-card";

const cards = {
  "1": {
    video: "/__ref/card1.webm",
    loopMs: 6534,
    aspect: "1 / 1",
    Card: SchedulesCard,
  },
  "2": {
    video: "/__ref/card2.webm",
    loopMs: 5034,
    aspect: "712 / 346",
    Card: IntegrationsCard,
  },
  "3": {
    video: "/__ref/card3.webm",
    loopMs: 7934,
    aspect: "1 / 1",
    Card: SocialCard,
  },
  "4": {
    video: "/__ref/card4.webm",
    loopMs: 6934,
    aspect: "1 / 1",
    Card: CloudCard,
  },
  "5": {
    video: "/__ref/card5.webm",
    loopMs: 5550,
    aspect: "1 / 1",
    Card: AutomationsCard,
  },
} as const;

const subscribe = () => () => undefined;
const params = () => new URLSearchParams(window.location.search);
const wantsCompare = () => params().get("compare") === "bento";
type CardId = keyof typeof cards;
const wantedCard = (): CardId => {
  const id = params().get("card");
  return id && id in cards ? (id as CardId) : "1";
};
const defaultCard = (): CardId => "1";

/**
 * Dev-only side-by-side of the reference video and the coded card. The
 * reference renders are local-only files in public/__ref/ (git-excluded).
 * Open the homepage with `?compare=bento` (add `&card=2` for the
 * integrations card). Both sides share one clock:
 * restart, slow motion, and the scrubber drive the video and the CSS
 * animations together.
 */
export function BentoCompare() {
  const open = useSyncExternalStore(subscribe, wantsCompare, () => false);
  const cardId = useSyncExternalStore(subscribe, wantedCard, defaultCard);
  const { video: videoSrc, loopMs, aspect, Card } = cards[cardId];
  const [run, setRun] = useState(0);
  const [rate, setRate] = useState(1);
  const [scrub, setScrub] = useState<number | null>(null);
  const [overlay, setOverlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const animations = () =>
    cardRef.current?.getAnimations({ subtree: true }) ?? [];

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.playbackRate = rate;
      void video.play().catch(() => undefined);
    }
    // Card remounts on `run`, so its animations start on this frame too.
    requestAnimationFrame(() => {
      for (const a of animations()) a.playbackRate = rate;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, run]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    for (const a of animations()) a.playbackRate = rate;
  }, [rate]);

  const seek = (ms: number) => {
    setScrub(ms);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = ms / 1000;
    }
    for (const a of animations()) {
      a.pause();
      a.currentTime = ms;
    }
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        .bento-compare-overlay { display: grid; }
        .bento-compare-overlay > figure { grid-area: 1 / 1; }
        .bento-compare-overlay > figure:first-child { z-index: 1; mix-blend-mode: difference; }
        .bento-compare-overlay figcaption { display: none; }
      `}</style>
      <div
        className="bento-compare fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[#0b1d24]/90 p-6 text-white"
        style={
          { "--compare-w": cardId === "2" ? "720px" : "520px" } as CSSProperties
        }
      >
        <div
          className={`flex flex-wrap items-start justify-center gap-6 ${overlay ? "bento-compare-overlay" : ""}`}
        >
          <figure className="m-0 text-center">
            <div
              className="relative w-[min(42vw,var(--compare-w))] overflow-hidden rounded-[18px]"
              style={{ aspectRatio: aspect }}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                muted
                preload="auto"
                loop
                playsInline
                className="absolute inset-0 size-full object-cover object-top"
              />
            </div>
            <figcaption className="mt-2 text-sm opacity-70">Video</figcaption>
          </figure>
          <figure className="m-0 text-center">
            <div
              ref={cardRef}
              className="relative w-[min(42vw,var(--compare-w))] overflow-hidden rounded-[18px]"
              style={{ aspectRatio: aspect }}
            >
              <Card key={run} />
            </div>
            <figcaption className="mt-2 text-sm opacity-70">Coded</figcaption>
          </figure>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className="rounded-full bg-white/15 px-4 py-2 active:scale-[0.97]"
            onClick={() => {
              setScrub(null);
              setRun((n) => n + 1);
            }}
          >
            Restart both
          </button>
          {[1, 0.5, 0.25, 0.1].map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rate === r}
              className="rounded-full bg-white/15 px-3 py-2 aria-pressed:bg-white aria-pressed:text-[#0b1d24]"
              onClick={() => setRate(r)}
            >
              {r}x
            </button>
          ))}
          <label className="flex items-center gap-2">
            Scrub
            <input
              type="range"
              min={0}
              max={loopMs}
              step={1000 / 60}
              value={scrub ?? 0}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-[min(50vw,420px)]"
            />
            <span className="w-16 tabular-nums">
              {scrub === null ? "live" : `${(scrub / 1000).toFixed(2)}s`}
            </span>
          </label>
          <button
            type="button"
            aria-pressed={overlay}
            className="rounded-full bg-white/15 px-3 py-2 aria-pressed:bg-white aria-pressed:text-[#0b1d24]"
            onClick={() => setOverlay((o) => !o)}
          >
            Difference overlay
          </button>
          <a href="?" className="underline opacity-70">
            Close
          </a>
        </div>
      </div>
    </>
  );
}
