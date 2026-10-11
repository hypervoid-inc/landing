import {
  ArrowRight02Icon,
  ArrowRightDoubleIcon,
  Attachment01Icon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  RefreshIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import { useAuth } from "../auth/auth-provider";
import { StartLink } from "./beta-access";
import { usePrefersReducedMotion } from "./media";
import "./hero-task.css";

/**
 * The hero's email card, made real: type a task, press Send, and the three
 * workflow chips beside it act it out, then the card offers to run it for
 * real (the app opens on that prompt and asks before running it).
 *
 * Nothing is sent anywhere by the preview itself; it is a short scripted
 * performance of what Construct does, and the card says so.
 */

export type HeroStage =
  "idle" | "sending" | "step1" | "step2" | "step3" | "done";

/**
 * One step a workflow chip shows: the app or tool it touches, and what it
 * says while running and once done. Flat brand glyphs sit in a small tile
 * (`tile`) so they match the full app icons beside them.
 */
export type ChipStep = {
  icon: string;
  tile?: boolean;
  running: string;
  done: string;
};

type ChipSteps = readonly [ChipStep, ChipStep, ChipStep];

const HERO = "/assets/landing/hero";
const MASCOT = "/assets/construct/mascot-eyes-static.webp";

/**
 * Example tasks the empty card types out, the second part highlighted as in
 * the original art, each with the three steps the chips show for it.
 */
const EXAMPLES: ReadonlyArray<{
  text: readonly [string, string, string];
  steps: ChipSteps;
}> = [
  {
    text: ["Hey Construct, prepare a report on ", "Metamorphosis", " ....asap"],
    steps: [
      {
        icon: `${HERO}/google.png`,
        tile: true,
        running: "Researching the topic",
        done: "Researched the topic",
      },
      {
        icon: `${HERO}/google-docs.png`,
        running: "Writing the report",
        done: "Wrote the report",
      },
      {
        icon: `${HERO}/gmail.png`,
        running: "Emailing it to you",
        done: "Emailed you the report",
      },
    ],
  },
  {
    text: ["Find 10 physio clinics in ", "Leeds", " and add them to HubSpot"],
    steps: [
      {
        icon: `${HERO}/google.png`,
        tile: true,
        running: "Searching Leeds clinics",
        done: "Found 10 clinics",
      },
      {
        icon: MASCOT,
        tile: true,
        running: "Checking each one",
        done: "Checked their details",
      },
      {
        icon: `${HERO}/hubspot.png`,
        tile: true,
        running: "Adding to HubSpot",
        done: "Added them to HubSpot",
      },
    ],
  },
  {
    text: ["Summarize my inbox every morning at ", "8am", ""],
    steps: [
      {
        icon: `${HERO}/gmail.png`,
        running: "Reading your inbox",
        done: "Read your inbox",
      },
      {
        icon: `${HERO}/google-docs.png`,
        running: "Writing the summary",
        done: "Summarized it",
      },
      {
        icon: `${HERO}/google-calendar.png`,
        tile: true,
        running: "Scheduling 8am daily",
        done: "Runs daily at 8am",
      },
    ],
  },
  {
    text: ["Compare our prices with ", "five competitors", " every Monday"],
    steps: [
      {
        icon: `${HERO}/google.png`,
        tile: true,
        running: "Visiting 5 competitors",
        done: "Checked 5 competitors",
      },
      {
        icon: MASCOT,
        tile: true,
        running: "Comparing prices",
        done: "Compared the prices",
      },
      {
        icon: `${HERO}/google-calendar.png`,
        tile: true,
        running: "Scheduling Mondays",
        done: "Runs every Monday",
      },
    ],
  },
];

/** For a task the reader typed: what Construct does with any request. */
const OWN_TASK_STEPS: ChipSteps = [
  {
    icon: MASCOT,
    tile: true,
    running: "Reading your request",
    done: "Planned the steps",
  },
  {
    icon: `${HERO}/google.png`,
    tile: true,
    running: "Browsing for it",
    done: "Did the research",
  },
  {
    icon: `${HERO}/google-docs.png`,
    running: "Writing it up",
    done: "Saved it to Files",
  },
];

const exampleText = (index: number) => EXAMPLES[index]!.text.join("");

/** The chips for an example, or for the reader's own task (`null`). */
export const chipSteps = (example: number | null): ChipSteps =>
  example === null ? OWN_TASK_STEPS : EXAMPLES[example]!.steps;

const STEP_MS = { sending: 650, step1: 1150, step2: 1250, step3: 1150 };
const REDUCED_STEP_MS = 280;

/** Drives the preview for the card and the chips together. */
export function useHeroTask() {
  const [stage, setStage] = useState<HeroStage>("idle");
  const [task, setTask] = useState("");
  // Whose steps the chips show: the example on the card, or `null` for the
  // reader's own text. Follows the typewriter while idle, then holds.
  const [example, setExample] = useState<number | null>(0);
  const reducedMotion = usePrefersReducedMotion();
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const send = useCallback(
    (text: string, from: number | null) => {
      clear();
      setTask(text);
      setExample(from);
      setStage("sending");
      captureAnalytics("hero_task_sent", {
        typed: from === null ? "own" : "example",
      });
      const order: HeroStage[] = ["step1", "step2", "step3", "done"];
      const waits = reducedMotion
        ? order.map(() => REDUCED_STEP_MS)
        : [STEP_MS.sending, STEP_MS.step1, STEP_MS.step2, STEP_MS.step3];
      let at = 0;
      order.forEach((next, index) => {
        at += waits[index]!;
        timers.current.push(window.setTimeout(() => setStage(next), at));
      });
    },
    [reducedMotion],
  );

  const reset = useCallback(() => {
    clear();
    setStage("idle");
    setTask("");
  }, []);

  const follow = useCallback(
    (next: number | null) => {
      if (stage === "idle") setExample(next);
    },
    [stage],
  );

  return {
    stage,
    task,
    steps: chipSteps(example),
    example,
    send,
    reset,
    follow,
  };
}

/** Types the examples out one after another while the card is empty. */
function useTypedExample(active: boolean, reducedMotion: boolean) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(() => exampleText(0).length);

  useEffect(() => {
    if (!active || reducedMotion) return;
    const full = exampleText(index).length;
    let delay = 34;
    let next = () => setTyped((count) => count + 1);
    if (typed >= full) {
      delay = 2600;
      next = () => setTyped(-1);
    } else if (typed < 0) {
      delay = 260;
      next = () => {
        setIndex((value) => (value + 1) % EXAMPLES.length);
        setTyped(0);
      };
    }
    const timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [active, reducedMotion, index, typed]);

  return { index, typed: Math.max(0, typed) };
}

/** Fine pointers type in the card; on touch the text would be too small to edit, so Send plays the example. */
function useCanType() {
  const [canType, setCanType] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanType(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return canType;
}

export function HeroTaskCard({
  stage,
  task,
  onSend,
  onReset,
  onExample,
}: {
  stage: HeroStage;
  task: string;
  /** `from` is the example sent as is, or `null` for the reader's own text. */
  onSend: (text: string, from: number | null) => void;
  onReset: () => void;
  /** The example now on the card, or `null` once the reader types their own. */
  onExample: (example: number | null) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const canType = useCanType();
  // A signed-in reader sees themselves as the sender: their name, email and
  // picture. The art's stand-ins otherwise, or if their picture fails to load.
  const { user } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatar =
    user?.avatarUrl && !avatarFailed
      ? user.avatarUrl
      : "/assets/landing/hero/you-avatar.webp";
  const inputId = useId();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const idle = stage === "idle";
  const showExample = idle && !text && !focused;
  const { index, typed } = useTypedExample(showExample, reducedMotion);
  const own = text.trim() ? null : index;

  useEffect(() => {
    onExample(own);
  }, [own, onExample]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!idle) return;
    onSend(text.trim() || exampleText(index), own);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const [prefix, word, suffix] = EXAMPLES[index]!.text;
  const cut = (part: string, start: number) =>
    part.slice(0, Math.max(0, Math.min(part.length, typed - start)));

  return (
    <div className="hero-task-frame">
      <div className="hero-task" data-stage={stage}>
        <div className="hero-task-head">
          <img
            key={avatar}
            src={avatar}
            alt=""
            width="160"
            height="160"
            // Google avatar URLs 403 when a referrer is attached.
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            className="hero-task-avatar"
          />
          <div className="hero-task-who">
            <span className="hero-task-you">
              {user?.displayName?.trim() || "You"}
            </span>
            <span className="hero-task-mail">
              {user?.email ?? "youremail@gmail.com"}
            </span>
            <span className="hero-task-to">
              <HugeiconsIcon icon={ArrowRightDoubleIcon} strokeWidth={2} />
              To: your-agent@construct.computer
            </span>
          </div>
          <span className="hero-task-pencil" aria-hidden>
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
          </span>
        </div>

        <form className="hero-task-body" onSubmit={submit}>
          {stage === "done" ? (
            <p className="hero-task-result">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
              <span>
                That was a preview. Construct plans it, does the work in its own
                cloud computer, and saves the result for you.
              </span>
            </p>
          ) : (
            <div className="hero-task-message">
              {canType && idle ? (
                <>
                  <label htmlFor={inputId} className="sr-only">
                    Give Construct a task
                  </label>
                  <textarea
                    id={inputId}
                    value={text}
                    maxLength={400}
                    rows={2}
                    onChange={(event) => setText(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={onKeyDown}
                    className="hero-task-input"
                  />
                </>
              ) : null}
              {showExample ? (
                <p className="hero-task-example" aria-hidden>
                  {cut(prefix, 0)}
                  {typed > prefix.length || reducedMotion ? (
                    <mark>
                      {reducedMotion ? word : cut(word, prefix.length)}
                    </mark>
                  ) : null}
                  {reducedMotion
                    ? suffix
                    : cut(suffix, prefix.length + word.length)}
                  {!reducedMotion ? <span className="hero-task-caret" /> : null}
                </p>
              ) : null}
              {!idle ? <p className="hero-task-sent">{task}</p> : null}
            </div>
          )}

          <div className="hero-task-actions">
            {stage === "done" ? (
              <button
                type="button"
                className="hero-task-attach hero-task-again"
                onClick={onReset}
              >
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
                Try another
              </button>
            ) : (
              <span className="hero-task-attach" aria-hidden>
                <HugeiconsIcon icon={Attachment01Icon} strokeWidth={2} />
                Add Attachment
              </span>
            )}
            {stage === "done" ? (
              <StartLink
                source="hero-task"
                prompt={task}
                className="hero-task-send"
                onClick={() => captureAnalytics("hero_task_run", {})}
              >
                Run it for real
                <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2.2} />
              </StartLink>
            ) : (
              <button
                type="submit"
                className="hero-task-send"
                disabled={!idle}
                aria-label={idle ? "Send the task" : "Working on it"}
              >
                {idle ? (
                  <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
                ) : (
                  <span className="hero-task-spinner" aria-hidden />
                )}
                {idle ? "Send" : "Working"}
              </button>
            )}
          </div>
        </form>
        <p className="sr-only" aria-live="polite">
          {stage === "done"
            ? "Preview finished. Run it for real in Construct."
            : stage === "idle"
              ? ""
              : "Construct is working on it."}
        </p>
      </div>
    </div>
  );
}

/** A chip's state for a stage: waiting, running, or done. */
export function chipState(
  stage: HeroStage,
  chip: 0 | 1 | 2,
): "idle" | "waiting" | "running" | "done" {
  if (stage === "idle") return "idle";
  const order: HeroStage[] = ["sending", "step1", "step2", "step3", "done"];
  const at = order.indexOf(stage);
  if (at > chip + 1) return "done";
  if (at === chip + 1) return "running";
  return "waiting";
}
