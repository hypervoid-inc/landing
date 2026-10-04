/**
 * The browser half of the 404 game: clock, input, canvas, and the mascot's
 * position. Loaded on demand by the stage, so none of it weighs on the pages
 * that only render the 404 markup as a fallback. Rules live in the engine.
 */
import canvasConfetti from "canvas-confetti";

import {
  GLYPHS,
  createGame,
  isBonus,
  resetGame,
  startGame,
  stepGame,
  type GameConfig,
  type GameEvent,
  type Item,
  type Phase,
  type WorkKind,
} from "./busywork-engine";
import {
  SPRITE_SIZE,
  rasterizeSprite,
  type SpriteName,
} from "./busywork-sprites";

export type BusyworkView = {
  phase: Phase;
  score: number;
  lives: number;
  glyphs: number;
  bonus: boolean;
  /** Filled in at game over; 0 while playing so the HUD is not re-rendered every second. */
  handled: number;
  seconds: number;
  best: number;
  newBest: boolean;
};

export type BusyworkResult = {
  score: number;
  handled: number;
  seconds: number;
  newBest: boolean;
};

export type BusyworkOptions = {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Positioned wrapper that slides along the ground. */
  catcher: HTMLElement;
  /** The sprite inside it, which squashes and shakes. */
  mascot: HTMLElement;
  /** The face on the mascot's screen, nudged toward whatever it is watching. */
  eyes: HTMLElement | null;
  reducedMotion: boolean;
  onView: (view: BusyworkView) => void;
  onRoundStart?: (via: "catch" | "button") => void;
  onRoundOver?: (result: BusyworkResult) => void;
};

export type BusyworkRuntime = {
  start: () => void;
  quit: () => void;
  setReducedMotion: (reduced: boolean) => void;
  destroy: () => void;
};

const BEST_KEY = "construct_404_best";
const GAZE_RANGE = 9;
const GAZE_RADIUS_PX = 320;
const INK = "#4e4646";
const FONT = '600 13px "Geist Variable", "Geist", system-ui, sans-serif';

const QUIPS: Record<WorkKind, readonly string[]> = {
  email: ["Replied.", "Archived.", "Unsubscribed."],
  invoice: ["Filed.", "Paid.", "Logged."],
  sheet: ["Summed.", "Tidied.", "Reconciled."],
};

const SPARK: Record<WorkKind | "glyph", string> = {
  email: "#01b4c8",
  invoice: "#01b4c8",
  sheet: "#2fa36b",
  glyph: "#f7b500",
};

type FloatText = {
  text: string;
  x: number;
  y: number;
  age: number;
  life: number;
  color: string;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  color: string;
};

function readBest(): number {
  try {
    const stored = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
  } catch {
    return 0;
  }
}

function writeBest(best: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode or blocked storage: the score just does not persist.
  }
}

function spriteFor(item: Item): SpriteName {
  if (item.kind !== "glyph") return item.kind;
  return GLYPHS[item.glyph] === "0" ? "zero" : "four";
}

