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
  pricing: "PRICING",
  "use-case": "USE CASE",
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

  pricing: {
    headline: ["SIMPLE", "PRICING"],
    scene:
      "The mascot sitting on top of a mechanical price gun lying on its side, a short stack of peel-off price stickers fanned beside it and one sticker half applied to a closed cardboard box.",
  },
  "use-cases": {
    headline: ["USE CASES"],
    scene:
      "The mascot sitting on top of a fan of seven labelled hanging folders spread across a desk blotter, the nearest tab lifted just clear of the rest.",
  },
  "use-cases-workflows": {
    headline: ["ENCODE THE", "PROCESS ONCE"],
    scene:
      "The mascot sitting on top of a fanfold procedure binder standing open to a typed checklist, a rubber date stamp resting on the facing page.",
  },
  "use-cases-internal-tools": {
    headline: ["TOOLS BUILT", "IN YOUR", "WORKSPACE"],
    scene:
      "The mascot sitting on top of a small assembled switchboard panel standing upright on the bench, a parts tray of spare knobs and a screwdriver laid out below it.",
  },
  "use-cases-scheduling": {
    headline: ["SCHEDULE THE", "OUTCOME"],
    scene:
      "The mascot sitting on top of a mechanical desk calendar with today's leaf flipped forward, a wound brass timer standing beside it and a stamped job ticket in the tray below.",
  },
  "use-cases-team-workspaces": {
    headline: ["ONE WORKSPACE", "FOR THE TEAM"],
    scene:
      "The mascot sitting on top of a shared steel inbox tray holding three identical in-trays stacked, a set of unused desk nameplates lined along the front edge.",
  },
  "use-cases-memory": {
    headline: ["MEMORY YOU", "CAN INSPECT"],
    scene:
      "The mascot sitting on top of a wooden card-index cabinet with one drawer pulled open, a single typed card clipped to a review flag standing in the tray.",
  },
  "use-cases-channels": {
    headline: ["WORK ACROSS", "CHANNELS"],
    scene:
      "The mascot sitting on top of a beige desk intercom with three channel buttons, a coiled handset cord and a separate wall phone jack plate lying beside it.",
  },
  "use-cases-research": {
    headline: ["RESEARCH YOU", "CAN SEND"],
    scene:
      "The mascot sitting on top of a finished bound briefing folder with a metal paper fastener through the spine, a stack of source photocopies clipped beside it.",
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
  "blog-best-ai-employee-platforms": {
    headline: ["AI EMPLOYEES", "FOR SMALL", "BUSINESS"],
    scene:
      "The mascot sitting on top of a tall steel filing cabinet with its top drawer pulled open, a row of hanging folders inside, and ten printed resumes fanned out across the bench below it.",
  },
  "blog-agent-verification-gap": {
    headline: ["NOBODY MERGES", "AN EMAIL"],
    scene:
      "The mascot sitting on top of a flatbed document scanner with its lid raised, a single typed letter lying face up on the glass, and a rubber stamp and its ink pad on the bench below.",
  },
  "blog-agent-task-half-life": {
    headline: ["YOUR AGENT HAS", "A HALF-LIFE"],
    scene:
      "The mascot sitting on top of a dot-matrix printer, a long run of fanfold paper feeding out of it and folding into a stack on the bench below, the topmost sheet torn straight across halfway down.",
  },
  "blog-clef-vs-jev-benchmark": {
    headline: ["CLEF VS JEV", "ON REAL AGENT", "DECISIONS"],
    scene:
      "The mascot sitting on top of a tall mechanical balance scale with two hanging pans, a thick stack of index cards on one pan and a single index card on the other.",
  },
  "blog-jev-ai-agents": {
    headline: ["JEV INSIDE", "AN AI EMPLOYEE"],
    scene:
      "The mascot sitting on top of a tall mail sorting cabinet with rows of labeled pigeonholes, a few envelopes filed into their slots and a small unsorted pile left on the bench below.",
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
  /**
   * Hand-made, like `home`: `assets/og/blog-zen-mode.png` is the title frame of
   * the Zen Mode launch film (the video repo's `out/thumb-zen-mode.png`, top
   * 1008px, scaled to 1200x630). It carries its own words, so `headline` and
   * `scene` are kept only for the record and the freshness signature.
   */
  "blog-zen-mode": {
    headline: ["ZEN MODE"],
    scene:
      "A frame from the Zen Mode launch film: the CONSTRUCT overline and the words Zen Mode set over the dimmed Zen Mode Home screen.",
  },
  "blog-grokbot-alternative": {
    headline: ["GROKBOT", "ALTERNATIVE"],
    scene:
      "The mascot sitting on top of a compact beige desktop computer, beside a smaller beige CRT monitor displaying the official black circular Grok Bot avatar with two white slanted eyes. The monitor bezel reads GROK BOT. A short cable connects the two devices. Use assets/refs/grokbot/official-avatar.png as the screen reference.",
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
  "blog-construct-vs-openai-dots": {
    headline: ["CONSTRUCT VS", "CHATGPT DOTS"],
    scene:
      "The mascot sitting on top of a beige tower computer, a small CRT monitor beside it showing a single large black dot in the middle of a blank white screen.",
  },
  "blog-chatgpt-dots-alternatives": {
    headline: ["CHATGPT DOTS", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a wooden printer's type case with its shallow drawer pulled out, each small compartment holding a different round metal dot, a magnifying loupe resting on the bench below.",
  },
  "blog-ai-agent-with-its-own-computer": {
    headline: ["AN AI AGENT", "WITH ITS OWN", "COMPUTER"],
    scene:
      "The mascot sitting on top of a beige desktop computer and its CRT monitor, set up on a small wooden school desk with the matching chair pushed in, a blank name card propped against the keyboard.",
  },
  "blog-muse-for-small-business-alternatives": {
    headline: ["MUSE FOR SMALL", "BUSINESS", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a heavy mechanical shop cash register with its money drawer open, a paper receipt curling out of the printer and a small brass shop bell on the counter beside it.",
  },
  "blog-construct-vs-lindy": {
    headline: ["CONSTRUCT VS", "LINDY"],
    scene:
      "The mascot sitting on top of a small office telephone switchboard, rows of patch cords plugged into its jacks, a coiled desk phone handset resting on the bench below.",
  },
  "blog-ai-agent-email-address": {
    headline: ["YOUR AGENT'S", "OWN EMAIL", "ADDRESS"],
    scene:
      "The mascot sitting on top of a wooden mail sorting cabinet with rows of small open pigeonholes, one slot holding a short stack of envelopes tied with string.",
  },
  "blog-gemini-spark-alternatives": {
    headline: ["GEMINI SPARK", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a closed wooden map chest with shallow drawers, a small desk globe with a few map pins in it standing beside the chest and a travel plug adapter lying on the bench in front.",
  },

  "blog-lindy-alternatives": {
    headline: ["LINDY", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a tall revolving wire brochure rack stocked with folded product leaflets, one leaflet pulled out and lying open on the bench below beside a ballpoint pen.",
  },
  "blog-ai-agent-gmail-access-safely": {
    headline: ["LET AN AGENT", "USE GMAIL SAFELY"],
    scene:
      "The mascot sitting on top of a steel lockable post box with a small padlock hanging from its latch, a single sealed envelope and a spare key lying on the bench beside it.",
  },
  "blog-construct-vs-muse": {
    headline: ["CONSTRUCT", "VS MUSE"],
    scene:
      "The mascot sitting on top of a wooden shop counter with a glass display case built into its front, a small chrome service bell and a spiral-bound order book resting on the bench beside it.",
  },
  "blog-always-on-ai-agents-compared": {
    headline: ["DOTS VS MUSE", "VS GROK", "VS COWORK"],
    scene:
      "The mascot sitting on top of a revolving office bookcase with four open sides, a different ring binder standing on each side, and a desk magnifier and a short price list lying on the bench beside it.",
  },
  "blog-agent-reliability-calculator": {
    headline: ["HOW MANY STEPS", "WILL IT FINISH?"],
    scene:
      "The mascot sitting on top of a tall rolling office step ladder with three wide treads, a pair of dice and a short stack of numbered index cards resting on the bench beside it.",
  },
  "blog-construct-vs-claude-cowork": {
    headline: ["CONSTRUCT", "VS COWORK"],
    scene:
      "The mascot sitting on top of a two-person office desk with a fabric partition panel running down its middle, a shared wire desk organiser and a coiled phone handset resting on the bench below.",
  },
  "blog-best-ai-employee-for-solo-founders": {
    headline: ["BEST AI", "EMPLOYEES FOR", "SOLO FOUNDERS"],
    scene:
      "The mascot sitting on top of a small roll-top desk with its slatted lid pulled down, a single key on a ring and a coffee mug resting on the bench beside it.",
  },
  "blog-ai-inbox-triage": {
    headline: ["INBOX TRIAGE", "DRAFTS NOT SENDS"],
    scene:
      "The mascot sitting on top of a metal office mail cart with three canvas bins, envelopes sorted into each bin and a rubber band ball resting on the bench beside it.",
  },
  "blog-hosted-openclaw-alternatives": {
    headline: ["HOSTED OPENCLAW", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a floor-standing uninterruptible power supply unit with its status panel facing the camera, a coiled power cable and a small padlock lying on the bench beside it.",
  },
  "blog-ai-agent-scheduled-tasks": {
    headline: ["SCHEDULED AGENT", "LAPTOP CLOSED"],
    scene:
      "The mascot sitting on top of a large flip-number clock radio with its number cards caught mid-turn, a shut laptop lying closed on the bench beside it.",
  },
  "blog-construct-vs-genspark-claw": {
    headline: ["CONSTRUCT VS", "GENSPARK CLAW"],
    scene:
      "The mascot sitting on top of the glass cabinet of a coin-operated claw crane machine, a few plush prizes heaped inside below it and a single game token lying on the bench beside it.",
  },
  "blog-construct-vs-openclaw": {
    headline: ["CONSTRUCT", "VS OPENCLAW"],
    scene:
      "The mascot sitting on top of a tall rolling mechanic's tool chest with its drawers shut, an adjustable wrench and a pair of locking pliers laid on the bench beside it.",
  },
  "blog-ai-agent-activity-log": {
    headline: ["ACTIVITY LOG", "VS AUDIT LOG"],
    scene:
      "The mascot sitting on top of a desktop fax machine with a printed transmission journal curling out of its output tray, a highlighter and a rubber band lying on the bench beside it.",
  },
  "blog-ai-company-research-spreadsheet": {
    headline: ["COMPANY RESEARCH", "WITH SOURCES"],
    scene:
      "The mascot sitting on top of a boxy overhead projector with a ruled transparency sheet laid flat on its glass, a stack of printed company brochures and a felt marker pen resting on the bench beside it.",
  },
  "blog-ai-delegation-checklist": {
    headline: ["AI DELEGATION", "CHECKLIST"],
    scene:
      "The mascot sitting on top of an overhead projector with its arm folded down, a single printed checklist transparency lying on the glass and a box of grease pencils on the bench beside it.",
  },
  "blog-construct-vs-gemini-spark": {
    headline: ["CONSTRUCT", "VS SPARK"],
    scene:
      "The mascot sitting on top of a tall metal key cabinet with its door swung open on rows of labelled hooks, one hook empty, and a single key on a plastic fob lying on the bench below.",
  },
  "blog-ai-agent-slack-briefing": {
    headline: ["MORNING", "BRIEFING", "IN SLACK"],
    scene:
      "The mascot sitting on top of a large office drip coffee maker with a full glass carafe on its warming plate, a folded one-page printout and a mug on the bench beside it.",
  },
  "blog-viktor-alternatives": {
    headline: ["VIKTOR", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of an office water cooler with a full bottle seated upside down behind it, a short stack of paper cone cups and a folded memo on the bench beside it.",
  },
  "blog-construct-vs-viktor": {
    headline: ["CONSTRUCT", "VS VIKTOR"],
    scene:
      "The mascot sitting on top of a wooden-framed cork noticeboard standing on a small easel, a few memo slips pinned to its face and an open box of push pins on the bench below.",
  },
  "blog-ai-agent-browser-and-terminal": {
    headline: ["BROWSER AND", "TERMINAL,", "ONE TASK"],
    scene:
      "The mascot sitting on top of a beige rolling computer cart with its keyboard tray pulled out, a coiled serial cable and a single floppy disk lying on the tray below.",
  },
  "blog-claude-cowork-alternatives": {
    headline: ["COWORK", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a row of three different office chairs pushed together side by side, a swivel chair, a stacking chair and a drafting stool, with a clipboard and a rolled tape measure lying on the bench in front.",
  },
  "blog-ai-lead-sourcing-hubspot": {
    headline: ["NEW LEADS", "INTO HUBSPOT", "EVERY MORNING"],
    scene:
      "The mascot sitting on top of a large rotary business card file with its cards fanned open, a few fresh blank cards and a pen lying on the bench beside it.",
  },
  "blog-hermes-vs-openclaw-vs-managed": {
    headline: ["HERMES, OPENCLAW", "OR MANAGED?"],
    scene:
      "The mascot sitting on top of a tall coin-operated drinks vending machine with three large selection buttons along its front, a single coin and an empty paper cup on the bench beside it.",
  },
  "blog-ai-employee-for-agencies": {
    headline: ["AI EMPLOYEE", "FOR AGENCIES"],
    scene:
      "The mascot sitting on top of a tilted wooden drafting table with a hand-drawn storyboard pinned flat across it, a jar of marker pens and a folding proof loupe standing on the bench below.",
  },
  "blog-ai-agent-linear-from-slack": {
    headline: ["LINEAR UPDATES", "FROM SLACK"],
    scene:
      "The mascot sitting on top of the frame of a rolling office whiteboard, magnetic task cards arranged in three columns on its surface and a marker resting in the tray below.",
  },
  "blog-ai-employee-cost-calculator": {
    headline: ["VA OR AGENT?", "RUN THE NUMBERS"],
    scene:
      "The mascot sitting on top of a heavy floor-standing shipping platform scale with a flat steel deck, a small stack of coins and a folded paper invoice resting on the bench beside it.",
  },
  "blog-perplexity-computer-alternatives": {
    headline: ["PERPLEXITY", "COMPUTER", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a large mechanical postal scale with a wide steel platform, a small sealed parcel and a roll of postage stamps on the bench beside it.",
  },
  "blog-customer-story-1": {
    headline: ["CUSTOMER STORY", "BEFORE & AFTER"],
    scene:
      "The mascot sitting on top of a shoulder-mount VHS camcorder lying on its side, a handheld microphone with a coiled cable and a blank cassette tape on the bench beside it.",
  },
  "blog-perplexity-computer-vs-cowork-vs-manus": {
    headline: ["COMPUTER", "VS COWORK", "VS MANUS"],
    scene:
      "The mascot sitting on top of a large office photocopier with a multi-bin sorter attached to its side, a finished stack of collated copies and a wind-up kitchen timer resting on the bench below.",
  },
  "blog-ai-agent-files-and-artifacts": {
    headline: ["WORK THAT", "OUTLASTS", "THE CHAT"],
    scene:
      "The mascot sitting on top of a beige microfiche reader with its viewing hood tilted up, a plastic sleeve of microfiche sheets and a hand magnifier lying on the bench beside it.",
  },
  "blog-ai-agent-telegram-slack-discord": {
    headline: ["MESSAGE YOUR", "AGENT ANYWHERE"],
    scene:
      "The mascot sitting on top of a desktop fax machine with a curled sheet half out of its output tray, a flip phone and a two-way radio lying on the bench beside it.",
  },
  "blog-manus-alternatives": {
    headline: ["MANUS", "ALTERNATIVES", "FOR RECURRING"],
    scene:
      "The mascot sitting on top of a carousel slide projector, its round slide tray mounted behind it and a single loose slide lying on the bench below.",
  },
  "blog-where-ai-agents-fail": {
    headline: ["WHERE AI", "AGENTS FAIL"],
    scene:
      "The mascot sitting on top of a large desktop pen plotter with a long printed chart curling out of its rollers, a magnifying glass and a capped marker resting on the bench beside it.",
  },
  "blog-ai-competitor-pricing-report": {
    headline: ["WEEKLY PRICING", "REPORT"],
    scene:
      "The mascot sitting on top of a heavy desktop printing calculator, a long paper tape curling off its roller onto the bench, with two folded product brochures lying open beside it.",
  },
  "blog-ai-agent-prompt-injection": {
    headline: ["PROMPT", "INJECTION"],
    scene:
      "The mascot sitting on top of a heavy office paper shredder bin, a single typed letter half fed into its slot and a magnifying glass lying on the bench beside it.",
  },
  "blog-sintra-alternatives": {
    headline: ["SINTRA", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a large office photocopier with its lid closed, a short stack of freshly copied flyers in the output tray and a stapler on the bench below.",
  },
  "blog-sintra-vs-marblism-vs-lindy": {
    headline: ["SINTRA VS", "MARBLISM", "VS LINDY"],
    scene:
      "The mascot sitting on top of a large mechanical postal scale with its weighing platform empty, three sealed envelopes of different sizes lined up on the bench beside it.",
  },
  "blog-ai-agent-custom-mcp": {
    headline: ["CONNECT YOUR", "OWN TOOLS"],
    scene:
      "The mascot sitting on top of a rack-width network patch panel laid flat on the bench, a short coil of patch cable and a punch-down tool lying beside it.",
  },
  "blog-hire-an-ai-employee": {
    headline: ["HIRE YOUR FIRST", "AI EMPLOYEE"],
    scene:
      "The mascot sitting on top of a high-backed office swivel chair pulled up to a bare desk, a new staff ID badge on a lanyard and a one-month desk planner lying on the desk beside it.",
  },
  "blog-construct-vs-manus": {
    headline: ["CONSTRUCT", "VS MANUS"],
    scene:
      "The mascot sitting on top of a heavy cast-iron bench vise clamped to the edge of the bench, a pair of canvas work gloves and a small adjustable wrench lying beside it.",
  },
  "blog-construct-vs-perplexity-computer": {
    headline: ["CONSTRUCT VS", "PERPLEXITY", "COMPUTER"],
    scene:
      "The mascot sitting on top of a steel library book cart loaded with thick reference volumes, a magnifying glass and a single index card lying on the bench beside it.",
  },
  "blog-ai-coworker-vs-ai-employee": {
    headline: ["COWORKER,", "EMPLOYEE OR", "ASSISTANT?"],
    scene:
      "The mascot sitting on top of a wooden office reception counter, a brass service bell and an open visitor sign-in book resting on the bench in front of it.",
  },
  "blog-cheapest-ai-employee": {
    headline: ["CHEAPEST AI", "EMPLOYEE"],
    scene:
      "The mascot sitting on top of a heavy electric adding machine, a long paper tally roll curling off the back of it and a short stack of coins on the bench beside it.",
  },
  "blog-construct-vs-cellcog": {
    headline: ["CONSTRUCT", "VS CELLCOG"],
    scene:
      "The mascot sitting on top of a freestanding shift roster board on wheels with rows of blank name magnets, a marker and an eraser resting on the bench below.",
  },
  "blog-ai-follow-ups-crm-without-zapier": {
    headline: ["FOLLOW-UPS", "WITHOUT ZAPIER"],
    scene:
      "The mascot sitting on top of a heavy office postage meter with a short stack of stamped envelopes waiting in its feed tray, a rubber band ball and a rotary card file on the bench beside it.",
  },
  "blog-ai-search-recommends-ai-employees": {
    headline: ["WHAT AI SEARCH", "RECOMMENDS"],
    scene:
      "The mascot sitting on top of a street newspaper vending box with its front window shut, a folded broadsheet and a pair of reading glasses lying on the bench beside it.",
  },
  "blog-ai-investor-update": {
    headline: ["INVESTOR UPDATE", "DRAFTED WEEKLY"],
    scene:
      "The mascot sitting on top of a desktop comb binding machine, a freshly bound weekly report lying on the bench beside it with a pen clipped to its cover.",
  },
  "blog-construct-computer-alternatives": {
    headline: ["CONSTRUCT", "ALTERNATIVES"],
    scene:
      "The mascot sitting on top of a countertop key-cutting machine, a pegboard of blank keys hanging beside it and one freshly cut key lying on the bench in front.",
  },
  "blog-construct-vs-simular-sai": {
    headline: ["CONSTRUCT VS", "SIMULAR SAI"],
    scene:
      "The mascot sitting on top of a steel secretary's desk with its typing return folded out to one side, a shorthand notepad and a wired mouse lying on the bench beside it.",
  },
  "blog-ai-employee-for-consultants": {
    headline: ["AI EMPLOYEE FOR", "CONSULTANTS"],
    scene:
      "The mascot sitting on top of a hard-sided consultant's portfolio case standing upright on its edge, a spiral-bound proposal and a fountain pen lying on the bench in front of it.",
  },
  "blog-ai-employee-team-workspace": {
    headline: ["ONE AI EMPLOYEE", "FOR THE TEAM"],
    scene:
      "The mascot sitting on top of a beige overhead projector with its arm folded down, a few clear transparency sheets and a dry-erase marker lying on the bench beside it.",
  },
  "blog-is-construct-computer-safe": {
    headline: ["IS CONSTRUCT", "SAFE?"],
    scene:
      "The mascot sitting on top of a wall-mount key cabinet laid flat with its door shut, a numbered key tag and a small brass padlock lying on the bench beside it.",
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
  "blog-tag-google-workspace": {
    headline: ["EVERYTHING ON", "GOOGLE", "WORKSPACE"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled GOOGLE WORKSPACE.",
  },
  "blog-tag-product": {
    headline: ["EVERYTHING ON", "THE PRODUCT"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled PRODUCT.",
  },
  "blog-tag-reliability": {
    headline: ["EVERYTHING ON", "RELIABILITY"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled RELIABILITY.",
  },
  "blog-tag-small-business": {
    headline: ["EVERYTHING ON", "SMALL BUSINESS"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled SMALL BUSINESS.",
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
  "blog-tag-governance": {
    headline: ["EVERYTHING ON", "GOVERNANCE"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled GOVERNANCE.",
  },
  "blog-tag-email": {
    headline: ["EVERYTHING ON", "EMAIL"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled EMAIL.",
  },
  "blog-tag-decision-models": {
    headline: ["DECISION", "MODELS"],
    scene:
      "The mascot sitting on top of a large railway signal lever frame with a row of tall steel levers, one lever pulled forward and the rest standing upright.",
  },
  "blog-tag-engineering": {
    headline: ["ENGINEERING"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled ENGINEERING.",
  },
  "blog-tag-scheduling": {
    headline: ["EVERYTHING ON", "SCHEDULING"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled SCHEDULING.",
  },
  "blog-tag-openclaw": {
    headline: ["EVERYTHING ON", "OPENCLAW"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled OPENCLAW.",
  },
  "blog-tag-gemini-spark": {
    headline: ["EVERYTHING ON", "GEMINI SPARK"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled GEMINI SPARK.",
  },
  "blog-tag-viktor": {
    headline: ["EVERYTHING ON", "VIKTOR"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled VIKTOR.",
  },
  "blog-tag-claude-cowork": {
    headline: ["EVERYTHING ON", "CLAUDE COWORK"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled CLAUDE COWORK.",
  },
  "blog-tag-internal-tools": {
    headline: ["INTERNAL TOOLS"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled INTERNAL TOOLS.",
  },
  "blog-tag-virtual-assistant": {
    headline: ["VIRTUAL", "ASSISTANTS"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled VIRTUAL ASSISTANT.",
  },
  "blog-tag-pricing": {
    headline: ["EVERYTHING ON", "PRICING"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled PRICING.",
  },
  "blog-tag-manus": {
    headline: ["EVERYTHING ON", "MANUS"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled MANUS.",
  },
  "blog-tag-perplexity": {
    headline: ["EVERYTHING ON", "PERPLEXITY"],
    scene:
      "The mascot sitting on top of an open steel filing drawer packed with hanging folders, one tab raised clear of the rest and labelled PERPLEXITY.",
  },
};

export function ogPoster(name: string): PosterCard | undefined {
  return ogPosters[name];
}
