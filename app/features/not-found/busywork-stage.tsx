import { useEffect, useRef, useState } from "react";

import { StartCta } from "../../components/layout/start-cta";
import { captureAnalytics } from "../analytics/analytics.client";
import { usePrefersReducedMotion } from "../landing/media";
import { GLYPHS, START_LIVES } from "./busywork-engine";
import type { BusyworkRuntime, BusyworkView } from "./busywork-runtime";

const INITIAL_VIEW: BusyworkView = {
  phase: "idle",
  score: 0,
  lives: START_LIVES,
  glyphs: 0,
  bonus: false,
  handled: 0,
  seconds: 0,
  best: 0,
  newBest: false,
};

/**
 * Keeps the Clippy opener, "It looks like you're...", so the mascot here reads
 * as the same character as the one on the rest of the site.
 */
const IDLE_LINE = "It looks like you’re lost. Catch that for me?";
const IDLE_LINE_STILL = "It looks like you’re lost. Fancy a quick game?";

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

function summary(view: BusyworkView): string {
  if (!view.handled) {
    return "Nothing caught this time. That’s a job for a computer anyway.";
  }
  return `You handled ${plural(view.handled, "task")} in ${plural(view.seconds, "second")}. That’s a job for a computer.`;
}

/**
 * "Catch the busywork", the 404 page's game. What renders here is the still
 * scene, complete without JavaScript; the runtime that makes it playable is
 * imported after mount so the pages that only fall back to the 404 markup
 * never download it.
 */
export function BusyworkStage() {
  const reducedMotion = usePrefersReducedMotion();
  const [view, setView] = useState(INITIAL_VIEW);
  const [ready, setReady] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const catcherRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLImageElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const runtimeRef = useRef<BusyworkRuntime | null>(null);
  const rounds = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let runtime: BusyworkRuntime | undefined;

    void import("./busywork-runtime").then(({ createBusyworkRuntime }) => {
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      const catcher = catcherRef.current;
      const mascot = mascotRef.current;
      if (cancelled || !stage || !canvas || !catcher || !mascot) return;

      runtime = createBusyworkRuntime({
        stage,
        canvas,
        catcher,
        mascot,
        eyes: eyesRef.current,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
        onView: setView,
        onRoundStart: (via) => {
          rounds.current += 1;
          captureAnalytics("not_found_game_started", {
            via,
            round: rounds.current,
          });
        },
        onRoundOver: (result) => {
          captureAnalytics("not_found_game_over", {
            ...result,
            round: rounds.current,
          });
        },
      });
      runtimeRef.current = runtime;
      setReady(true);
    });

    return () => {
      cancelled = true;
      runtime?.destroy();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion, ready]);

  // Hand the keyboard to Play again, but only from a player already in the
  // game: never pull focus away from the rest of the page.
  const over = view.phase === "over";
  useEffect(() => {
    if (!over) return;
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      stageRef.current?.contains(active)
    ) {
      againRef.current?.focus({ preventScroll: true });
    }
  }, [over]);

  const play = () => {
    runtimeRef.current?.start();
    stageRef.current?.focus({ preventScroll: true });
  };

  const idle = view.phase === "idle";
  const status =
    view.phase === "playing"
      ? "Game started. Catch the work and dodge the meetings."
      : over
        ? `Game over. ${summary(view)}`
        : "";

  return (
    <div className="nf-game">
      <div
        ref={stageRef}
        className="nf-stage"
        role="group"
        aria-label="Catch the busywork, a mini game"
        tabIndex={0}
        data-phase={view.phase}
        data-bonus={view.bonus || undefined}
      >
        <img
          className="nf-clouds"
          src="/assets/landing/atmosphere/clouds-1280.webp"
          srcSet="/assets/landing/atmosphere/clouds-768.webp 768w, /assets/landing/atmosphere/clouds-1280.webp 1280w"
          sizes="(min-width: 896px) 896px, 100vw"
          alt=""
          width={1280}
          height={597}
          decoding="async"
          draggable={false}
        />
        <div className="nf-ground" aria-hidden="true" />

        <div ref={catcherRef} className="nf-catcher">
          {idle && (
            <>
              <p className="nf-bubble" data-bubble>
                {reducedMotion ? IDLE_LINE_STILL : IDLE_LINE}
              </p>
              <span className="nf-bubble-tail" aria-hidden="true" />
            </>
          )}
          <div ref={mascotRef} className="nf-mascot">
            <img
              className="nf-mascot-art"
              src="/assets/landing/clippy/computer.webp"
              alt=""
              width={480}
              height={449}
              decoding="async"
              draggable={false}
            />
            <span className="nf-screen" aria-hidden="true">
              <img
                ref={eyesRef}
                className="nf-screen-logo"
                src="/assets/landing/clippy/screen-logo.webp"
                alt=""
                width={200}
                height={196}
                decoding="async"
                draggable={false}
              />
            </span>
          </div>
        </div>

        <canvas ref={canvasRef} className="nf-canvas" aria-hidden="true" />

        <div className="nf-hud">
          {idle ? (
            <>
              <span className="nf-hud-title">Catch the busywork</span>
              <button
                type="button"
                className="nf-play"
                onClick={play}
                disabled={!ready}
              >
                Play
              </button>
            </>
          ) : (
            <>
              <span className="nf-hud-group">
                <span className="nf-stat">
                  <span className="nf-stat-label">Score</span>
                  <span className="nf-stat-value" data-testid="nf-score">
                    {view.score}
                  </span>
                </span>
                <span
                  className="nf-lives"
                  role="img"
                  aria-label={`${view.lives} ${view.lives === 1 ? "life" : "lives"} left`}
                >
                  {Array.from({ length: START_LIVES }, (_, index) => (
                    <i key={index} data-on={index < view.lives || undefined} />
                  ))}
                </span>
              </span>
              <span className="nf-hud-group">
                <span
                  className="nf-glyphs"
                  role="img"
                  aria-label={`${view.glyphs} of ${GLYPHS.length} digits collected`}
                >
                  {GLYPHS.map((glyph, index) => (
                    <i key={index} data-on={index < view.glyphs || undefined}>
                      {glyph}
                    </i>
                  ))}
                </span>
                {view.bonus && <span className="nf-bonus">×2</span>}
              </span>
              <span className="nf-stat">
                <span className="nf-stat-label">Best</span>
                <span className="nf-stat-value">
                  {Math.max(view.best, view.score)}
                </span>
              </span>
            </>
          )}
        </div>

        {over && (
          <div className="nf-over">
            <div className="nf-over-card">
              <p className="nf-over-title">
                {view.newBest
                  ? "New best. The inbox still won."
                  : "The inbox won."}
              </p>
              <p className="nf-over-copy">{summary(view)}</p>
              <div className="nf-over-actions">
                <button
                  ref={againRef}
                  type="button"
                  className="nf-again"
                  onClick={play}
                >
                  Play again
                </button>
                <StartCta
                  source="404_game"
                  className="min-h-10 px-4 text-xs"
                  authedChildren="Open Construct"
                  onClick={() =>
                    captureAnalytics("not_found_game_cta_clicked", {
                      score: view.score,
                      round: rounds.current,
                    })
                  }
                >
                  Give Construct the real ones
                </StartCta>
              </div>
            </div>
          </div>
        )}

        <span className="sr-only" role="status" aria-live="polite">
          {status}
        </span>
      </div>
      <p className="nf-hint">
        Move your mouse, drag, or use the arrow keys. Catch the work, dodge the
        meetings, and collect 4, 0, 4. Esc quits.
      </p>
    </div>
  );
}