export function createBusyworkRuntime(
  options: BusyworkOptions,
): BusyworkRuntime {
  const { stage, canvas, catcher, mascot, eyes } = options;
  const context = canvas.getContext("2d");
  const state = createGame((Date.now() ^ (Math.random() * 2 ** 32)) >>> 0);

  let reducedMotion = options.reducedMotion;
  let width = 1;
  let height = 1;
  let groundY = 1;
  let mascotHeight = 1;
  let spritePx = SPRITE_SIZE * 3;
  let spriteScale = 0;
  let config: GameConfig = { catchHalf: 0.1, itemHalf: 0.05, catchTop: 0.75 };
  const sprites = new Map<SpriteName, HTMLCanvasElement>();

  let pointerX: number | null = null;
  let gazeX = 0;
  let gazeY = 0;
  let hasGaze = false;
  const keys = new Set<"left" | "right">();

  let best = readBest();
  let newBest = false;
  let quipIndex = 0;
  let floats: FloatText[] = [];
  let sparks: Spark[] = [];

  let raf = 0;
  let last = 0;
  let onScreen = true;
  let moodTimer = 0;
  let lastView = "";

  function measure() {
    const stageRect = stage.getBoundingClientRect();
    const mascotRect = mascot.getBoundingClientRect();
    if (!stageRect.width || !mascotRect.width) return;

    width = stageRect.width;
    height = stageRect.height;
    groundY = mascotRect.bottom - stageRect.top;
    mascotHeight = mascotRect.height;

    const scale = width < 520 ? 2 : 3;
    spritePx = SPRITE_SIZE * scale;
    if (scale !== spriteScale) {
      spriteScale = scale;
      sprites.clear();
    }

    config = {
      catchHalf: mascotRect.width / 2 / width,
      itemHalf: spritePx / 2 / width,
      catchTop: (groundY - mascotHeight * 0.9) / groundY,
    };

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    wake();
  }

  function sprite(name: SpriteName): HTMLCanvasElement {
    let cached = sprites.get(name);
    if (!cached) {
      cached = rasterizeSprite(name, spriteScale || 3);
      sprites.set(name, cached);
    }
    return cached;
  }

  function pushView() {
    const over = state.phase === "over";
    const view: BusyworkView = {
      phase: state.phase,
      score: state.score,
      lives: state.lives,
      glyphs: state.glyphs,
      bonus: isBonus(state),
      handled: over ? state.handled : 0,
      seconds: over ? Math.round(state.time) : 0,
      best,
      newBest,
    };
    const key = JSON.stringify(view);
    if (key === lastView) return;
    lastView = key;
    options.onView(view);
  }

  function react(kind: "squash" | "shake") {
    if (reducedMotion || typeof mascot.animate !== "function") return;
    mascot.animate(
      kind === "squash"
        ? [
            { transform: "scale(1, 1)" },
            { transform: "scale(1.09, 0.9)" },
            { transform: "scale(1, 1)" },
          ]
        : [
            { transform: "translateX(0)" },
            { transform: "translateX(-5px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(-2px)" },
            { transform: "translateX(0)" },
          ],
      { duration: kind === "squash" ? 170 : 260, easing: "ease-out" },
    );
  }

  function setMood(mood: "hurt" | "bright") {
    mascot.dataset.mood = mood;
    window.clearTimeout(moodTimer);
    moodTimer = window.setTimeout(() => delete mascot.dataset.mood, 320);
  }

  function say(text: string, x: number, color = INK, life = 0.9) {
    floats.push({
      text,
      x: x * width,
      y: groundY - mascotHeight - 10,
      age: 0,
      life,
      color,
    });
  }

  function burst(x: number, color: string) {
    if (reducedMotion) return;
    for (let index = 0; index < 7; index += 1) {
      const angle = Math.PI * (1.1 + Math.random() * 0.8);
      const speed = 70 + Math.random() * 110;
      sparks.push({
        x: x * width,
        y: groundY - mascotHeight * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        color,
      });
    }
  }

  function confetti(x: number) {
    if (reducedMotion) return;
    const rect = stage.getBoundingClientRect();
    void canvasConfetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 32,
      disableForReducedMotion: true,
      origin: {
        x: (rect.left + x * width) / window.innerWidth,
        y: (rect.top + groundY - mascotHeight) / window.innerHeight,
      },
    });
  }

  function handle(events: GameEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case "start":
          newBest = false;
          options.onRoundStart?.("catch");
          break;
        case "catch": {
          const lines = QUIPS[event.kind];
          const line = lines[quipIndex % lines.length]!;
          quipIndex += 1;
          say(event.points > 1 ? `${line} ×2` : line, event.x);
          burst(event.x, SPARK[event.kind]);
          react("squash");
          break;
        }
        case "glyph":
          say(`Got the ${GLYPHS[event.index]}.`, event.x, "#a36b00");
          burst(event.x, SPARK.glyph);
          react("squash");
          break;
        case "found":
          say("Found it. It was never here.", event.x, "#a36b00", 2.2);
          setMood("bright");
          confetti(event.x);
          break;
        case "miss":
          say("Dropped one.", event.x, "#b42318");
          react("shake");
          break;
        case "hit":
          say("Ugh, a meeting.", event.x, "#b42318");
          setMood("hurt");
          react("shake");
          break;
        case "bonus-end":
          break;
        case "over": {
          newBest = state.score > best;
          if (newBest) {
            best = state.score;
            writeBest(best);
            confetti(state.catcherX);
          }
          options.onRoundOver?.({
            score: state.score,
            handled: state.handled,
            seconds: Math.round(state.time),
            newBest,
          });
          break;
        }
      }
    }
  }

  function placeCatcher() {
    const center = state.catcherX * width;
    catcher.style.transform = `translate3d(${(center - width / 2).toFixed(1)}px, 0, 0) translateX(-50%)`;

    // The idle bubble is wider than the mascot, so it leans back in at the edges.
    const bubble = catcher.querySelector<HTMLElement>("[data-bubble]");
    if (bubble) {
      const half = bubble.offsetWidth / 2;
      const clamped = Math.min(
        Math.max(center, half + 10),
        Math.max(half + 10, width - half - 10),
      );
      bubble.style.setProperty(
        "--nf-bubble-shift",
        `${(clamped - center).toFixed(1)}px`,
      );
    }
  }

  function placeEyes() {
    if (!eyes) return;
    const eyeX = state.catcherX * width;
    const eyeY = groundY - mascotHeight * 0.68;

    let targetX: number | null = null;
    let targetY = 0;
    const watched = [...state.items].sort((a, b) => b.y - a.y)[0];
    if (watched && state.phase !== "over") {
      targetX = watched.x * width;
      targetY = watched.y * groundY;
    } else if (hasGaze) {
      targetX = gazeX;
      targetY = gazeY;
    }
    if (targetX == null || reducedMotion) {
      eyes.style.transform = "";
      return;
    }
    const dx = targetX - eyeX;
    const dy = targetY - eyeY;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, distance / GAZE_RADIUS_PX);
    eyes.style.transform = `translate(${((dx / distance) * GAZE_RANGE * reach).toFixed(2)}%, ${((dy / distance) * GAZE_RANGE * reach).toFixed(2)}%)`;
  }

  function draw(dt: number) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;

    for (const item of state.items) {
      const x = Math.round(item.x * width - spritePx / 2);
      const y = Math.round(item.y * groundY - spritePx / 2);
      if (item.kind === "glyph") {
        context.save();
        context.shadowColor = "rgba(247, 181, 0, 0.75)";
        context.shadowBlur = 14;
        context.drawImage(sprite(spriteFor(item)), x, y, spritePx, spritePx);
        context.restore();
      } else {
        context.drawImage(sprite(spriteFor(item)), x, y, spritePx, spritePx);
      }
    }

    sparks = sparks.filter((spark) => spark.age < 0.5);
    for (const spark of sparks) {
      spark.age += dt;
      spark.vy += 520 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      context.globalAlpha = Math.max(0, 1 - spark.age / 0.5);
      context.fillStyle = spark.color;
      context.fillRect(Math.round(spark.x), Math.round(spark.y), 4, 4);
    }

    floats = floats.filter((float) => float.age < float.life);
    context.font = FONT;
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.lineJoin = "round";
    context.lineWidth = 4;
    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    for (const float of floats) {
      float.age += dt;
      const progress = float.age / float.life;
      const half = context.measureText(float.text).width / 2 + 8;
      const x = Math.min(Math.max(float.x, half), Math.max(half, width - half));
      const y = float.y - progress * 26;
      context.globalAlpha = progress < 0.7 ? 1 : (1 - progress) / 0.3;
      context.strokeText(float.text, x, y);
      context.fillStyle = float.color;
      context.fillText(float.text, x, y);
    }
    context.globalAlpha = 1;
  }

  function isAnimating(): boolean {
    if (!onScreen || document.hidden) return false;
    if (state.phase === "playing") return true;
    if (state.phase === "idle" && !reducedMotion) return true;
    return floats.length > 0 || sparks.length > 0;
  }

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;

    const idleAndStill = state.phase === "idle" && reducedMotion;
    if (state.phase !== "over" && !idleAndStill) {
      const dir = ((keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0)) as
        -1 | 0 | 1;
      handle(stepGame(state, dt, { pointerX, dir }, config));
    }

    placeCatcher();
    placeEyes();
    draw(dt);
    pushView();
    if (isAnimating()) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function start() {
    floats = [];
    sparks = [];
    newBest = false;
    startGame(state);
    options.onRoundStart?.("button");
    wake();
  }

  function quit() {
    keys.clear();
    floats = [];
    sparks = [];
    newBest = false;
    resetGame(state);
    wake();
  }

  function onPointer(event: PointerEvent) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width) return;
    pointerX = (event.clientX - rect.left) / rect.width;
    keys.clear();
    wake();
  }

  function onDocumentPointer(event: PointerEvent) {
    const rect = stage.getBoundingClientRect();
    gazeX = event.clientX - rect.left;
    gazeY = event.clientY - rect.top;
    hasGaze = true;
  }

  /** Keys only steer when nothing else on the page is asking for them. */
  function keysAreOurs(): boolean {
    if (document.body.hasAttribute("data-scroll-locked")) return false;
    const active = document.activeElement;
    return !active || active === document.body || stage.contains(active);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }
    if (!keysAreOurs()) return;

    const key = event.key;
    const side =
      key === "ArrowLeft" || key === "a" || key === "A"
        ? "left"
        : key === "ArrowRight" || key === "d" || key === "D"
          ? "right"
          : null;

    if (side) {
      if (state.phase === "over") return;
      if (state.phase === "idle" && reducedMotion) return;
      keys.add(side);
      pointerX = null;
      event.preventDefault();
      wake();
      return;
    }
    if (key === "Escape" && state.phase === "playing") {
      event.preventDefault();
      quit();
      return;
    }
    // Enter or Space on the stage itself, not on a button inside it.
    if (
      (key === "Enter" || key === " ") &&
      document.activeElement === stage &&
      state.phase !== "playing"
    ) {
      event.preventDefault();
      start();
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    const key = event.key;
    if (key === "ArrowLeft" || key === "a" || key === "A") keys.delete("left");
    if (key === "ArrowRight" || key === "d" || key === "D")
      keys.delete("right");
  }

  const onBlur = () => keys.clear();
  const onVisibility = () => {
    keys.clear();
    wake();
  };

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  resizeObserver.observe(mascot);

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    if (onScreen) wake();
  });
  intersectionObserver.observe(stage);

  stage.addEventListener("pointermove", onPointer);
  stage.addEventListener("pointerdown", onPointer);
  document.addEventListener("pointermove", onDocumentPointer, {
    passive: true,
  });
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);

  measure();
  pushView();
  wake();

  return {
    start,
    quit,
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      wake();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(moodTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      stage.removeEventListener("pointermove", onPointer);
      stage.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointermove", onDocumentPointer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      catcher.style.transform = "";
      eyes?.style.removeProperty("transform");
    },
  };
}
