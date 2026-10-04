/**
 * Rules for "Catch the busywork", the 404 page's game. No DOM and no clock in
 * here: the runtime feeds it time and input, so a seed replays the same game
 * and the rules can be tested without a browser.
 *
 * Space is normalized. x runs 0 to 1 across the stage, y runs 0 at the top to
 * 1 at the ground line, and speeds are stage heights per second.
 */

export const WORK_KINDS = ["email", "invoice", "sheet"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];
export type ItemKind = WorkKind | "meeting" | "glyph";

/** The page's own digits, collected in order. */
export const GLYPHS = ["4", "0", "4"] as const;

export const START_LIVES = 3;
export const BONUS_SECONDS = 10;
/** Longest step the rules accept, so a stalled tab cannot drop items through the catcher. */
export const MAX_STEP = 0.05;

const POINTER_SPEED = 3.2;
const KEY_SPEED = 1.25;
const SPAWN_Y = -0.08;
const DEMO_SPEED = 0.22;
const DEMO_LANES = [0.24, 0.76] as const;
const DEMO_GAP = 0.7;
/** How far a new item may land from the last one, so a keyboard can reach it. */
const MAX_SPAWN_JUMP = 0.55;
const MEETING_FREE_SECONDS = 6;
/** The catcher's art has soft edges, so only this much of its width catches. */
const CATCH_REACH = 0.85;

export type Item = {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  speed: number;
  /** Index into GLYPHS, or -1. */
  glyph: number;
};

export type GameConfig = {
  /** Half the catcher's width. */
  catchHalf: number;
  /** Half an item's width. */
  itemHalf: number;
  /** y of the catcher's top edge; an item is catchable from here to the ground. */
  catchTop: number;
};

export type GameInput = {
  /** Where the pointer is, or null when the keyboard is steering. */
  pointerX: number | null;
  dir: -1 | 0 | 1;
};

export type GameEvent =
  | { type: "start" }
  | { type: "catch"; kind: WorkKind; x: number; points: number }
  | { type: "miss"; x: number }
  | { type: "hit"; x: number }
  | { type: "glyph"; index: number; x: number }
  | { type: "found"; x: number }
  | { type: "bonus-end" }
  | { type: "over" };

export type Phase = "idle" | "playing" | "over";

export type GameState = {
  phase: Phase;
  /** Seconds of play. Stops at game over. */
  time: number;
  score: number;
  /** Work items caught, whatever they scored. */
  handled: number;
  lives: number;
  catcherX: number;
  items: Item[];
  /** How many of GLYPHS are in hand. */
  glyphs: number;
  /** `time` at which double points stop, or 0. */
  bonusUntil: number;
  spawnIn: number;
  glyphAt: number;
  lastSpawnX: number;
  demoLane: number;
  nextId: number;
  seed: number;
};

export function createGame(seed: number): GameState {
  return {
    phase: "idle",
    time: 0,
    score: 0,
    handled: 0,
    lives: START_LIVES,
    catcherX: 0.5,
    items: [],
    glyphs: 0,
    bonusUntil: 0,
    spawnIn: DEMO_GAP,
    glyphAt: 0,
    lastSpawnX: 0.5,
    demoLane: 0,
    nextId: 1,
    seed: seed >>> 0,
  };
}

