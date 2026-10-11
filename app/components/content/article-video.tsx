import {
  ClosedCaptionIcon,
  FullScreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
} from "react";

import { usePrefersReducedMotion } from "../../features/landing/media";
import "../../features/content/blog.css";

/** Plays once this much of the video is on screen, pauses below `AWAY`. */
const IN_VIEW = 0.5;
const AWAY = 0.2;
const SEEK_STEPS = 1000;

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

/**
 * A product demo in a post, authorable in MDX as `<ArticleVideo>` with the
 * same attributes and `<source>` / `<track>` children as a `<video>`.
 *
 * It plays, muted and looping, while at least half of it is on screen, and
 * pauses when scrolled away, so a page of demos is never a page of play
 * buttons and never plays where nobody is looking. A reader who pauses it
 * keeps it paused. With reduced motion it waits for a click.
 *
 * The browser's own controls are replaced by a small set in the site's
 * style: play and pause, a progress line you can drag, captions (off until
 * asked for), sound for the rare video that has any, and full screen.
 * Leaving `muted` off the source marks a video as having sound; it still
 * starts muted, because browsers only autoplay silent video, and offers a
 * sound button.
 */
export function ArticleVideo({
  children,
  className = "",
  muted,
  poster,
  width,
  height,
  "aria-label": label,
  "aria-describedby": describedBy,
}: ComponentPropsWithoutRef<"video">) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<FullscreenVideo>(null);
  const fill = useRef<HTMLDivElement>(null);
  const seek = useRef<HTMLInputElement>(null);
  // Read by the visibility observer, which outlives any one render.
  const pausedByReader = useRef(false);
  const soundOn = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  const [playing, setPlaying] = useState(false);
  const [readerPaused, setReaderPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [sound, setSound] = useState(false);
  const [cue, setCue] = useState("");

  const hasSound = !muted;
  const hasCaptions = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === "track",
  );

  const play = () => {
    const node = video.current;
    if (!node) return;
    node.muted = !soundOn.current;
    node.play().catch(() => setBlocked(true));
  };

  // Play in view, pause out of it, unless the reader paused it themselves.
  useEffect(() => {
    const node = frame.current;
    if (!node || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const target = video.current;
        if (!entry || !target) return;
        if (entry.intersectionRatio >= IN_VIEW && !pausedByReader.current) {
          target.muted = !soundOn.current;
          target.play().catch(() => setBlocked(true));
        } else if (entry.intersectionRatio < AWAY && !target.paused) {
          target.pause();
        }
      },
      { threshold: [0, AWAY, IN_VIEW] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // The progress line follows every frame rather than `timeupdate`'s four a
  // second, which on a five-second loop reads as stutter.
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => {
      const node = video.current;
      if (node?.duration) {
        const share = node.currentTime / node.duration;
        if (fill.current) fill.current.style.transform = `scaleX(${share})`;
        if (seek.current) seek.current.value = String(share * SEEK_STEPS);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  // Captions are drawn by the component, above the controls, rather than by
  // the browser, which would set them over the control bar in its own style.
  // The tracks stay "hidden" so their cues still load and fire.
  useEffect(() => {
    const tracks = Array.from(video.current?.textTracks ?? []);
    const onCue = (event: Event) => {
      const cues = (event.target as TextTrack).activeCues;
      setCue(
        Array.from(cues ?? [])
          .map((entry) => (entry as VTTCue).text)
          .join("\n"),
      );
    };
    for (const track of tracks) {
      track.mode = "hidden";
      track.addEventListener("cuechange", onCue);
    }
    return () => {
      for (const track of tracks) track.removeEventListener("cuechange", onCue);
    };
  }, []);

  const toggle = () => {
    const node = video.current;
    if (!node) return;
    const pausing = !node.paused;
    pausedByReader.current = pausing;
    setReaderPaused(pausing);
    if (pausing) {
      node.pause();
    } else {
      setBlocked(false);
      play();
    }
  };

  const onSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const node = video.current;
    if (!node?.duration) return;
    const share = Number(event.target.value) / SEEK_STEPS;
    node.currentTime = share * node.duration;
    if (fill.current) fill.current.style.transform = `scaleX(${share})`;
  };

  const toggleSound = () => {
    const next = !sound;
    soundOn.current = next;
    setSound(next);
    if (video.current) video.current.muted = !next;
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (frame.current?.requestFullscreen) {
      void frame.current.requestFullscreen();
    } else {
      // iOS Safari only puts the video element itself into full screen.
      video.current?.webkitEnterFullscreen?.();
    }
  };

  const showPlay = !playing && (blocked || reducedMotion || readerPaused);

  return (
    <div
      ref={frame}
      className={`article-video group relative isolate overflow-hidden bg-[#0f1a1d] ${className}`}
      data-playing={playing ? "true" : "false"}
    >
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        width={width}
        height={height}
        aria-label={label}
        aria-describedby={describedBy}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="block h-auto w-full cursor-pointer"
      >
        {children}
      </video>

      {showPlay && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play video"
          className="absolute left-1/2 top-1/2 z-10 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#018fa0] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur transition-transform hover:scale-105"
        >
          <HugeiconsIcon icon={PlayIcon} size={26} strokeWidth={2} />
        </button>
      )}

      {captions && cue && (
        <p
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-14 z-10 mx-auto w-fit max-w-[86%] whitespace-pre-line rounded-lg bg-[#0f1a1d]/80 px-3 py-1.5 text-center text-[14px] leading-snug text-white backdrop-blur"
        >
          {cue}
        </p>
      )}

      <div className="article-video-chrome pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/55 via-black/20 to-transparent pt-10">
        <div className="pointer-events-auto flex items-center gap-1 px-3 pb-2">
          <ChromeButton
            label={playing ? "Pause video" : "Play video"}
            onClick={toggle}
            icon={playing ? PauseIcon : PlayIcon}
          />
          <span className="flex-1" />
          {hasSound && (
            <ChromeButton
              label={sound ? "Mute" : "Turn sound on"}
              onClick={toggleSound}
              icon={sound ? VolumeHighIcon : VolumeOffIcon}
            />
          )}
          {hasCaptions && (
            <ChromeButton
              label={captions ? "Hide captions" : "Show captions"}
              pressed={captions}
              onClick={() => setCaptions((on) => !on)}
              icon={ClosedCaptionIcon}
            />
          )}
          <ChromeButton
            label="Full screen"
            onClick={toggleFullscreen}
            icon={FullScreenIcon}
          />
        </div>
        <div className="article-video-track pointer-events-auto relative h-1 bg-white/25">
          <div
            ref={fill}
            className="absolute inset-0 origin-left scale-x-0 bg-[#01b4c8]"
          />
          <input
            ref={seek}
            type="range"
            min={0}
            max={SEEK_STEPS}
            step={1}
            defaultValue={0}
            onChange={onSeek}
            aria-label="Seek"
            className="absolute -top-2 left-0 h-5 w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}

function ChromeButton({
  label,
  onClick,
  icon,
  pressed,
}: {
  label: string;
  onClick: () => void;
  icon: typeof PlayIcon;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-8 w-8 place-items-center rounded-full text-white transition-colors hover:bg-white/20 focus-visible:bg-white/20 ${
        pressed ? "bg-white/25" : ""
      }`}
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={1.9} />
    </button>
  );
}
