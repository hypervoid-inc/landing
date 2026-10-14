import { describe, expect, it } from "vitest";

import {
  normalizeEmbedReply,
  type EmbedAction,
} from "../../../shared/embed-schema";
import { CHIPS, GREETING, LOCK_COPY, OFFER_COPY, WALL_COPY } from "./copy";
import {
  applyAction,
  closeApp,
  EMPTY_WORLD,
  focusApp,
  resolveDay,
  toggleTask,
} from "./world";

const DASHES = new RegExp("[\\u2013\\u2014]");
// A Wednesday.
const NOW = new Date("2026-10-14T10:00:00Z");

describe("the toy desktop", () => {
  it("opens the app an action lands in and brings it to the front", () => {
    let world = applyAction(EMPTY_WORLD, { type: "note", title: "Plan", body: "Go" }, "n1", NOW);
    expect(world.open).toEqual(["notes"]);
    expect(world.notes[0]).toMatchObject({ id: "n1", title: "Plan" });

    world = applyAction(
      world,
      { type: "tasks", title: "Today", items: ["Write", "Ship"] },
      "t1",
      NOW,
    );
    expect(world.open).toEqual(["notes", "tasks"]);
    expect(world.tasks[0]?.items.map((item) => item.text)).toEqual(["Write", "Ship"]);

    world = focusApp(world, "notes");
    expect(world.open).toEqual(["tasks", "notes"]);
    world = closeApp(world, "tasks");
    expect(world.open).toEqual(["notes"]);
  });

  it("resolves today and tomorrow against the clock and sorts the week", () => {
    expect(resolveDay("today", NOW)).toBe("wed");
    expect(resolveDay("tomorrow", NOW)).toBe("thu");
    expect(resolveDay("mon", NOW)).toBe("mon");

    let world = applyAction(
      EMPTY_WORLD,
      { type: "event", title: "Standup", day: "fri", time: "09:00" },
      "e1",
      NOW,
    );
    world = applyAction(
      world,
      { type: "event", title: "Dentist", day: "today", time: "15:30" },
      "e2",
      NOW,
    );
    world = applyAction(
      world,
      { type: "event", title: "Gym", day: "fri", time: "07:00" },
      "e3",
      NOW,
    );
    expect(world.events.map((event) => event.title)).toEqual(["Dentist", "Gym", "Standup"]);
  });

  it("shows the newest item in a window and lets a task be ticked", () => {
    let world = applyAction(EMPTY_WORLD, { type: "note", title: "A", body: "a" }, "n1", NOW);
    world = applyAction(world, { type: "note", title: "B", body: "b" }, "n2", NOW);
    expect(world.shown.notes).toBe(1);

    world = applyAction(world, { type: "tasks", title: "L", items: ["x"] }, "t1", NOW);
    world = toggleTask(world, "t1", "t1-0");
    expect(world.tasks[0]?.items[0]?.done).toBe(true);
  });
});

describe("the model's reply", () => {
  it("keeps the good actions of a partly malformed answer", () => {
    const reply = normalizeEmbedReply({
      say: "Done.",
      mood: "excited",
      actions: [
        { type: "note", title: "Ok", body: "fine" },
        { type: "event", title: "Bad", day: "someday", time: "9am" },
        { type: "email", to: "a@b.c", subject: "Hi", body: "there" },
      ],
    });
    expect(reply?.mood).toBe("happy");
    expect(reply?.actions.map((action: EmbedAction) => action.type)).toEqual([
      "note",
      "email",
    ]);
  });

  it("rejects an answer with nothing to say", () => {
    expect(normalizeEmbedReply({ actions: [] })).toBeNull();
    expect(normalizeEmbedReply("hello")).toBeNull();
  });
});

describe("the demo's copy", () => {
  it("has no dashes and chips that fit a post", () => {
    for (const chip of CHIPS) {
      expect(chip).not.toMatch(DASHES);
      expect(chip.length).toBeLessThanOrEqual(80);
    }
    expect(GREETING("Ada")).not.toMatch(DASHES);
    expect(JSON.stringify(WALL_COPY)).not.toMatch(DASHES);
    expect(JSON.stringify(LOCK_COPY)).not.toMatch(DASHES);
    expect(JSON.stringify(OFFER_COPY)).not.toMatch(DASHES);
  });
});
