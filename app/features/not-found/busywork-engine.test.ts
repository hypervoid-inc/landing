import { describe, expect, it } from "vitest";

import {
  BONUS_SECONDS,
  GLYPHS,
  START_LIVES,
  createGame,
  fallSpeed,
  isBonus,
  meetingChance,
  resetGame,
  spawnInterval,
  startGame,
  stepGame,
  type GameConfig,
  type GameEvent,
  type GameInput,
  type GameState,
  type Item,
  type ItemKind,
} from "./busywork-engine";

const config: GameConfig = { catchHalf: 0.08, itemHalf: 0.04, catchTop: 0.75 };
const still: GameInput = { pointerX: null, dir: 0 };
const FRAME = 1 / 60;

function run(
  state: GameState,
  seconds: number,
  input: GameInput | ((state: GameState) => GameInput) = still,
): GameEvent[] {
  const events: GameEvent[] = [];
  for (let elapsed = 0; elapsed < seconds; elapsed += FRAME) {
    const next = typeof input === "function" ? input(state) : input;
    events.push(...stepGame(state, FRAME, next, config));
  }
  return events;
}

/** A round with nothing scheduled, so a test controls exactly what falls. */
function quietRound(): GameState {
  const state = createGame(7);
  startGame(state);
  state.spawnIn = 1_000;
  state.glyphAt = 1_000;
  return state;
}

function drop(state: GameState, kind: ItemKind, x: number): Item {
  const item: Item = {
    id: state.nextId,
    kind,
    x,
    y: 0.7,
    speed: 0.5,
    glyph: kind === "glyph" ? state.glyphs : -1,
  };
  state.nextId += 1;
  state.items.push(item);
  return item;
}

/** Steers under the lowest piece of work and away from meetings. */
const autopilot = (state: GameState): GameInput => {
  const wanted = state.items
    .filter((item) => item.kind !== "meeting")
    .sort((left, right) => right.y - left.y)[0];
  const meeting = state.items.find(
    (item) => item.kind === "meeting" && item.y > 0.5,
  );
  if (meeting && (!wanted || wanted.y < meeting.y)) {
    return {
      pointerX: meeting.x < 0.5 ? meeting.x + 0.3 : meeting.x - 0.3,
      dir: 0,
    };
  }
  return { pointerX: wanted?.x ?? state.catcherX, dir: 0 };
};

