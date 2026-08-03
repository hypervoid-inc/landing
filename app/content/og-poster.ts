import type { RouteKind } from "../lib/route-manifest";

/**
 * What each social card says and shows.
 *
 * The set, the lighting, the typeface, and the layout grid are fixed by the
 * contract in `scripts/og/poster.mjs` and are deliberately absent here: this
 * file only answers "what does this card say, and what is staged behind it",
 * so two cards can never drift apart on anything else. Keys are OG names (see
 * `ogName` in `route-manifest`).
 *
 * `headline` is hand-broken because poster type always is. Keep lines to about
 * sixteen characters and the block to at most three lines, or the model has to
 * choose between shrinking the headline and running it into the mascot.
 *
 * `scene` names the real objects on the set, not a concept: a camera can
 * photograph "an index card drawer pulled open" and cannot photograph "memory
 * you can control". It describes what is staged with the mascot and nothing
 * else, and never mentions colour, lighting, material, or camera, because
 * those would start disagreeing with the contract and the model would split
 * the difference.
 *
 * Reach for objects from the working-computer world of roughly 1995 to 2005.
 * That constraint is doing real work: the moment a scene asks for something
 * abstract, the model falls back on floating glass panels and orbit rings, and
 * the card stops being a photograph.
 */
export type PosterCard = {
  readonly headline: readonly string[];
  readonly scene: string;
  /**
   * Scale the card to fit 1200x630 rather than centre-cropping it.
   *
   * Only for a card composed as a poster, with type running to all four edges
   * and nothing in the safe band to spare. Cropping one of those clips the
   * composition; the 6.7% vertical squash that replaces it is invisible on flat
   * graphic type. Never set it on a card that is mostly a photograph of a real
   * object, where the squash reads immediately.
   */
  readonly fullFrame?: boolean;
};

/**
 * The badge in the top right. Keyed off the route kind rather than set per
 * card, so every guide is badged the same way without anyone having to
 * remember to do it.
 *
 * No label may be "CONSTRUCT": the wordmark already sits opposite it on the
 * same line, and the two together read as a mistake.
 */
const eyebrowLabels: Record<RouteKind, string> = {
  home: "AI EMPLOYEE",
  page: "COMPANY",
  "blog-index": "LIBRARY",
  "blog-post": "ARTICLE",
  guide: "GUIDE",
  comparison: "COMPARISON",
  "author-index": "AUTHORS",
  author: "AUTHOR",
  tag: "TOPIC",
};

