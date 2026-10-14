import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  EMBED_MAX_HISTORY,
  EMBED_MAX_HISTORY_CHARS,
  EMBED_MAX_MESSAGE_CHARS,
  type EmbedAction,
  type EmbedHistoryEntry,
  type EmbedMood,
  type EmbedReply,
} from "../../../shared/embed-schema";
import { getAppOrigin } from "../../platform/env";
import { captureAnalytics } from "../analytics/analytics.client";
import { usePrefersReducedMotion } from "../landing/media";
import {
  Cursor,
  Dock,
  MenuBar,
  NewJobButton,
  Presence,
  Toasts,
  nowClock,
  useClock,
  type CursorState,
  type LogEntry,
  type Progress,
  type Toast,
} from "./chrome";
import { ERROR_COPY, JOBS, STATUS_COPY, TOAST_COPY } from "./copy";
import { Windows } from "./desktop";
import { LockScreen, type LockPhase } from "./gate";
import { Offer } from "./offer";
import {
  isFramed,
  readStoredSession,
  sendTurn,
  sourceFromLocation,
  writeStoredSession,
  type StoredSession,
} from "./session-client";
import { Spotlight } from "./spotlight";
import {
  APP_NAMES,
  appOf,
  applyAction,
  closeApp,
  EMPTY_WORLD,
  focusApp,
  showItem,
  toggleTask,
  type AppId,
  type World,
} from "./world";
import "./embed.css";

/** The lock screen's "setting up" beat, then its slide away. */
const SETUP_MS = 1000;
const SLIDE_MS = 700;
/** One action on the desk: cursor to the dock, click, window, cursor in, typing. */
const STEP_MS = 1500;
const CURSOR_TO_DOCK_MS = 550;
const CURSOR_TO_WINDOW_MS = 950;
/** How long "Done" stays on the presence tile before it settles. */
const DONE_HOLD_MS = 2600;
const TOAST_MS = 3600;

type Boot = { src: string; framed: boolean; stored: StoredSession | null };
const SERVER_BOOT: Boot = { src: "home", framed: false, stored: null };
let clientBoot: Boot | null = null;
function readClientBoot(): Boot {
  if (!clientBoot) {
    const src = sourceFromLocation(window.location.search);
    const stored = readStoredSession();
    clientBoot = { src, framed: isFramed(), stored: stored && stored.src === src ? stored : null };
  }
  return clientBoot;
}
const subscribeNever = () => () => {};

function appUrl(src: string): string {
  return `${getAppOrigin()}/?utm_source=x&utm_medium=player&utm_campaign=${encodeURIComponent(src)}`;
}

/** The log line for a finished job: what it made, or the request itself. */
function jobSummary(reply: EmbedReply, brief: string): string {
  const first = reply.actions[0];
  if (!first) return brief.length > 42 ? `${brief.slice(0, 41)}.` : brief;
  const made = first.type === "email" ? `Drafted: ${first.subject}` : first.title;
  const more = reply.actions.length - 1;
  return more > 0 ? `${made} +${more}` : made;
}

function toastFor(action: EmbedAction, eventCount: number): string {
  switch (action.type) {
    case "event":
      return TOAST_COPY.events(eventCount, action.title);
    case "tasks":
      return TOAST_COPY.tasks(action.title);
    case "note":
      return TOAST_COPY.note(action.title);
    case "email":
      return TOAST_COPY.email(action.subject);
  }
}

/** Consecutive calendar events become one step on the desk and one toast. */
function groupActions(actions: EmbedAction[]): EmbedAction[][] {
  const groups: EmbedAction[][] = [];
  for (const action of actions) {
    const last = groups.at(-1);
    if (last && action.type === "event" && last[0]?.type === "event") last.push(action);
    else groups.push([action]);
  }
  return groups;
}

/**
 * Construct's own computer, inside an X post: a lock screen that asks for
 * a first name, then a desktop where Spotlight takes a job and the person
 * watches Construct open apps, move the cursor and fill windows. The email
 * comes last, as the offer of a free first month.
 */
