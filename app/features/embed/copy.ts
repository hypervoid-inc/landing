import type { AppId } from "./world";

/** Every line the live demo says on its own, in one place. */

export type Job = {
  /** The short label in Spotlight. */
  label: string;
  /** What the suggestion hands the agent. */
  brief: string;
  /** What comes out of it, under the label. */
  result: string;
  app: AppId;
};

export const JOBS: readonly Job[] = [
  {
    label: "Plan my week",
    brief: "Plan my week",
    result: "Calendar and a prep list",
    app: "calendar",
  },
  {
    label: "Pack for Lisbon",
    brief: "Make a packing list for a week in Lisbon",
    result: "A checklist to tick off",
    app: "tasks",
  },
  {
    label: "Chase an invoice",
    brief: "Draft a polite follow-up email to a client about an unpaid invoice",
    result: "A polite draft, ready to send",
    app: "mail",
  },
  {
    label: "Launch ideas",
    brief: "Write down three ideas for a product launch",
    result: "Three notes to build on",
    app: "notes",
  },
];

export const CHIPS: readonly string[] = JOBS.map((job) => job.brief);

export const GREETING = (firstName: string) => `Hi ${firstName}. What's first?`;

export const LOCK_COPY = {
  title: "Meet Construct.",
  body: "An AI employee with its own computer. Give it a job and watch it get done. No sign-up.",
  name: "Your first name",
  unlock: "Start",
  checking: "One moment",
  settingUp: (firstName: string) => `Setting up ${firstName}'s computer`,
} as const;

export const OFFER_COPY = {
  eyebrow: "Before you go",
  title: "Your first month of Pro, on us.",
  body: "Drop your email and we'll send you a code for 100% off your first month of Pro, our top plan.",
  email: "you@company.com",
  submit: "Send my code",
  sending: "One moment",
  codeLabel: "Your code",
  copy: "Copy",
  copied: "Copied",
  redeem: "Claim it at construct.computer",
  fine: "One code per person, new accounts only.",
  later: "Maybe later",
} as const;

export const SPOTLIGHT_COPY = {
  next: "What's next?",
  suggested: "Suggested jobs",
  assign: "Assign",
  hint: "Return to assign",
  close: "Close",
} as const;

export const STATUS_COPY = {
  clockedIn: "Clocked in",
  onShift: "On shift",
  reading: "Reading your request",
  thinking: "Working it out",
  opening: {
    notes: "Writing the note",
    calendar: "Filling your calendar",
    tasks: "Writing the list",
    mail: "Drafting the email",
  } as Record<AppId, string>,
  done: "Done",
  step: (step: number, total: number) => `step ${step} of ${total}`,
} as const;

export const TOAST_COPY = {
  events: (count: number, title: string) =>
    count > 1 ? `${count} events added` : `Event added: ${title}`,
  tasks: (title: string) => `List ready: ${title}`,
  note: (title: string) => `Note saved: ${title}`,
  email: (subject: string) => `Draft ready: ${subject}`,
} as const;

export const NEW_JOB = "New job";
export const DESKTOP_NAME = "Desktop";

export const WALL_COPY = {
  eyebrow: "Shift summary",
  title: (firstName: string, jobs: number) =>
    `${jobs === 1 ? "One job" : `${jobs} jobs`} done, ${firstName}.`,
  full: "The demo is full for today.",
  body: "The real Construct connects to your apps and keeps working while you sleep.",
  cta: "Get Construct",
  top: "Get Construct",
  share: "Share on X",
  shareText:
    "Gave Construct's AI employee a job inside a post and watched it work on its own computer. Try it:",
} as const;

export const ERROR_COPY: Record<string, string> = {
  invalid_request: "Please check your name and email.",
  verification_failed: "Please complete the check and try again.",
  origin_rejected: "This page is not trusted.",
  too_many_sessions: "That's a few demos from this connection today. Get the real thing instead.",
  demo_full: "The demo is full for today. Get the real thing instead.",
  session_expired: "That session ended. Start again.",
  turns_exhausted: "Shift over.",
  model_unavailable: "Lost my train of thought. Give me that one again.",
  invalid_email: "Please enter a valid email.",
  internal_error: "Something went wrong. Please try again.",
  network: "Could not reach Construct. Check your connection and try again.",
};
