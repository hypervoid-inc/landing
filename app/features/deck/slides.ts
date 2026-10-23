import { figmaDeck } from "./slides.figma.ts";

/**
 * The investor deck at /deck/, as images exported from Figma
 * (figma.com/slides/ml8KWViv95ZR9Lj72h5lcY). The slides are hosted here rather
 * than framed from Figma so session replay and analytics can see them: a
 * cross-origin frame is a black box to both.
 *
 * After editing the deck in Figma, run `pnpm deck:sync`. It reads the deck,
 * rewrites slides.figma.ts (order, each slide's text, the version, the round
 * size) and rebuilds the images, the emailed PDF and the preview card. What
 * Figma can't say lives below, keyed by Figma's slide id so it follows a
 * slide wherever it moves: a short title, and the videos and links drawn on it.
 */

/** Busts the image cache and tags every deck event, so a change shows in analytics. */
export const DECK_VERSION = figmaDeck.version;
/** The round, as the deck's ask slide states it, for the email and the link preview. */
export const DECK_RAISE = figmaDeck.raise;

/** Figma's slide size. Hotspot boxes are in these units. */
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

export type Box = { x: number; y: number; w: number; h: number };

export type DeckVideo = {
  /** Analytics name, a fixed slug. */
  name: "demo" | "launch";
  youtubeId: string;
  title: string;
  box: Box;
  /** The pill under the video that also plays it. */
  button: Box;
};

export type DeckLink = {
  /** Analytics name, a fixed slug. */
  name: "site" | "try";
  href: string;
  label: string;
  box: Box;
};

export type Slide = {
  /** Figma's node id for the slide. */
  id: string;
  /** Short name for analytics and the slide rail. */
  title: string;
  /** The slide's text, for screen readers and anyone reading without images. */
  alt: string;
  videos?: DeckVideo[];
  links?: DeckLink[];
};

type SlideDetails = Pick<Slide, "title" | "videos" | "links">;

const TRY_HREF = "/?promo=INVEST_IN_US&utm_source=deck";

/**
 * By Figma slide id. A slide with no entry is titled from its section label
 * ("WHY NOW" becomes "Why now"); `pnpm deck:sync` says when that happens.
 */
export const slideDetails: Record<string, SlideDetails> = {
  "9:3": {
    title: "Cover",
    links: [
      {
        name: "site",
        href: TRY_HREF,
        label: "construct.computer",
        box: { x: 1560, y: 970, w: 240, h: 60 },
      },
    ],
  },
  "13:3": { title: "Problem" },
  "13:21": {
    title: "Solution",
    videos: [
      {
        name: "demo",
        youtubeId: "0lQWyT4PAA8",
        title: "Construct demo",
        box: { x: 138, y: 411, w: 800, h: 450 },
        button: { x: 365, y: 924, w: 347, h: 48 },
      },
      {
        name: "launch",
        youtubeId: "G2p-gNXlyKE",
        title: "Product Hunt launch video",
        box: { x: 1025, y: 411, w: 800, h: 450 },
        button: { x: 1250, y: 924, w: 348, h: 48 },
      },
    ],
  },
  "13:36": { title: "Why now" },
  "13:56": { title: "Market" },
  "14:6": { title: "Go to market" },
  "14:73": { title: "Why Construct" },
  "14:95": { title: "Traction" },
  "15:2": { title: "Business model" },
  "15:38": { title: "Team" },
  "15:61": { title: "The ask" },
  "15:87": {
    title: "Try it",
    links: [
      {
        name: "try",
        href: TRY_HREF,
        label: "Try Construct with code INVEST_IN_US",
        box: { x: 1200, y: 325, w: 420, h: 545 },
      },
    ],
  },
};

/** The deck as the site shows it: Figma's slides with the details above. */
export function deckSlides(figmaSlides: ReadonlyArray<{ id: string; label: string | null; text: string }>): Slide[] {
  return figmaSlides.map((slide, index) => {
    const details = slideDetails[slide.id];
    return {
      id: slide.id,
      title: details?.title ?? slide.label ?? `Slide ${index + 1}`,
      alt: slide.text,
      ...(details?.videos ? { videos: details.videos } : {}),
      ...(details?.links ? { links: details.links } : {}),
    };
  });
}

export const slides: Slide[] = deckSlides(figmaDeck.slides);

/** A hotspot's position over the slide image, in percent so it scales with it. */
export function boxStyle(box: Box) {
  return {
    left: `${(box.x / SLIDE_WIDTH) * 100}%`,
    top: `${(box.y / SLIDE_HEIGHT) * 100}%`,
    width: `${(box.w / SLIDE_WIDTH) * 100}%`,
    height: `${(box.h / SLIDE_HEIGHT) * 100}%`,
  };
}

export function slideImage(index: number, size: "1x" | "2x" | "thumb"): string {
  const n = String(index + 1).padStart(2, "0");
  const suffix = size === "2x" ? "@2x" : size === "thumb" ? "-thumb" : "";
  return `/assets/deck/${n}${suffix}.webp?v=${DECK_VERSION}`;
}
