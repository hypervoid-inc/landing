import type { EmbedAction, EmbedDay } from "../../../shared/embed-schema";

/**
 * The toy desktop the demo agent works on: four apps, each a window, and the
 * things the agent has put in them. Pure data and reducers; the components
 * only draw it.
 */

export type AppId = "notes" | "calendar" | "tasks" | "mail";

export const APP_IDS: readonly AppId[] = ["notes", "calendar", "tasks", "mail"];

export const APP_NAMES: Record<AppId, string> = {
  notes: "Notes",
  calendar: "Calendar",
  tasks: "Tasks",
  mail: "Mail",
};

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Note = { id: string; title: string; body: string };
export type CalendarEvent = { id: string; title: string; day: Weekday; time: string };
export type TaskItem = { id: string; text: string; done: boolean };
export type TaskList = { id: string; title: string; items: TaskItem[] };
export type Draft = { id: string; to: string; subject: string; body: string };

export type World = {
  notes: Note[];
  events: CalendarEvent[];
  tasks: TaskList[];
  drafts: Draft[];
  /** Open windows, back to front. */
  open: AppId[];
  /** Which item each window shows, by index into its list. */
  shown: Record<AppId, number>;
};

export const EMPTY_WORLD: World = {
  notes: [],
  events: [],
  tasks: [],
  drafts: [],
  open: [],
  shown: { notes: 0, calendar: 0, tasks: 0, mail: 0 },
};

/** The weekday a date falls on, Monday first. */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7]!;
}

/** "today" and "tomorrow" resolved against the clock; weekdays as given. */
export function resolveDay(day: EmbedDay, now: Date): Weekday {
  if (day === "today") return weekdayOf(now);
  if (day === "tomorrow") {
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    return weekdayOf(next);
  }
  return day;
}

export function appOf(action: EmbedAction): AppId {
  switch (action.type) {
    case "note":
      return "notes";
    case "event":
      return "calendar";
    case "tasks":
      return "tasks";
    case "email":
      return "mail";
  }
}

/** The window for `app` opened, or brought to the front. */
export function focusApp(world: World, app: AppId): World {
  const open = [...world.open.filter((id) => id !== app), app];
  return { ...world, open };
}

export function closeApp(world: World, app: AppId): World {
  return { ...world, open: world.open.filter((id) => id !== app) };
}

export function showItem(world: World, app: AppId, index: number): World {
  return { ...world, shown: { ...world.shown, [app]: index } };
}

/**
 * One action done on the desktop: the item added to its app, that window
 * opened in front, and the new item shown. `id` names the item; the caller
 * keeps them unique.
 */
export function applyAction(
  world: World,
  action: EmbedAction,
  id: string,
  now = new Date(),
): World {
  const app = appOf(action);
  let next: World;
  switch (action.type) {
    case "note":
      next = { ...world, notes: [...world.notes, { id, title: action.title, body: action.body }] };
      next = showItem(next, "notes", next.notes.length - 1);
      break;
    case "event": {
      const event = { id, title: action.title, day: resolveDay(action.day, now), time: action.time };
      next = { ...world, events: sortEvents([...world.events, event]) };
      break;
    }
    case "tasks":
      next = {
        ...world,
        tasks: [
          ...world.tasks,
          {
            id,
            title: action.title,
            items: action.items.map((text, index) => ({ id: `${id}-${index}`, text, done: false })),
          },
        ],
      };
      next = showItem(next, "tasks", next.tasks.length - 1);
      break;
    case "email":
      next = {
        ...world,
        drafts: [...world.drafts, { id, to: action.to, subject: action.subject, body: action.body }],
      };
      next = showItem(next, "mail", next.drafts.length - 1);
      break;
  }
  return focusApp(next, app);
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const day = WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day);
    return day !== 0 ? day : a.time.localeCompare(b.time);
  });
}

export function toggleTask(world: World, listId: string, itemId: string): World {
  return {
    ...world,
    tasks: world.tasks.map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? { ...item, done: !item.done } : item,
            ),
          },
    ),
  };
}

/** What a window has to show; a window with nothing in it still opens. */
export function itemCount(world: World, app: AppId): number {
  switch (app) {
    case "notes":
      return world.notes.length;
    case "calendar":
      return world.events.length;
    case "tasks":
      return world.tasks.length;
    case "mail":
      return world.drafts.length;
  }
}
