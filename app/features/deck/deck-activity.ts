import type { DeckPingSummary } from "../../../shared/deck-schema";

/**
 * What a reader did on the deck beyond reading, gathered from the parts of
 * the page that see it (videos, the PDF dialog, the slide links) for the
 * visit alert (deck-ping.ts). The one thing typed that's kept is the address
 * the PDF went to, which the team asked to see in its alerts.
 */

type Video = "demo" | "launch";
type Link = "site" | "try";
type Pdf = NonNullable<DeckPingSummary["pdf"]>;

/** A moment worth its own alert, or nothing when only the numbers moved. */
export type ActivityMoment =
  | { event: "pdf_sent" }
  | { event: "video"; detail: Video }
  | { event: "link"; detail: Link }
  | undefined;

const videos: Partial<Record<Video, number>> = {};
const links = new Set<Link>();
let pdf: Pdf | undefined;
const pdfEmails: string[] = [];

const listeners = new Set<(moment: ActivityMoment) => void>();
const changed = (moment?: ActivityMoment) => {
  for (const listener of listeners) listener(moment);
};

export function onActivity(listener: (moment: ActivityMoment) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** How far into a video they've got: 0 for pressed play, then 25, 50, 75, 100. */
export function noteVideo(name: Video, percent: number): void {
  const before = videos[name];
  if (before !== undefined && before >= percent) return;
  videos[name] = percent;
  changed(before === undefined ? { event: "video", detail: name } : undefined);
}

const PDF_RANK: Record<Pdf, number> = { opened: 1, failed: 2, sent: 3 };

/**
 * The state only moves forward (reopening the dialog after a send still says
 * sent), but every address the PDF goes to is kept, up to five, and each new
 * one is a moment of its own.
 */
export function notePdf(state: Pdf, email?: string): void {
  let moved = false;
  if (!pdf || PDF_RANK[state] > PDF_RANK[pdf]) {
    pdf = state;
    moved = true;
  }
  const address = email?.trim().toLowerCase();
  if (state === "sent" && address && !pdfEmails.includes(address) && pdfEmails.length < 5) {
    pdfEmails.push(address);
    changed({ event: "pdf_sent" });
    return;
  }
  if (moved) changed();
}

export function noteLink(name: Link): void {
  if (links.has(name)) return;
  links.add(name);
  changed({ event: "link", detail: name });
}

export function activitySnapshot(): Pick<DeckPingSummary, "videos" | "pdf" | "pdfEmails" | "links"> {
  return {
    ...(Object.keys(videos).length ? { videos: { ...videos } } : {}),
    ...(pdf ? { pdf } : {}),
    ...(pdfEmails.length ? { pdfEmails: [...pdfEmails] } : {}),
    ...(links.size ? { links: [...links] } : {}),
  };
}
