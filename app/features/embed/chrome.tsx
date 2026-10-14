import { ArrowUpRight, Check, Plus } from "lucide-react";
import { useSyncExternalStore, type CSSProperties } from "react";

import type { EmbedMood } from "../../../shared/embed-schema";
import { DESKTOP_NAME, NEW_JOB, STATUS_COPY, WALL_COPY } from "./copy";
import { EmbedMascot } from "./mascot";
import { AppIcon } from "./app-icon";
import { APP_IDS, APP_NAMES, itemCount, type AppId, type World } from "./world";

/**
 * The desktop's chrome: menu bar, dock, the presence tile where Construct
 * sits, toasts, the cursor it works with, and the shift summary.
 */

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function subscribeClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(timer);
}

/** The wall clock, to the minute, empty in the prerendered HTML. */
export function useClock(): string {
  return useSyncExternalStore(subscribeClock, () => formatClock(new Date()), () => "");
}

export function nowClock(): string {
  return formatClock(new Date());
}

export function MenuBar({
  appName,
  jobsLeft,
  walled,
  clock,
  href,
  onCta,
}: {
  appName: string | null;
  jobsLeft: number;
  walled: boolean;
  clock: string;
  href: string;
  onCta: () => void;
}) {
  return (
    <header className="embed-menubar">
      <EmbedMascot mood="neutral" working={false} className="embed-menubar-mark" />
      <span className="embed-menubar-name">Construct</span>
      <span className="embed-menubar-app">{appName ?? DESKTOP_NAME}</span>
      <span className="embed-menubar-spacer" />
      <span className="embed-menubar-jobs" aria-live="polite">
        {walled ? "Shift over" : `${jobsLeft} ${jobsLeft === 1 ? "job" : "jobs"} left`}
      </span>
      <span className="embed-menubar-clock">{clock}</span>
      <a className="embed-menubar-cta" href={href} target="_blank" rel="noreferrer" onClick={onCta}>
        {WALL_COPY.top}
        <ArrowUpRight size={11} strokeWidth={2.6} aria-hidden />
      </a>
    </header>
  );
}

export function Dock({
  world,
  bouncing,
  onOpen,
}: {
  world: World;
  /** Apps whose icon should bounce, keyed by a counter so a repeat bounces again. */
  bouncing: Record<AppId, number>;
  onOpen: (app: AppId) => void;
}) {
  return (
    <nav className="embed-dock" aria-label="Apps">
      {APP_IDS.map((app) => {
        const count = itemCount(world, app);
        return (
          <button
            key={app}
            type="button"
            className="embed-dock-app"
            data-dock={app}
            data-open={world.open.includes(app) ? "true" : "false"}
            aria-label={`${APP_NAMES[app]}${count ? `, ${count}` : ""}`}
            title={APP_NAMES[app]}
            onClick={() => onOpen(app)}
          >
            <span key={bouncing[app]} className="embed-dock-icon" data-bounce={bouncing[app] > 0 ? "true" : "false"}>
              <AppIcon app={app} size={20} />
            </span>
            {count ? <span className="embed-dock-count">{count}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

export function NewJobButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" className="embed-newjob" onClick={onClick} disabled={disabled}>
      <Plus size={14} strokeWidth={2.6} aria-hidden />
      <span>{NEW_JOB}</span>
    </button>
  );
}

export type Progress = { step: number; total: number; brief: string } | null;

export function Presence({
  status,
  mood,
  working,
  done,
  progress,
}: {
  status: string;
  mood: EmbedMood;
  working: boolean;
  done: boolean;
  progress: Progress;
}) {
  return (
    <div className="embed-presence ph-no-capture" role="status" aria-live="polite" data-working={working} data-done={done}>
      <EmbedMascot mood={mood} working={working} className="embed-presence-mascot" />
      <span className="embed-presence-body">
        <span className="embed-presence-status">
          {done ? <Check size={11} strokeWidth={3} aria-hidden /> : <span className="embed-presence-dot" />}
          <span>{status}</span>
        </span>
        {progress ? (
          <>
            <span className="embed-presence-bar">
              <span style={{ "--p": `${Math.round((progress.step / progress.total) * 100)}%` } as CSSProperties} />
            </span>
            <span className="embed-presence-sub">
              {progress.brief} · {STATUS_COPY.step(progress.step, progress.total)}
            </span>
          </>
        ) : null}
      </span>
    </div>
  );
}

export type Toast = { id: string; text: string; app: AppId };

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="embed-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="embed-toast">
          <span className="embed-toast-icon" data-app={toast.app}>
            <AppIcon app={toast.app} size={11} />
          </span>
          <span className="embed-toast-text">{toast.text}</span>
          <span className="embed-toast-sub">{APP_NAMES[toast.app]}, just now</span>
        </div>
      ))}
    </div>
  );
}

export type CursorState = { x: number; y: number; visible: boolean; clicking: boolean };

export function Cursor({ cursor }: { cursor: CursorState }) {
  return (
    <svg
      className="embed-cursor"
      data-visible={cursor.visible ? "true" : "false"}
      data-clicking={cursor.clicking ? "true" : "false"}
      style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
      width="18"
      height="22"
      viewBox="0 0 18 22"
      aria-hidden
    >
      <path
        d="M1 1 L1 17 L5.5 13 L8.5 20 L11.5 18.7 L8.6 12 L14.5 12 Z"
        fill="#fff"
        stroke="#15222a"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type LogEntry = { id: string; time: string; text: string; app: AppId | null };
