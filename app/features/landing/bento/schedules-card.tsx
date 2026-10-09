import { useEffect, useRef, type CSSProperties } from "react";
import { scheduleDotsLeft, scheduleDotsTop } from "./schedules-dots";
import "./schedules-card.css";

const tasks = [
  { time: "09:30 am", label: "Email Summary." },
  { time: "02:00 pm", label: "Attend Meeting." },
  { time: "10:00 pm", label: "Monitor Logs..." },
] as const;

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
        <p className="sched-date">
          22<sup>th</sup> May, 2026
        </p>
        <span className="sched-range">Week</span>
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
