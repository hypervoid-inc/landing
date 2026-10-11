import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { scheduleDotsLeft, scheduleDotsTop } from "./schedules-dots";
import "./schedules-card.css";

const tasks = [
  { time: "09:30 am", minutes: 9 * 60 + 30, label: "Email Summary." },
  { time: "02:00 pm", minutes: 14 * 60, label: "Attend Meeting." },
  { time: "10:00 pm", minutes: 22 * 60, label: "Monitor Logs..." },
] as const;

const ordinal = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][day % 10] ?? "th";
};

/** "Next in 3h 12m": until the next of the tasks above, on the reader's clock. */
export function untilNextTask(now: Date): string {
  const minute = now.getHours() * 60 + now.getMinutes();
  const next = tasks.find((task) => task.minutes > minute)?.minutes;
  const wait =
    next === undefined ? 24 * 60 - minute + tasks[0].minutes : next - minute;
  const hours = Math.floor(wait / 60);
  return `Next in ${hours ? `${hours}h ` : ""}${wait % 60}m`;
}

/**
 * The reader's own date and the wait for the next task, set after hydration
 * (the page is prerendered, so the server's copy keeps the original art's).
 */
function useLocalClock(): Date | null {
  const minute = useSyncExternalStore(
    (onChange) => {
      const timer = window.setInterval(onChange, 15_000);
      return () => window.clearInterval(timer);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
  return minute === null ? null : new Date(minute * 60_000);
}

const dotBands = [
  { band: "top", dots: scheduleDotsTop },
  { band: "left", dots: scheduleDotsLeft },
] as const;

/**
 * Coded replacement for the schedules feature video. The whole loop is CSS
 * keyframes on transform, opacity, and short blurs, so it runs on the
 * compositor; JS only pauses it while the card is off screen.
 */
export function SchedulesCard() {
  const ref = useRef<HTMLDivElement>(null);
  const now = useLocalClock();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) root.removeAttribute("data-paused");
        else root.setAttribute("data-paused", "");
      },
      { rootMargin: "160px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="sched">
      <h3 className="sched-title">Schedules Repeating Tasks</h3>
      <div className="sched-table">
        {dotBands.map(({ band, dots }) => (
          <svg
            key={band}
            className={`sched-dots sched-dots-${band}`}
            aria-hidden
            viewBox="-40 -30 360 380"
          >
            {chunk(dots).map(([x, y, r, a]) => (
              <circle key={`${x},${y}`} cx={x} cy={y} r={r} fillOpacity={a} />
            ))}
          </svg>
        ))}
        <div className="sched-plate" aria-hidden>
          {[0, 1, 2, 3].map((row) => (
            <span
              key={row}
              className="sched-week"
              style={{ "--row": row } as CSSProperties}
            >
              Week 1
            </span>
          ))}
        </div>
        {now ? (
          <p className="sched-date">
            {now.getDate()}
            <sup>{ordinal(now.getDate())}</sup>{" "}
            {now.toLocaleString("en-US", { month: "short" })}
          </p>
        ) : (
          <p className="sched-date">
            22<sup>nd</sup> May, 2026
          </p>
        )}
        <span className="sched-range" data-live={now ? "" : undefined}>
          {now ? untilNextTask(now) : "Week"}
        </span>
        <ul className="sched-tasks">
          {tasks.map((task) => (
            <li key={task.time} className="sched-pill">
              <span className="sched-pill-body">
                <span className="sched-chip">
                  <img
                    className="sched-mascot"
                    src="/assets/landing/clippy/screen-logo.webp"
                    alt=""
                    width={200}
                    height={196}
                    decoding="async"
                    draggable={false}
                  />
                  {task.time}
                </span>
                <span className="sched-label">{task.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function chunk(flat: readonly number[]) {
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < flat.length; i += 4) {
    out.push([flat[i]!, flat[i + 1]!, flat[i + 2]!, flat[i + 3]!]);
  }
  return out;
}