describe("busywork engine", () => {
  it("replays the same game from the same seed", () => {
    const left = createGame(42);
    const right = createGame(42);
    startGame(left);
    startGame(right);
    expect(run(left, 20, autopilot)).toEqual(run(right, 20, autopilot));
    expect(left).toEqual(right);

    const other = createGame(43);
    startGame(other);
    run(other, 20, autopilot);
    expect(other.items).not.toEqual(left.items);
  });

  it("loops one slow demo item while idle and never scores it", () => {
    const state = createGame(1);
    state.catcherX = 0.5;
    const events = run(state, 12);
    expect(events).toEqual([]);
    expect(state.phase).toBe("idle");
    expect(state.items.length).toBeLessThanOrEqual(1);
    expect(state.lives).toBe(START_LIVES);
  });

  it("starts the round when the demo item is caught", () => {
    const state = createGame(1);
    const events = run(state, 8, (current) => ({
      pointerX: current.items[0]?.x ?? 0.5,
      dir: 0,
    }));
    expect(events.slice(0, 2)).toEqual([
      { type: "start" },
      { type: "catch", kind: "email", x: 0.24, points: 1 },
    ]);
    expect(state.phase).toBe("playing");
    expect(state.handled).toBeGreaterThanOrEqual(1);
  });

  it("scores caught work and costs a life for dropped work", () => {
    const state = quietRound();
    state.catcherX = 0.3;
    drop(state, "invoice", 0.3);
    drop(state, "sheet", 0.8);
    const events = run(state, 1);
    expect(events).toEqual([
      { type: "catch", kind: "invoice", x: 0.3, points: 1 },
      { type: "miss", x: 0.8 },
    ]);
    expect(state.score).toBe(1);
    expect(state.handled).toBe(1);
    expect(state.lives).toBe(START_LIVES - 1);
    expect(state.items).toEqual([]);
  });

  it("punishes catching a meeting and rewards dodging it", () => {
    const state = quietRound();
    state.catcherX = 0.3;
    drop(state, "meeting", 0.3);
    drop(state, "meeting", 0.8);
    expect(run(state, 1)).toEqual([{ type: "hit", x: 0.3 }]);
    expect(state.lives).toBe(START_LIVES - 1);
    expect(state.score).toBe(0);
  });

  it("ends after three lost lives and then stops moving", () => {
    const state = quietRound();
    state.catcherX = 0.1;
    drop(state, "email", 0.9);
    drop(state, "email", 0.9);
    drop(state, "email", 0.9);
    const falling = drop(state, "email", 0.9);
    falling.y = 0.2;
    const events = run(state, 1);
    expect(events.at(-1)).toEqual({ type: "over" });
    expect(events.filter((event) => event.type === "miss")).toHaveLength(3);
    expect(state.phase).toBe("over");
    expect(state.lives).toBe(0);

    const frozen = structuredClone(state);
    expect(run(state, 2, { pointerX: 0.9, dir: 0 })).toEqual([]);
    expect(state).toEqual(frozen);
  });

  it("doubles points for a while once 4, 0, 4 are collected", () => {
    const state = quietRound();
    state.catcherX = 0.5;
    const events: GameEvent[] = [];
    for (let index = 0; index < GLYPHS.length; index += 1) {
      drop(state, "glyph", 0.5);
      events.push(...run(state, 0.5));
    }
    expect(events).toEqual([
      { type: "glyph", index: 0, x: 0.5 },
      { type: "glyph", index: 1, x: 0.5 },
      { type: "glyph", index: 2, x: 0.5 },
      { type: "found", x: 0.5 },
    ]);
    expect(isBonus(state)).toBe(true);

    drop(state, "email", 0.5);
    expect(run(state, 0.5)).toEqual([
      { type: "catch", kind: "email", x: 0.5, points: 2 },
    ]);
    expect(state.score).toBe(2);
    expect(state.handled).toBe(1);

    expect(run(state, BONUS_SECONDS)).toEqual([{ type: "bonus-end" }]);
    expect(isBonus(state)).toBe(false);
    expect(state.glyphs).toBe(0);
  });

  it("lets a dropped glyph go without costing a life", () => {
    const state = quietRound();
    state.catcherX = 0.1;
    drop(state, "glyph", 0.9);
    expect(run(state, 1)).toEqual([]);
    expect(state.lives).toBe(START_LIVES);
    expect(state.glyphs).toBe(0);
  });

  it("keeps the catcher on the stage for pointer and keyboard alike", () => {
    const state = quietRound();
    run(state, 2, { pointerX: 5, dir: 0 });
    expect(state.catcherX).toBeCloseTo(1 - config.catchHalf);
    run(state, 3, { pointerX: null, dir: -1 });
    expect(state.catcherX).toBeCloseTo(config.catchHalf);
  });

  it("swallows a stalled frame instead of teleporting items", () => {
    const state = quietRound();
    state.catcherX = 0.5;
    const item = drop(state, "email", 0.5);
    item.y = 0;
    stepGame(state, 30, still, config);
    expect(item.y).toBeLessThan(0.1);
  });

  it("gets harder, within limits", () => {
    expect(fallSpeed(60)).toBeGreaterThan(fallSpeed(0));
    expect(fallSpeed(10_000)).toBeLessThanOrEqual(0.8);
    expect(spawnInterval(60)).toBeLessThan(spawnInterval(0));
    expect(spawnInterval(10_000)).toBeGreaterThanOrEqual(0.42);
    expect(meetingChance(0)).toBe(0);
    expect(meetingChance(10_000)).toBe(0.25);
  });

  it("stays winnable for a player who keeps up, and ends for one who does not", () => {
    const attentive = createGame(2026);
    startGame(attentive);
    run(attentive, 45, autopilot);
    expect(attentive.phase).toBe("playing");
    expect(attentive.handled).toBeGreaterThan(30);

    const absent = createGame(2026);
    startGame(absent);
    absent.catcherX = 0.02;
    run(absent, 45, { pointerX: null, dir: -1 });
    expect(absent.phase).toBe("over");
  });

  it("returns to the attract loop on reset", () => {
    const state = quietRound();
    state.catcherX = 0.3;
    state.score = 9;
    resetGame(state);
    expect(state.phase).toBe("idle");
    expect(state.score).toBe(0);
    expect(state.catcherX).toBe(0.3);
    expect(state.items).toEqual([]);
  });
});