/** mulberry32, advancing the seed kept on the state. */
function random(state: GameState): number {
  state.seed = (state.seed + 0x6d2b79f5) >>> 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function fallSpeed(time: number): number {
  return 0.3 + 0.5 * (1 - Math.exp(-time / 45));
}

export function spawnInterval(time: number): number {
  return 0.42 + 0.78 * Math.exp(-time / 30);
}

export function meetingChance(time: number): number {
  if (time < MEETING_FREE_SECONDS) return 0;
  return Math.min(0.25, 0.08 + (time - MEETING_FREE_SECONDS) * 0.004);
}

export function isBonus(state: GameState): boolean {
  return state.phase === "playing" && state.time < state.bonusUntil;
}

function beginPlay(state: GameState) {
  state.phase = "playing";
  state.time = 0;
  state.score = 0;
  state.handled = 0;
  state.lives = START_LIVES;
  state.glyphs = 0;
  state.bonusUntil = 0;
  state.spawnIn = 0.5;
  state.glyphAt = 5 + random(state) * 3;
}

/** Starts a round outright: the Play button, or Play again. */
export function startGame(state: GameState): GameEvent[] {
  state.items = [];
  state.lastSpawnX = state.catcherX;
  beginPlay(state);
  return [{ type: "start" }];
}

/** Back to the attract loop, keeping the catcher where it stands. */
export function resetGame(state: GameState) {
  const { catcherX, seed, nextId } = state;
  Object.assign(state, createGame(seed), { catcherX, nextId });
}

function moveCatcher(
  state: GameState,
  dt: number,
  input: GameInput,
  config: GameConfig,
) {
  const min = config.catchHalf;
  const max = 1 - config.catchHalf;
  if (input.pointerX != null) {
    const target = clamp(input.pointerX, min, max);
    const reach = POINTER_SPEED * dt;
    state.catcherX += clamp(target - state.catcherX, -reach, reach);
  } else {
    state.catcherX += input.dir * KEY_SPEED * dt;
  }
  state.catcherX = clamp(state.catcherX, min, max);
}

function spawn(
  state: GameState,
  kind: ItemKind,
  x: number,
  speed: number,
): Item {
  const item: Item = {
    id: state.nextId,
    kind,
    x,
    y: SPAWN_Y,
    speed,
    glyph: kind === "glyph" ? state.glyphs : -1,
  };
  state.nextId += 1;
  state.lastSpawnX = x;
  state.items.push(item);
  return item;
}

function spawnX(state: GameState, config: GameConfig): number {
  const edge = config.itemHalf + 0.02;
  const min = Math.max(edge, state.lastSpawnX - MAX_SPAWN_JUMP);
  const max = Math.min(1 - edge, state.lastSpawnX + MAX_SPAWN_JUMP);
  return min + random(state) * (max - min);
}

function spawnForPlay(state: GameState, config: GameConfig) {
  const speed = fallSpeed(state.time) * (0.9 + random(state) * 0.25);
  const x = spawnX(state, config);

  const glyphDue =
    state.time >= state.glyphAt &&
    !isBonus(state) &&
    !state.items.some((item) => item.kind === "glyph");
  if (glyphDue) {
    spawn(state, "glyph", x, speed * 0.85);
    state.glyphAt = state.time + 6 + random(state) * 4;
    return;
  }

  if (random(state) < meetingChance(state.time)) {
    spawn(state, "meeting", x, speed);
    return;
  }
  const kind = WORK_KINDS[Math.floor(random(state) * WORK_KINDS.length)]!;
  spawn(state, kind, x, speed);
}

function isOverCatcher(state: GameState, item: Item, config: GameConfig) {
  return (
    item.y >= config.catchTop &&
    Math.abs(item.x - state.catcherX) <=
      config.catchHalf * CATCH_REACH + config.itemHalf * 0.6
  );
}

function loseLife(state: GameState, events: GameEvent[]) {
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 0;
    state.phase = "over";
    events.push({ type: "over" });
  }
}

function stepIdle(
  state: GameState,
  dt: number,
  config: GameConfig,
  events: GameEvent[],
) {
  if (!state.items.length) {
    state.spawnIn -= dt;
    if (state.spawnIn > 0) return;
    spawn(state, "email", DEMO_LANES[state.demoLane]!, DEMO_SPEED);
    state.demoLane = (state.demoLane + 1) % DEMO_LANES.length;
  }

  const [demo] = state.items;
  if (!demo) return;
  demo.y += demo.speed * dt;

  // Catching the demo item is how a round begins: it counts as the first task.
  if (isOverCatcher(state, demo, config)) {
    state.items = [];
    beginPlay(state);
    state.score = 1;
    state.handled = 1;
    events.push(
      { type: "start" },
      { type: "catch", kind: "email", x: demo.x, points: 1 },
    );
    return;
  }
  if (demo.y >= 1) {
    state.items = [];
    state.spawnIn = DEMO_GAP;
  }
}

function stepPlay(
  state: GameState,
  dt: number,
  config: GameConfig,
  events: GameEvent[],
) {
  state.time += dt;

  if (state.bonusUntil && state.time >= state.bonusUntil) {
    state.bonusUntil = 0;
    state.glyphs = 0;
    events.push({ type: "bonus-end" });
  }

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    spawnForPlay(state, config);
    state.spawnIn += spawnInterval(state.time);
  }

  const remaining: Item[] = [];
  for (const item of state.items) {
    // Whatever is still falling when the last life goes is left in the air.
    if (state.phase !== "playing") {
      remaining.push(item);
      continue;
    }
    item.y += item.speed * dt;

    if (isOverCatcher(state, item, config)) {
      if (item.kind === "meeting") {
        events.push({ type: "hit", x: item.x });
        loseLife(state, events);
      } else if (item.kind === "glyph") {
        state.glyphs += 1;
        events.push({ type: "glyph", index: item.glyph, x: item.x });
        if (state.glyphs >= GLYPHS.length) {
          state.bonusUntil = state.time + BONUS_SECONDS;
          events.push({ type: "found", x: item.x });
        }
      } else {
        const points = isBonus(state) ? 2 : 1;
        state.score += points;
        state.handled += 1;
        events.push({ type: "catch", kind: item.kind, x: item.x, points });
      }
      continue;
    }

    if (item.y >= 1) {
      // A dodged meeting or a dropped glyph costs nothing. Dropped work does.
      if (item.kind !== "meeting" && item.kind !== "glyph") {
        events.push({ type: "miss", x: item.x });
        loseLife(state, events);
      }
      continue;
    }
    remaining.push(item);
  }
  state.items = remaining;
}

/**
 * Advances the game in place and returns what happened, in order. `dt` is
 * seconds and is capped at MAX_STEP.
 */
export function stepGame(
  state: GameState,
  dt: number,
  input: GameInput,
  config: GameConfig,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase === "over") return events;

  const step = clamp(dt, 0, MAX_STEP);
  moveCatcher(state, step, input, config);
  if (state.phase === "idle") stepIdle(state, step, config, events);
  else stepPlay(state, step, config, events);
  return events;
}