export function posterEyebrow(kind: string): string {
  return eyebrowLabels[kind as RouteKind] ?? "COMPANY";
}
export const ogPosters: Record<string, PosterCard> = {
  /**
   * The homepage card is the one exception to the studio system. It is a flat
   * printed poster: a photographed CRT and mascot cut out over clouds on a flat
   * blue field, with colossal outlined display type, a monospace specification
   * block, and the wordmark running up the full height of the right edge. It
   * was chosen against five other directions because it is the only one that
   * both stops a scroll and says what the product actually is.
   *
   * `scene` and `headline` here describe it for the record and for the
   * signature; regenerating it from them alone will not reproduce it, because
   * its look came from a separate poster contract rather than from
   * `scripts/og/poster.mjs`. Treat `assets/og/poster/home.webp` as the source
   * of truth and do not `--force` it casually.
   */
  home: {
    headline: ["AI EMPLOYEE"],
    fullFrame: true,
    scene:
      "A photographed beige CRT monitor floating over a bank of real clouds on a flat printed blue field, the glass mascot sitting on top of its casing, with a monospace specification block in the lower left and the wordmark running vertically up the right edge.",
  },

  about: {
    headline: ["ABOUT", "CONSTRUCT"],
    scene:
      "The mascot in front of three identical beige desktop towers standing shoulder to shoulder in a row, only the nearest one turned to face the camera.",
  },
  careers: {
    headline: ["CAREERS AT", "CONSTRUCT"],
    scene:
      "The mascot resting on an empty desk beside a brushed steel nameplate holder with a blank insert in it, and one office chair back just entering the frame behind.",
  },
  "editorial-policy": {
    headline: ["EDITORIAL", "POLICY"],
    scene:
      "The mascot beside a metal clipboard holding a printed page, a rubber date stamp resting on top of it, and a second page underneath showing the same paragraph struck through and rewritten in the margin.",
  },
  support: {
    headline: ["SUPPORT"],
    scene:
      "The mascot beside a beige desk telephone with the handset lifted off its cradle and the coiled cord still swinging, as though someone has just picked up.",
  },
  privacy: {
    headline: ["PRIVACY", "POLICY"],
    scene:
      "The mascot on top of a small steel document safe with its door shut and its dial squarely centred, one key lying flat beside it.",
  },
  terms: {
    headline: ["TERMS AND", "CONDITIONS"],
    scene:
      "The mascot beside a thick bound contract lying closed on the set, a heavy bulldog clip along its edge and a plain wax seal resting on the cover.",
  },

  blog: {
    headline: ["INSIGHTS", "AND GUIDES"],
    scene:
      "The mascot in front of a wire magazine rack holding a fan of slim technical journals, the nearest one pulled half out of its slot.",
  },

  "blog-how-to-choose-an-ai-agent-platform-for-your-team": {
    headline: ["HOW TO CHOOSE", "AN AI AGENT", "PLATFORM"],
    scene:
      "The mascot in front of three shrink-wrapped software boxes standing upright in a row on a shelf edge, the middle one pulled forward and turned to face the camera.",
  },
  "blog-running-ai-agents-on-cloudflare-not-vms": {
    headline: ["EVERY AGENT", "GETS A COMPUTER"],
    scene:
      "The mascot on top of a rack-mount server unit with its lid off and its bays empty. Beside it an identical unit stands stripped to a bare chassis, and in front of both a single hard disk sits untouched on the set.",
  },
  "blog-build-internal-tools-with-construct": {
    headline: ["INTERNAL TOOLS", "BUILT IN YOUR", "WORKSPACE"],
    scene:
      "The mascot beside a half-assembled machine on a workbench tray: a bare board, two screws, and a case panel resting against it, with one finished component set apart from the rest.",
  },
  "blog-ai-agent-vs-zapier": {
    headline: ["AI AGENT", "VS ZAPIER"],
    scene:
      "The mascot beside a long strip of punched paper tape running dead straight across the set from edge to edge, its holes identical the whole way along.",
  },
  "blog-ai-agent-vs-virtual-assistant": {
    headline: ["AI AGENT VS", "VIRTUAL", "ASSISTANT"],
    scene:
      "The mascot beside a wall-mounted punch-card time clock with a rack of blank cards beneath it and one card left half inserted in the slot.",
  },
  "blog-ai-agent-memory": {
    headline: ["AI AGENT MEMORY", "YOU CAN CONTROL"],
    scene:
      "The mascot on top of a wooden card index drawer pulled fully open, tightly packed index cards inside it, one card lifted clear and one lying face down on the set beside the drawer.",
  },
  "blog-ai-employee": {
    headline: ["AN AI EMPLOYEE", "FOR REAL", "BUSINESS WORK"],
    scene:
      "The mascot on a working desk between a stacked wire paper tray filled with printed pages and a brushed steel desk nameplate, a pen laid across the topmost page.",
  },
  "blog-ai-workflow-automation": {
    headline: ["AI WORKFLOW", "AUTOMATION"],
    scene:
      "The mascot beside a dot-matrix printer mid-run, a continuous fanfold printout feeding out of it and concertinaing into a neat stack on the set below.",
  },
  "blog-construct-vs-chatgpt": {
    headline: ["CONSTRUCT VS", "CHATGPT, CLAUDE", "AND GEMINI"],
    scene:
      "The mascot between a small answering machine with a single cassette in it, sitting empty and idle, and a wire tray heaped with finished printed documents.",
  },
  "blog-construct-vs-coding-agents": {
    headline: ["CONSTRUCT VS", "CODING AGENTS"],
    scene:
      "The mascot between a tall narrow stack of punch cards standing on end and a wide flat toolbox lying open with its trays fanned out.",
  },
  "blog-construct-vs-copilot": {
    headline: ["CONSTRUCT VS", "MICROSOFT", "COPILOT"],
    scene:
      "The mascot standing between two hard-sided briefcases, both closed and locked with combination dials, their handles turned toward the camera.",
  },
  "blog-construct-vs-diy": {
    headline: ["CONSTRUCT VS", "BUILDING", "YOUR OWN"],
    scene:
      "The mascot between a parts tray of loose brackets, screws, ribbon cable and an unmounted drive, and one finished machine standing closed and clean beside it.",
  },
  "blog-construct-vs-zapier": {
    headline: ["CONSTRUCT VS", "ZAPIER, MAKE", "AND N8N"],
    scene:
      "The mascot above three parallel strips of punched paper tape running straight across the set in perfect alignment, each strip identical to the last.",
  },
  "blog-what-is-an-ai-employee": {
    headline: ["WHAT IS AN", "AI EMPLOYEE?"],
    scene:
      "The mascot alone at the centre of the set, larger and more carefully lit than on any other card, a blank employee ID badge on a lanyard lying flat beside it. Essentially a portrait.",
  },
  "blog-chat-assistants-vs-ai-employees": {
    headline: ["CHAT ASSISTANTS", "VS AI EMPLOYEES"],
    scene:
      "The mascot between a spike file crowded with torn message slips and one finished bound report lying squarely closed on the set.",
  },

  authors: {
    headline: ["THE PEOPLE", "WHO WRITE", "CONSTRUCT"],
    scene:
      "The mascot in front of a manual typewriter with a half-typed page still in the carriage, three fountain pens lined up on the set beside it.",
  },
  "authors-ankush": {
    headline: ["ANKUSH"],
    scene:
      "The mascot beside a single fountain pen lying uncapped across one sheet of typed paper, the cap resting a little apart from it.",
  },
  "authors-nischal": {
    headline: ["NISCHAL"],
    scene:
      "The mascot beside a typewriter carriage lifted out on its own, a page still threaded through the platen and two finished pages stacked underneath.",
  },
  "authors-construct-team": {
    headline: ["CONSTRUCT", "TEAM"],
    scene:
      "The mascot in front of three identical brushed steel desk nameplates standing in a row, all of them blank.",
  },

  "blog-tag-ai-agent": {
    headline: ["EVERYTHING ON", "AI AGENTS"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled AI AGENT.",
  },
  "blog-tag-ai-employee": {
    headline: ["EVERYTHING ON", "AI EMPLOYEES"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled AI EMPLOYEE.",
  },
  "blog-tag-chatgpt": {
    headline: ["EVERYTHING ON", "CHATGPT"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled CHATGPT.",
  },
  "blog-tag-comparison": {
    headline: ["EVERY", "COMPARISON"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled COMPARISON.",
  },
  "blog-tag-product": {
    headline: ["EVERYTHING ON", "THE PRODUCT"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled PRODUCT.",
  },
  "blog-tag-workflow-automation": {
    headline: ["WORKFLOW", "AUTOMATION"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled WORKFLOW.",
  },
  "blog-tag-zapier": {
    headline: ["EVERYTHING ON", "ZAPIER"],
    scene:
      "The mascot on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled ZAPIER.",
  },
};

export function ogPoster(name: string): PosterCard | undefined {
  return ogPosters[name];
}