export function EmbedApp() {
  const reducedMotion = usePrefersReducedMotion();
  const clock = useClock();
  const { src, framed, stored } = useSyncExternalStore(subscribeNever, readClientBoot, () => SERVER_BOOT);
  const [sessionState, setSessionState] = useState<StoredSession | "cleared" | null>(null);
  const session = sessionState === "cleared" ? null : (sessionState ?? stored);
  const [lock, setLock] = useState<LockPhase | "gone" | null>(null);
  // A session restored from storage skips the lock screen entirely.
  const lockPhase: LockPhase | "gone" = lock ?? (stored ? "gone" : "form");
  const ready = Boolean(session) && lockPhase === "gone";
  const [world, setWorld] = useState<World>(EMPTY_WORLD);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [spotlightOpen, setSpotlightOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; mood: EmbedMood; done: boolean } | null>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bouncing, setBouncing] = useState<Record<AppId, number>>({ notes: 0, calendar: 0, tasks: 0, mail: 0 });
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, visible: false, clicking: false });
  const [error, setError] = useState("");
  const [walledState, setWalled] = useState<"turns" | "full" | null>(null);
  const [offer, setOffer] = useState<"hidden" | "shown" | "dismissed">("hidden");
  const historyRef = useRef<EmbedHistoryEntry[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const deskRef = useRef<HTMLDivElement>(null);

  const walled = walledState ?? (session && session.turnsLeft <= 0 ? "turns" : null);
  const jobsDone = log.filter((entry) => entry.app).length;
  const firstName = session?.firstName ?? "";
  const turnsLeft = session?.turnsLeft ?? 0;
  const showSpotlight = ready && !walled && !busy && (spotlightOpen ?? jobsDone === 0);
  const showOffer = Boolean(session) && (walled !== null || offer === "shown");
  const remainingJobs = JOBS.filter((job) => !log.some((entry) => entry.text.startsWith(job.label)));

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    captureAnalytics("embed_viewed", { src, framed });
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [src, framed]);

  const nextId = useCallback((prefix: string) => {
    idRef.current += 1;
    return `${prefix}${idRef.current}`;
  }, []);

  const start = useCallback(
    (next: { token: string; firstName: string; turnsLeft: number }) => {
      const fresh = { ...next, src };
      setSessionState(fresh);
      writeStoredSession(fresh);
      const quick = reducedMotion;
      setLock("settingUp");
      later(() => setLock("leaving"), quick ? 0 : SETUP_MS);
      later(() => setLock("gone"), quick ? 0 : SETUP_MS + SLIDE_MS);
    },
    [src, reducedMotion, later],
  );

  const openOffer = useCallback(
    (reason: string) => {
      if (offer !== "hidden" || !session) return;
      setOffer("shown");
      captureAnalytics("embed_offer_shown", { src, framed, reason });
    },
    [offer, session, src, framed],
  );

  const showWall = useCallback(
    (reason: "turns" | "full") => {
      setWalled(reason);
      setSpotlightOpen(false);
      captureAnalytics("embed_wall_shown", { src, framed, reason });
    },
    [src, framed],
  );

  // Reaching for the edge of the frame after a job is the moment to offer.
  const onLeave = useCallback(() => {
    if (jobsDone > 0 && !busy) openOffer("leave");
  }, [jobsDone, busy, openOffer]);

  const pushToast = useCallback(
    (app: AppId, text: string) => {
      const id = nextId("t");
      setToasts((current) => [...current.slice(-2), { id, app, text }]);
      later(() => setToasts((current) => current.filter((toast) => toast.id !== id)), TOAST_MS);
    },
    [nextId, later],
  );

  /** The cursor's target inside the desk, from an element in it. */
  const pointAt = useCallback((selector: string, dx: number, dy: number) => {
    const desk = deskRef.current;
    const target = desk?.querySelector<HTMLElement>(selector);
    if (!desk || !target) return;
    const a = desk.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    setCursor((current) => ({ ...current, visible: true, x: b.left - a.left + dx, y: b.top - a.top + dy }));
  }, []);

  const finish = useCallback(
    (reply: EmbedReply, brief: string) => {
      setStatus({ text: reply.say, mood: reply.mood, done: true });
      setProgress(null);
      setBusy(false);
      const first = reply.actions[0];
      setLog((entries) => [...entries, { id: nextId("l"), time: nowClock(), text: jobSummary(reply, brief), app: first ? appOf(first) : null }]);
      later(() => setCursor((current) => ({ ...current, visible: false })), 900);
      later(() => setStatus({ text: STATUS_COPY.onShift, mood: "happy", done: false }), DONE_HOLD_MS);
    },
    [nextId, later],
  );

  const perform = useCallback(
    (reply: EmbedReply, brief: string) => {
      const groups = groupActions(reply.actions);
      if (groups.length === 0) {
        finish(reply, brief);
        return;
      }
      const quick = reducedMotion;
      const step = quick ? 120 : STEP_MS;
      groups.forEach((group, index) => {
        const first = group[0]!;
        const app = appOf(first);
        const at = step * index;
        later(() => {
          setStatus({ text: STATUS_COPY.opening[app], mood: "thinking", done: false });
          setProgress({ step: index + 1, total: groups.length, brief });
          if (!quick) pointAt(`[data-dock="${app}"]`, 20, 20);
        }, at);
        later(() => {
          setCursor((current) => ({ ...current, clicking: true }));
          setBouncing((current) => ({ ...current, [app]: current[app] + 1 }));
          setWorld((current) => group.reduce((world, action) => applyAction(world, action, nextId("i")), current));
        }, at + (quick ? 0 : CURSOR_TO_DOCK_MS));
        later(() => {
          setCursor((current) => ({ ...current, clicking: false }));
          if (!quick) pointAt(`[data-win="${app}"] [data-win-body]`, 26, 34);
        }, at + (quick ? 0 : CURSOR_TO_DOCK_MS + 180));
        later(() => {
          pushToast(app, toastFor(first, group.length));
        }, at + (quick ? 0 : CURSOR_TO_WINDOW_MS + 150));
      });
      later(() => finish(reply, brief), step * groups.length + (quick ? 0 : 200));
    },
    [reducedMotion, later, pointAt, nextId, pushToast, finish],
  );

  const assign = useCallback(
    async (text: string) => {
      const brief = text.trim().slice(0, EMBED_MAX_MESSAGE_CHARS);
      if (!session || !brief || busy || walled || !ready) return;
      setError("");
      setBusy(true);
      setSpotlightOpen(false);
      setStatus({ text: STATUS_COPY.reading, mood: "thinking", done: false });
      later(() => setStatus((current) => (current && !current.done ? { ...current, text: STATUS_COPY.thinking } : current)), 700);
      captureAnalytics("embed_turn_sent", { src, framed });
      const result = await sendTurn({ token: session.token, message: brief, history: historyRef.current });
      if (!result.ok) {
        captureAnalytics("embed_turn_failed", { src, framed, code: result.code });
        setBusy(false);
        setProgress(null);
        if (result.code === "turns_exhausted") {
          showWall("turns");
          return;
        }
        if (result.code === "demo_full") {
          showWall("full");
          return;
        }
        if (result.code === "session_expired") {
          writeStoredSession(null);
          setSessionState("cleared");
          setLock("form");
          setWorld(EMPTY_WORLD);
          setLog([]);
          setStatus(null);
          return;
        }
        setError(ERROR_COPY[result.code] ?? ERROR_COPY.internal_error!);
        setStatus({ text: STATUS_COPY.onShift, mood: "neutral", done: false });
        setSpotlightOpen(true);
        return;
      }
      const entries: EmbedHistoryEntry[] = [
        { role: "user", text: brief.slice(0, EMBED_MAX_HISTORY_CHARS) },
        { role: "assistant", text: result.reply.say.slice(0, EMBED_MAX_HISTORY_CHARS) },
      ];
      historyRef.current = [...historyRef.current, ...entries].slice(-EMBED_MAX_HISTORY);
      const updated = { ...session, turnsLeft: result.turnsLeft };
      setSessionState(updated);
      writeStoredSession(updated);
      perform(result.reply, brief);
      if (result.turnsLeft <= 0) {
        later(() => showWall("turns"), (reducedMotion ? 200 : STEP_MS) * (groupActions(result.reply.actions).length + 1) + DONE_HOLD_MS);
      }
    },
    [session, busy, walled, ready, src, framed, later, perform, showWall, reducedMotion],
  );

  const onFocusApp = useCallback((app: AppId) => setWorld((w) => focusApp(w, app)), []);
  const onCloseApp = useCallback((app: AppId) => setWorld((w) => closeApp(w, app)), []);
  const onShow = useCallback((app: AppId, index: number) => setWorld((w) => showItem(w, app, index)), []);
  const onToggleTask = useCallback((listId: string, itemId: string) => setWorld((w) => toggleTask(w, listId, itemId)), []);

  const frontApp = world.open.at(-1);
  const presenceStatus = status ?? { text: ready ? STATUS_COPY.clockedIn : "", mood: "happy" as EmbedMood, done: false };
  const href = appUrl(src);

  return (
    <div className="embed-root" data-framed={framed ? "true" : "false"}>
      <div className="embed-page">
        <div className="embed-stage" data-ready={ready ? "true" : "false"} data-offer={showOffer ? "true" : "false"} onMouseLeave={onLeave}>
          <img className="embed-wallpaper" src="/assets/embed/fuji.webp" alt="" draggable={false} />
          <span className="embed-shade" aria-hidden />
          {session ? (
            <>
              <MenuBar
                appName={frontApp ? APP_NAMES[frontApp] : null}
                jobsLeft={turnsLeft}
                walled={walled !== null}
                clock={clock}
                href={href}
                onCta={() => {
                  captureAnalytics("embed_cta_clicked", { src, framed, position: "top" });
                  openOffer("cta");
                }}
              />
              <div className="embed-desk" ref={deskRef}>
                <Windows world={world} animate={!reducedMotion} onFocus={onFocusApp} onClose={onCloseApp} onShow={onShow} onToggleTask={onToggleTask} />
                <Toasts toasts={toasts} />
                <Spotlight
                  open={showSpotlight}
                  firstName={firstName}
                  first={jobsDone === 0}
                  jobs={remainingJobs}
                  disabled={busy}
                  error={error}
                  onAssign={(brief) => void assign(brief)}
                  onClose={jobsDone > 0 ? () => setSpotlightOpen(false) : null}
                />
                {ready && !showSpotlight && !walled ? <NewJobButton disabled={busy} onClick={() => setSpotlightOpen(true)} /> : null}
                <Dock world={world} bouncing={bouncing} onOpen={onFocusApp} />
                <div className="embed-presence-slot" data-ready={ready ? "true" : "false"}>
                  <Presence status={presenceStatus.text} mood={presenceStatus.mood} working={busy && !presenceStatus.done} done={presenceStatus.done} progress={progress} />
                </div>
                <Cursor cursor={cursor} />
                {showOffer ? (
                  <div className="embed-scrim">
                    <Offer token={session.token} firstName={firstName} src={src} framed={framed} href={href} onDismiss={walled ? null : () => setOffer("dismissed")} />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {lockPhase !== "gone" ? <LockScreen src={src} framed={framed} phase={lockPhase} firstName={firstName} onStarted={start} /> : null}
        </div>
        {!framed ? (
          <p className="embed-caption">
            This is the live demo inside Construct&apos;s posts on X.{" "}
            <a href={href} target="_blank" rel="noreferrer" onClick={() => captureAnalytics("embed_cta_clicked", { src, framed, position: "caption" })}>
              Get the real thing
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
