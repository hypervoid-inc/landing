import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import { noteVideo } from "./deck-activity";
import { passedVideoMarks } from "./deck-tracking";
import { boxStyle, DECK_VERSION, type DeckVideo } from "./slides";

const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";
/** Below the desktop layout a video in the slide is a few hundred pixels wide, so it opens full width instead. */
const SMALL_SCREEN = "(max-width: 63.99rem)";

/**
 * A YouTube video drawn into the slide image. Until it's played, the slide's
 * own thumbnail stands in for it, so nothing loads from YouTube for readers
 * who never press play. Once playing, the player reports its progress over
 * postMessage (the IFrame API's "listening" handshake), without loading
 * YouTube's API script. On a phone it plays in a full-width player over the
 * deck rather than in its spot on the slide.
 */
export function SlideVideo({ video, slide }: { video: DeckVideo; slide: number }) {
  const [mode, setMode] = useState<"inline" | "sheet" | null>(null);
  const playing = mode !== null;
  const frame = useRef<HTMLIFrameElement>(null);

  function play() {
    if (playing) return;
    setMode(window.matchMedia(SMALL_SCREEN).matches ? "sheet" : "inline");
    noteVideo(video.name, 0);
    captureAnalytics("deck_video_played", {
      deck_version: DECK_VERSION,
      slide,
      video: video.name,
    });
  }

  useEffect(() => {
    if (!playing) return;
    const reported = new Set<number>();
    let duration = 0;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_ORIGIN) return;
      if (event.source !== frame.current?.contentWindow) return;
      if (typeof event.data !== "string") return;
      let info:
        | {
            duration?: unknown;
            currentTime?: unknown;
            progressState?: { duration?: unknown };
          }
        | undefined;
      try {
        info = JSON.parse(event.data)?.info;
      } catch {
        return;
      }
      if (!info || typeof info !== "object") return;
      // The first message carries `duration`; later ones nest it in `progressState`.
      const reportedDuration = info.duration ?? info.progressState?.duration;
      if (typeof reportedDuration === "number") duration = reportedDuration;
      if (typeof info.currentTime !== "number") return;
      for (const percent of passedVideoMarks(info.currentTime, duration, reported)) {
        reported.add(percent);
        noteVideo(video.name, percent);
        captureAnalytics("deck_video_progress", {
          deck_version: DECK_VERSION,
          slide,
          video: video.name,
          percent,
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [playing, slide, video.name]);

  function listen() {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: video.youtubeId, channel: "widget" }),
      YOUTUBE_ORIGIN,
    );
  }

  const player = (className: string, style?: CSSProperties) => (
    <iframe
      ref={frame}
      src={`${YOUTUBE_ORIGIN}/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
      title={video.title}
      onLoad={listen}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className={className}
      style={style}
    />
  );

  return (
    <>
      {mode === "inline" ? (
        player("absolute border-0 bg-black", boxStyle(video.box))
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${video.title}`}
          className="group absolute grid cursor-pointer place-items-center"
          style={boxStyle(video.box)}
        >
          <span className="grid size-[clamp(2rem,6cqw,5rem)] place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-black/70 group-focus-visible:ring-2 group-focus-visible:ring-white">
            <Play className="size-[45%] translate-x-[6%] fill-current" aria-hidden />
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={play}
        aria-label={`Play ${video.title}`}
        tabIndex={-1}
        className="absolute cursor-pointer rounded-full"
        style={boxStyle(video.button)}
      />
      {mode === "sheet" ? (
        <Dialog.Root open onOpenChange={(open) => (open ? undefined : setMode(null))}>
          <Dialog.Portal>
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-[100] grid place-items-center bg-black/95 px-3 focus:outline-none"
            >
              <Dialog.Title className="sr-only">{video.title}</Dialog.Title>
              <Dialog.Close
                aria-label="Close video"
                className="absolute top-3 right-3 cursor-pointer rounded-full bg-white p-2 text-[#0d1630] shadow-[0_4px_16px_rgba(0,0,0,.28)]"
              >
                <X aria-hidden className="size-5" />
              </Dialog.Close>
              {player("aspect-video w-full max-w-[calc((100svh-6rem)*16/9)] rounded-lg border-0 bg-black")}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </>
  );
}
