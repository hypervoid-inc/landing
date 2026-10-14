import { Check, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { AppIcon } from "./app-icon";
import { APP_NAMES, WEEKDAYS, weekdayOf, type AppId, type World } from "./world";

const DAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Where each window opens on the desk, as percentages; stacked when narrow. */
const PLACES: Record<AppId, { x: number; y: number; w: number }> = {
  calendar: { x: 3, y: 4, w: 62 },
  tasks: { x: 50, y: 22, w: 46 },
  notes: { x: 6, y: 6, w: 58 },
  mail: { x: 10, y: 10, w: 62 },
};

/**
 * Text that appears as if being typed, so a window filling up reads as work
 * being done. Instant under reduced motion. Keyed by item, so a new text
 * mounts fresh.
 */
function useTyped(text: string, animate: boolean): string {
  const [count, setCount] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return;
    const step = Math.max(2, Math.ceil(text.length / 70));
    const timer = window.setInterval(() => {
      setCount((current) => {
        const next = Math.min(text.length, current + step);
        if (next >= text.length) window.clearInterval(timer);
        return next;
      });
    }, 16);
    return () => window.clearInterval(timer);
  }, [text, animate]);
  return animate ? text.slice(0, count) : text;
}

function Typed({ text, animate }: { text: string; animate: boolean }) {
  return <>{useTyped(text, animate)}</>;
}

function Tabs({ titles, shown, onPick }: { titles: string[]; shown: number; onPick: (index: number) => void }) {
  if (titles.length < 2) return null;
  return (
    <div className="embed-win-tabs" role="tablist">
      {titles.map((title, index) => (
        <button key={index} type="button" role="tab" aria-selected={index === shown} className="embed-win-tab" onClick={() => onPick(index)}>
          {title}
        </button>
      ))}
    </div>
  );
}

function NotesBody({ world, animate, onPick }: { world: World; animate: boolean; onPick: (index: number) => void }) {
  const note = world.notes[world.shown.notes] ?? world.notes.at(-1);
  if (!note) return <p className="embed-win-empty">Nothing here yet.</p>;
  return (
    <>
      <Tabs titles={world.notes.map((n) => n.title)} shown={world.shown.notes} onPick={onPick} />
      <h3 className="embed-win-title">{note.title}</h3>
      <p className="embed-win-text">
        <Typed key={note.id} text={note.body} animate={animate} />
      </p>
    </>
  );
}

function CalendarBody({ world }: { world: World }) {
  const today = weekdayOf(new Date());
  const busy = new Set(world.events.map((event) => event.day));
  return (
    <>
      <div className="embed-week">
        {WEEKDAYS.map((day) => (
          <span key={day} className="embed-week-day" data-today={day === today ? "true" : undefined} data-busy={busy.has(day) ? "true" : undefined}>
            {DAY_LABELS[day]}
          </span>
        ))}
      </div>
      {world.events.length === 0 ? (
        <p className="embed-win-empty">Nothing scheduled yet.</p>
      ) : (
        <div className="embed-events">
          {world.events.map((event) => (
            <div key={event.id} className="embed-event">
              <span className="embed-event-day">{DAY_LABELS[event.day]}</span>
              <span className="embed-event-time">{event.time}</span>
              <span className="embed-event-title">{event.title}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TasksBody({ world, onPick, onToggle }: { world: World; onPick: (index: number) => void; onToggle: (listId: string, itemId: string) => void }) {
  const list = world.tasks[world.shown.tasks] ?? world.tasks.at(-1);
  if (!list) return <p className="embed-win-empty">No lists yet.</p>;
  return (
    <>
      <Tabs titles={world.tasks.map((t) => t.title)} shown={world.shown.tasks} onPick={onPick} />
      <h3 className="embed-win-title">{list.title}</h3>
      <ul className="embed-tasks">
        {list.items.map((item, index) => (
          <li key={item.id} style={{ "--i": index } as CSSProperties}>
            <label className="embed-task" data-done={item.done ? "true" : undefined}>
              <input type="checkbox" checked={item.done} onChange={() => onToggle(list.id, item.id)} />
              <span className="embed-task-box">{item.done ? <Check size={10} strokeWidth={3.5} aria-hidden /> : null}</span>
              <span className="embed-task-text">{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

function MailBody({ world, animate, onPick }: { world: World; animate: boolean; onPick: (index: number) => void }) {
  const draft = world.drafts[world.shown.mail] ?? world.drafts.at(-1);
  if (!draft) return <p className="embed-win-empty">No drafts yet.</p>;
  return (
    <>
      <Tabs titles={world.drafts.map((d) => d.subject)} shown={world.shown.mail} onPick={onPick} />
      <div className="embed-mail-field">
        <span>To</span>
        <strong>{draft.to}</strong>
      </div>
      <div className="embed-mail-field">
        <span>Subject</span>
        <strong>{draft.subject}</strong>
      </div>
      <p className="embed-win-text embed-mail-body">
        <Typed key={draft.id} text={draft.body} animate={animate} />
      </p>
      <div className="embed-mail-foot">
        <span className="embed-mail-send">Send</span>
        <span>Sends from your own inbox in the real Construct.</span>
      </div>
    </>
  );
}

function Window({ app, front, index, onFocus, onClose, children }: { app: AppId; front: boolean; index: number; onFocus: () => void; onClose: () => void; children: ReactNode }) {
  const place = PLACES[app];
  return (
    <section
      className="embed-win"
      data-win={app}
      data-front={front ? "true" : "false"}
      aria-label={APP_NAMES[app]}
      style={{ "--x": `${place.x}%`, "--y": `${place.y}%`, "--w": `${place.w}%`, "--i": index, zIndex: 10 + index } as CSSProperties}
      onPointerDown={onFocus}
    >
      <header className="embed-win-bar">
        <span className="embed-win-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="embed-win-name">
          <AppIcon app={app} size={12} />
          {APP_NAMES[app]}
        </span>
        <button
          type="button"
          className="embed-win-close"
          aria-label={`Close ${APP_NAMES[app]}`}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <X size={12} strokeWidth={2.4} aria-hidden />
        </button>
      </header>
      <div className="embed-win-body" data-win-body>
        {children}
      </div>
    </section>
  );
}

/** The open windows in their stacking order. `animate` is off under reduced motion. */
export function Windows({ world, animate, onFocus, onClose, onShow, onToggleTask }: { world: World; animate: boolean; onFocus: (app: AppId) => void; onClose: (app: AppId) => void; onShow: (app: AppId, index: number) => void; onToggleTask: (listId: string, itemId: string) => void }) {
  const top = world.open.at(-1);
  return (
    <>
      {world.open.map((app, index) => (
        <Window key={app} app={app} front={app === top} index={index} onFocus={() => onFocus(app)} onClose={() => onClose(app)}>
          {app === "notes" ? (
            <NotesBody world={world} animate={animate} onPick={(i) => onShow(app, i)} />
          ) : app === "calendar" ? (
            <CalendarBody world={world} />
          ) : app === "tasks" ? (
            <TasksBody world={world} onPick={(i) => onShow(app, i)} onToggle={onToggleTask} />
          ) : (
            <MailBody world={world} animate={animate} onPick={(i) => onShow(app, i)} />
          )}
        </Window>
      ))}
    </>
  );
}
