import type { DeckPingSummary } from "../../../shared/deck-schema";

/**
 * What a reader did on the deck beyond reading, gathered from the parts of
 * the page that see it (videos, the PDF dialog, the slide links) for the
 * visit alert (deck-ping.ts). The one thing typed that's kept is the address
 * the PDF went to, which the team asked to see in its alerts.
 */

type Video = "demo" | "launch";
type Pdf = NonNullable<DeckPingSummary["pdf"]>;

const videos: Partial<Record<Video, number>> = {};
const links = new Set<"site" | "try">();
let pdf: Pdf | undefined;
let pdfEmail: string | undefined;

const listeners = new Set<() => void>();
const changed = () => {
  for (const listener of listeners) listener();
};

export function onActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** How far into a video they've got: 0 for pressed play, then 25, 50, 75, 100. */
export function noteVideo(name: Video, percent: number): void {
  const before = videos[name];
  if (before !== undefined && before >= percent) return;
  videos[name] = percent;
  changed();
}

const PDF_RANK: Record<Pdf, number> = { opened: 1, failed: 2, sent: 3 };

/** Only ever moves forward: reopening the dialog after a send still says sent. */
export function notePdf(state: Pdf, email?: string): void {
  if (pdf && PDF_RANK[pdf] >= PDF_RANK[state]) return;
  pdf = state;
  if (email) pdfEmail = email;
  changed();
}

export function noteLink(name: "site" | "try"): void {
  if (links.has(name)) return;
  links.add(name);
  changed();
}

export function activitySnapshot(): Pick<DeckPingSummary, "videos" | "pdf" | "pdfEmail" | "links"> {
  return {
    ...(Object.keys(videos).length ? { videos: { ...videos } } : {}),
    ...(pdf ? { pdf } : {}),
    ...(pdfEmail ? { pdfEmail } : {}),
    ...(links.size ? { links: [...links] } : {}),
  };
}
