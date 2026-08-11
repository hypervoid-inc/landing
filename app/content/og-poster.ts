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
 * `headline` and the badge are set in code by `scripts/og/typeset.mjs` when the
 * card is published, not drawn by the model, so editing one is a `pnpm og`
 * away and never costs a generation.
 *
 * `headline` is hand-broken because poster type always is. Keep lines to
 * sixteen characters and the block to at most three lines: those are the sizes
 * the type grid is drawn around, and a longer line is set smaller to fit rather
 * than allowed past the margin.
 *
 * `scene` names the real objects on the set, not a concept: a camera can
 * photograph "an index card drawer pulled open" and cannot photograph "memory
 * you can control". It describes what is staged with the mascot and nothing
 * else, and never mentions colour, lighting, material, or camera, because
 * those would start disagreeing with the contract and the model would split
 * the difference.
 *
 * **Every scene sits the mascot on top of something larger than itself.** That
 * is not a stylistic preference, it is the one staging that reliably produces
 * the right object. Free-standing on the table next to something small, the
 * model reads it as a character rather than a product and gives it legs: of the
 * cards staged that way, most came back as ghosts, bones, or blobs with limbs,
 * while every card that sat it on top of a drawer, a cabinet, or a tower came
 * back correct. Resting it on a larger object fixes its scale, fixes its
 * orientation, and leaves it nothing to stand on.
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
   * Only for a hand-made card composed to all four edges, where cropping would
   * clip the composition and the 6.7% vertical squash that replaces it is
   * invisible. Never set it on a generated card: those are photographs of real
   * objects, and a squashed photograph reads as wrong immediately.
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
   * The homepage card is hand-made and is **never generated**.
   *
   * It is a printed poster rather than a studio photograph: a cut-out CRT and
   * mascot over clouds on a flat blue field, colossal outlined display type, a
   * monospace specification block, and the wordmark running up the full height
   * of the right edge. It carries its own words, so no type layer is set over
   * it. It was chosen against the whole generated direction because it is the
   * only card that both stops a scroll and says what the product actually is.
   *
   * `assets/og/home.png` is the source of truth. Because a hand-made image in
   * `assets/og/` wins outright, `pnpm og:generate` skips this route entirely
   * and there is no way for a run to overwrite it. `fullFrame` is set because
   * the composition runs to all four edges: centre-cropping it clips the top of
   * the headline, the wordmark, and the domain, while the 6.7% squash that
   * replaces the crop is invisible on flat poster type.
   *
   * `headline` and `scene` are unused for the image and kept only for the
   * record and the freshness signature.
   */
  home: {
    headline: ["A PERSISTENT", "WORK OS FOR AN", "AI EMPLOYEE"],
    fullFrame: true,
    scene:
      "A printed poster: a cut-out CRT monitor and the mascot floating over a bank of clouds on a flat field, with outlined display type across the top, a monospace specification block in the lower left, and the wordmark running up the right edge.",
  },

  about: {
    headline: ["ABOUT", "CONSTRUCT"],
    scene:
      "The mascot sitting on top of the nearest of three identical beige desktop towers standing shoulder to shoulder in a row, that one turned to face the camera.",
  },
  careers: {
    headline: ["CAREERS AT", "CONSTRUCT"],
    scene:
      "The mascot sitting on top of a closed steel desk pedestal, a brushed nameplate holder with a blank insert standing on the surface beside it and one office chair back just entering the frame behind.",
  },
  affiliates: {
    headline: ["AFFILIATE", "PROGRAM"],
    scene:
      "The mascot sitting on top of a heavy metal cash register with its drawer standing open below, a short stack of paper receipts clipped to a spindle beside it.",
  },
  "editorial-policy": {
    headline: ["EDITORIAL", "POLICY"],
    scene:
      "The mascot sitting on top of a metal clipboard laid flat over a thick block of printed pages, a rubber date stamp resting on the topmost sheet beside it.",
  },
  support: {
    headline: ["SUPPORT"],
    scene:
      "The mascot sitting on top of a beige desk telephone, the handset lifted out of its cradle and lying beside it with the coiled cord still trailing.",
  },
  privacy: {
    headline: ["PRIVACY", "POLICY"],
    scene:
      "The mascot sitting on top of a small steel document safe with its door shut and its dial squarely centred, one key lying flat on the surface beside it.",
  },
  "sub-processors": {
    headline: ["SUB-", "PROCESSORS"],
    scene:
      "The mascot sitting on top of a metal card index drawer pulled open, a short stack of typed vendor cards standing in the tray below and one card lifted just clear of the rest.",
  },
  terms: {
    headline: ["TERMS AND", "CONDITIONS"],
    scene:
      "The mascot sitting on top of a thick bound contract lying closed, a heavy bulldog clip along its edge and a plain wax seal set on the cover beside it.",
  },

  blog: {
    headline: ["INSIGHTS", "AND GUIDES"],
    scene:
      "The mascot sitting on top of a wire magazine rack packed with slim technical journals, the nearest one pulled half out of its slot below.",
  },

  "blog-how-to-choose-an-ai-agent-platform-for-your-team": {
    headline: ["HOW TO CHOOSE", "AN AI AGENT", "PLATFORM"],
    scene:
      "The mascot sitting on top of the middle of three shrink-wrapped software boxes standing upright in a row, that box pulled forward and turned to face the camera.",
  },
  "blog-agent-task-half-life": {
    headline: ["YOUR AGENT HAS", "A HALF-LIFE"],
    scene:
      "The mascot sitting on top of a dot-matrix printer, a long run of fanfold paper feeding out of it and folding into a stack on the bench below, the topmost sheet torn straight across halfway down.",
  },
  "blog-running-ai-agents-on-cloudflare-not-vms": {
    headline: ["EVERY AGENT", "GETS A COMPUTER"],
    scene:
      "The mascot sitting on top of a rack-mount server unit with its lid off and its bays empty, a single hard disk resting on the open chassis beside it.",
  },
  "blog-build-internal-tools-with-construct": {
    headline: ["INTERNAL TOOLS", "BUILT IN YOUR", "WORKSPACE"],
    scene:
      "The mascot sitting on top of a half-assembled machine chassis on a workbench, a bare board, two screws and a case panel laid out on the bench below it.",
  },
  "blog-ai-agent-vs-zapier": {
    headline: ["AI AGENT", "VS ZAPIER"],
    scene:
      "The mascot sitting on top of a squat beige tape reader, a long strip of punched paper tape running dead straight out of it across the bench, its holes identical the whole way along.",
  },
  "blog-ai-agent-vs-virtual-assistant": {
    headline: ["AI AGENT VS", "VIRTUAL", "ASSISTANT"],
    scene:
      "The mascot sitting on top of a punch-card time clock, a rack of blank cards standing below it and one card left half inserted in the slot.",
  },
  "blog-ai-agent-memory": {
    headline: ["AI AGENT MEMORY", "YOU CAN CONTROL"],
    scene:
      "The mascot sitting on top of a wooden card index drawer pulled fully open, tightly packed index cards inside it, one card lifted clear and one lying face down beside the drawer.",
  },
  "blog-ai-employee": {
    headline: ["AN AI EMPLOYEE", "FOR REAL", "BUSINESS WORK"],
    scene:
      "The mascot sitting on top of a stacked wire paper tray filled with printed pages, a brushed steel desk nameplate standing on the surface beside it and a pen laid across the topmost page.",
  },
  "blog-ai-workflow-automation": {
    headline: ["AI WORKFLOW", "AUTOMATION"],
    scene:
      "The mascot sitting on top of a dot-matrix printer mid-run, a continuous fanfold printout feeding out of it and concertinaing into a neat stack below.",
  },
  "blog-construct-vs-chatgpt": {
    headline: ["CONSTRUCT VS", "CHATGPT, CLAUDE", "AND GEMINI"],
    scene:
      "The mascot sitting on top of a wire tray heaped with finished printed documents, a small answering machine with a single cassette in it standing idle beside it.",
  },
  "blog-construct-vs-coding-agents": {
    headline: ["CONSTRUCT VS", "CODING AGENTS"],
    scene:
      "The mascot sitting on top of a wide flat toolbox lying closed, its trays fanned shut, and a tall narrow stack of punch cards standing on end beside it.",
  },
  "blog-construct-vs-copilot": {
    headline: ["CONSTRUCT VS", "MICROSOFT", "COPILOT"],
    scene:
      "The mascot sitting on top of a hard-sided briefcase lying flat and locked with combination dials, a second identical case standing on its edge behind it.",
  },
  "blog-construct-vs-diy": {
    headline: ["CONSTRUCT VS", "BUILDING", "YOUR OWN"],
    scene:
      "The mascot sitting on top of one finished machine standing closed and clean, a parts tray of loose brackets, screws, ribbon cable and an unmounted drive set out below it.",
  },
  "blog-construct-vs-zapier": {
    headline: ["CONSTRUCT VS", "ZAPIER, MAKE", "AND N8N"],
    scene:
      "The mascot sitting on top of a bank of three identical tape drives standing side by side, a strip of punched paper tape running straight out of each in perfect alignment.",
  },
  "blog-what-is-an-ai-employee": {
    headline: ["WHAT IS AN", "AI EMPLOYEE?"],
    scene:
      "The mascot sitting on top of a squat beige monitor stand alone at the centre of the frame, larger than on any other card, a blank employee ID badge on a lanyard lying flat below it. Essentially a portrait.",
  },
  "blog-chat-assistants-vs-ai-employees": {
    headline: ["CHAT ASSISTANTS", "VS AI EMPLOYEES"],
    scene:
      "The mascot sitting on top of one finished bound report lying squarely closed, a spike file crowded with torn message slips standing beside it.",
  },

  authors: {
    headline: ["THE PEOPLE", "WHO WRITE", "CONSTRUCT"],
    scene:
      "The mascot sitting on top of a manual typewriter with a half-typed page still in its carriage, three fountain pens lined up on the surface below it.",
  },
  "authors-ankush": {
    headline: ["ANKUSH"],
    scene:
      "The mascot sitting on top of a thick ream of typed paper, a single fountain pen lying uncapped across the top sheet and its cap resting a little apart.",
  },
  "authors-nischal": {
    headline: ["NISCHAL"],
    scene:
      "The mascot sitting on top of a typewriter carriage lifted out on its own, a page still threaded through the platen and two finished pages stacked below.",
  },
  "authors-construct-team": {
    headline: ["CONSTRUCT", "TEAM"],
    scene:
      "The mascot sitting on top of a shallow steel document tray holding three identical brushed nameplates standing in a row, all of them blank.",
  },

  "blog-tag-ai-agent": {
    headline: ["EVERYTHING ON", "AI AGENTS"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled AI AGENT.",
  },
  "blog-tag-ai-employee": {
    headline: ["EVERYTHING ON", "AI EMPLOYEES"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled AI EMPLOYEE.",
  },
  "blog-tag-chatgpt": {
    headline: ["EVERYTHING ON", "CHATGPT"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled CHATGPT.",
  },
  "blog-tag-comparison": {
    headline: ["EVERY", "COMPARISON"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled COMPARISON.",
  },
  "blog-tag-product": {
    headline: ["EVERYTHING ON", "THE PRODUCT"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled PRODUCT.",
  },
  "blog-tag-workflow-automation": {
    headline: ["WORKFLOW", "AUTOMATION"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled WORKFLOW.",
  },
  "blog-tag-zapier": {
    headline: ["EVERYTHING ON", "ZAPIER"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled ZAPIER.",
  },
};

export function ogPoster(name: string): PosterCard | undefined {
  return ogPosters[name];
}
