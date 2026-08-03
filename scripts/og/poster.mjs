/**
 * The design system for Construct's social cards.
 *
 * Every card is one photograph: a real physical object and the Construct
 * mascot, shot together in a blacked-out blue studio, with the type set over
 * the frame the way a magazine cover carries its own headline. The model draws
 * the words, so the only thing standing between 34 cards and 34
 * different-looking cards is this file being sent byte-identical every time and
 * the style plate being attached to every call.
 *
 * Three levers hold the set together, in order of how much they actually do:
 *
 *   1. `assets/og/style/master.webp` — one approved card, attached first on
 *      every request as the thing to copy. This does more than all the prose
 *      below combined.
 *   2. This contract, sent verbatim.
 *   3. The per-route entry in `app/content/og-poster.ts`, which is the only
 *      part that changes.
 *
 * The direction is deliberate and was chosen against alternatives: a 2000s
 * technology magazine cover, not a software marketing render. The failure mode
 * this set exists to avoid is the default one — a swarm of glowing translucent
 * UI panels and dashed orbit rings on a cyan gradient, which is what every
 * image model reaches for and what every AI company already looks like. Real
 * objects, real light, and real restraint are the whole point, and the contract
 * forbids the alternative by name because asking nicely does not work.
 *
 * If one card comes out wrong, fix its scene. Only edit the contract when the
 * whole set should change, and regenerate everything after, or the set stops
 * matching itself.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** Bump when the contract changes, to mark every committed card stale. */
export const POSTER_VERSION = 3;

/**
 * Gemini offers no 1.91:1, so cards are rendered at the nearest wider ratio and
 * centre-cropped down to 1200x630. That eats 3.4% off the top and the bottom,
 * which is why the contract reserves a safe band.
 */
export const POSTER_ASPECT = "16:9";

/** The approved card, attached to every later call as the thing to match. */
export const stylePlatePath = path.join(root, "assets/og/style/master.webp");

/**
 * Brand references, in weight order. Everything here is free of people: the
 * poster references in `assets/refs/` that feature a model are deliberately
 * left out, because a face bleeding into a social card is the one mistake that
 * cannot be shipped.
 *
 * The two poster references carry type. That is the point — they are what
 * teaches the model the weight, the spacing, and the print finish of a real
 * headline. The contract names the strings allowed on the card, so their words
 * stay out.
 */
const mascotReference = {
  file: "public/favicon.png",
  note: "THE MASCOT — its exact silhouette, and the single most important thing to get right. A rounded square body with one semicircular bump protruding from each of its four corners, and two upright deep-navy capsule eyes set close together in the middle of the body. Trace this outline. The four corner bumps are what make it itself, and a render without them is not this character. It must never come out as a dome, a bell jar, a cloche, an egg, an oval, a circle, a plain squircle with no bumps, a flower with petals, an animal head with ears, a melted or dripping form, or anything with arms, legs, hands, or feet.",
};

const brandReferences = [
  {
    file: "assets/refs/magazine-cover.png",
    note: "THE DIRECTION. The mascot as a hero object, hyper-rendered and lit dramatically against deep saturated blue. Match this render quality, this drama, and this depth of colour. Do not copy its iridescent oil-slick material, its price starburst, or any of its words.",
  },
  {
    file: "assets/refs/realistic-slip.png",
    note: "Type discipline and physical craft: one real object photographed in a studio, and a heavy grotesque headline that stays perfectly legible with real restraint around it. Match this respect for the object. Do not copy its grey ground or any of its words.",
  },
  {
    file: "assets/refs/sys-requirements.png",
    note: "How writing appears ON an object: printed, silkscreened, or embossed into the product itself, short and typographically calm. Match this treatment. Do not copy its cream ground, its ruled boxes, or any of its words.",
  },
];

/**
 * What is attached to a request.
 *
 * The mascot goes first and the style plate second. That order was the other
 * way round at first, on the reasoning that matching one approved card is a
 * stronger instruction than any description of one — which is true of the
 * layout, and turned out to be the problem. The plate's mascot is one lit,
 * partly occluded, three-quarter-ish view of the character rather than its
 * silhouette, and cards that copied the plate hardest drifted furthest from
 * the shape: six of the first set came back as domes, lobeless squircles, or
 * blobs with limbs. Leading with the flat canonical logo fixes the outline
 * while the plate, still second, keeps the layout.
 */
export function posterReferences() {
  if (!existsSync(stylePlatePath)) return [mascotReference, ...brandReferences];
  return [
    mascotReference,
    {
      file: path.relative(root, stylePlatePath),
      note: "THE STYLE PLATE — an approved card from this exact set. Copy its layout grid, its typeface, its type sizes and weights, its letter-spacing, its colours, its studio, and its lighting precisely. Your card must look like it came out of the same shoot on the same afternoon. Take the layout and the light from this, but take the mascot's shape from reference 1, which outranks it. Only the object being photographed and the words in the headline differ.",
    },
    ...brandReferences,
  ];
}

const STUDIO = `THE STUDIO — identical on every card, never redesign it
A blacked-out photographic studio with a seamless blue background. It runs near-black navy #071A44 at the outer edges and corners and rises to a rich electric blue #1668E0 in one soft pool behind the hero object. This is a lit room, not a gradient: the falloff is physical, slightly uneven, and comes from a single large source behind and above the subject. There is no visible floor line and no horizon; the objects sit in their own pool of light with the background dropping away behind them.
No rays of light fanned out to the corners. No starburst, no lens flare, no bloom filter, no vignette effect, no radiating streaks.

THE PHOTOGRAPH
A real studio product photograph, shot on a medium-format camera with a 100mm macro at a middling aperture: sharp through the subject, physically lit, ray-traced, with true refraction, real caustics, and hard clean speculars. Dramatic key from behind and above, deep falloff into the dark, one bright rim tracing every glass and metal contour, and a soft fill from the front left that keeps the shadow side readable. Expensive, deliberate, and entirely believable as a photograph.
Not an illustration, not flat vector, not cel shading, not a painting, not a UI mockup, not a glowing marketing render.

COLOUR
Deep navy, electric blue, pure white, brushed silver, warm beige-grey plastic, and the cool grey-blue of thick glass. One small accent of brand cyan #01B4C8 at most. Nothing else. No purple, magenta, orange, red, yellow, green, gold, or iridescent oil-slick.

THE MASCOT — a real object, present and hero on every card
The mascot is not a graphic pasted on top. It is a solid object moulded from thick clear glass, sitting on the same set, under the same lights, as everything else in the frame. It genuinely refracts and bends what is behind it, gathers caustics beneath itself, catches the key light as one hard specular highlight on its upper left lobe, and picks up blue from the room.
ITS SHAPE, exactly. Build the silhouette in this order and check it before rendering anything else:
  a. Start from a square with generously rounded edges, as wide as it is tall.
  b. Add one semicircular bump protruding outward from each of the four corners. All four are the same size, and each is about a third of the width of the square body. Nothing protrudes from the middle of an edge, only from the corners.
  c. That is the whole outline: a four-lobed clover. It is symmetrical left to right and top to bottom.
  d. Set two vertical rounded-capsule eyes in deep navy #1B3A6B into the middle of the square body, side by side and close together, both the same size and perfectly upright, each about a fifth of the body's height.
The four corner lobes are what make it this character, and a form without them is a different character. It is never a dome, a bell jar, a cloche, an egg, an oval, a circle, a plain squircle with no bumps, a flower with petals, an animal head with ears, or a melted or dripping form. It has no mouth, no nose, no eyebrows, no arms, no legs, no hands, no feet, no accessories, and nothing hangs off it or drips from it. Pale ice-blue tint. Calm and attentive, never cute-cartoonish, never robotic, never anthropomorphised.

THE OBJECTS — real things, photographed
Everything sharing the frame with the mascot is a tangible object from the world of working computers, roughly 1995 to 2005, in beige and grey moulded plastic, brushed aluminium, steel, and printed paper: desktop towers, hard disk platters, rack units, floppy disks, CD-ROMs, shrink-wrapped software boxes, dot-matrix continuous printout, punched tape, index card drawers, hanging file folders, manila folders, paper trays, desk telephones, clipboards, bound reports, nameplates, ID badges, keyboards, cables. Well used but immaculate. One hero object, two at the very most.`;

/**
 * Writing on the objects themselves is allowed and wanted: it is what makes a
 * reference like `sys-requirements.png` read as a real artifact rather than a
 * render. It is fenced tightly because a garbled label is worse than no label.
 */
const IN_WORLD_TEXT = `WRITING ON THE OBJECTS — allowed, and wanted
The objects may carry the writing real objects carry: a product name silkscreened on a box, a label on a file tab, a line of print on a page, a moulded logo on a bezel. It should feel manufactured, not annotated.
It must be short — a few words at most — in plain correctly-spelled English, set in a quiet neutral sans or a monospace, small enough that it never competes with the headline, and never repeating the headline. Where a product name is wanted, use CONSTRUCT or CONSTRUCT COMPUTER. Never invent a price, a version number, a year, a rating, or a marketing slogan. Never write "os.construct.computer". Nothing may be blurred, doubled, half-formed, or nonsense: if a piece of writing cannot be rendered cleanly and legibly, leave the surface blank instead.`;

const TYPOGRAPHY = `TYPOGRAPHY — the strictest part of this contract. Identical on every card.
One typeface for all four elements: a heavy condensed grotesque with flat terminals, the weight and proportion of Helvetica Neue Condensed Black. Never a serif, never a script, never rounded, never techno or futuristic.
The headline is flat, opaque, pure white, crisp as printed ink. It is NOT 3D, NOT extruded, NOT bevelled, NOT chrome, NOT glass, NOT glowing, NOT outlined, NOT gradient-filled, and casts no shadow.

Four text elements are set over the photograph, and there are no others:

1. WORDMARK, top left. The single word CONSTRUCT in polished silver metal capitals, tracked out wide, cap height about 4% of the frame height, its baseline about 11% down from the top. This is the only element with a metal finish, and it must be bright: its midtones sit near-white and it reads as clearly against the dark background as the headline does. Never dark grey, never dull, never gunmetal, never sunk into the background.

2. BADGE, top right, level with the wordmark. The word {{EYEBROW}} in pure white #FFFFFF capitals, tracked out wide, cap height about 2.2% of the frame height, sitting inside a thin white hairline rectangle with square corners. Its right edge sits on a 6% margin from the right edge of the frame.

3. HEADLINE, lower left, by far the largest thing on the card. Pure white #FFFFFF capitals, set tight, leading noticeably tighter than the cap height so the lines lock into one solid block, its left edge on a 6% margin. Break it across exactly these lines and no others:
{{HEADLINE}}
   The baseline of its last line sits about 84% down from the top. Set it as large as it will go while every line stays inside the left 52% of the frame.
   Every letter of it sits on dark, even background. It must never cross, touch, or overlap the mascot or any other object in the photograph: stage the objects further right or higher rather than letting a letter fall on one. White type on a pale beige machine is a failure even when it is technically readable.

4. DOMAIN, bottom right. The words construct.computer in pure white, lowercase, at a light weight, cap height about 1.9% of the frame height, its baseline about 92% down from the top and its right edge on a 6% margin.

Spelling is not negotiable. Every string above must appear exactly as written, correctly spelled, with no extra words, no substituted words, no invented tagline, no repeated line, and no malformed or half-formed letters.`;

const FORBIDDEN = `ABSOLUTELY NOT
Above all: no swarm of floating translucent UI panels, no glowing glass cards hanging in mid-air, no dashed concentric orbit rings, no floating rounded app tiles, no circuit traces, no cyan gradient haze, no particles. That is generic AI-company filler, it is what an image model reaches for by default, and it is the single thing this set exists to avoid. Photograph real objects instead.
No humans, faces, hands, or body parts. No extra text beyond the four elements and the writing permitted on the objects. No QR codes, price starbursts, rating stars, or year badges. No paper texture, halftone dots, film grain, scan lines, folds, or tears laid over the image. No chrome, gold, or iridescence anywhere except the silver wordmark. No neon cyberpunk, glitch effects, wireframe globes, brains wired with circuits, humanoid robots, handshakes, lightbulbs, gears, or jigsaw pieces. No isometric or aerial three-quarter view. No busy collage: one hero idea, photographed clearly, with real air around it.`;

/**
 * The complete prompt for one card. Everything except the CARD block is
 * byte-identical across the set, and that invariance is the whole point.
 */
export function buildPosterPrompt({ eyebrow, headline, scene, note }) {
  const lines = headline
    .map((line, index) => `   line ${index + 1}: ${line}`)
    .join("\n");

  return `CONSTRUCT COMPUTER — SOCIAL CARD SYSTEM
You are shooting one card from a set of thirty-four. Every card is the cover of the same technology magazine: the same studio, the same lighting rig, the same typeface, the same layout grid. Only the object being photographed and the words in the headline change. The cards are seen side by side, where any drift is obvious, so follow this exactly.

CANVAS
16:9 landscape, filling the frame edge to edge. No border, no frame, no rounded corners, no mockup presentation, no drop shadow around the canvas itself.
The top 4% and the bottom 4% of the frame will be cropped away before publishing. Keep every letter and the whole of the hero object inside the middle 92%.

${STUDIO}

${IN_WORLD_TEXT}

${TYPOGRAPHY.replace("{{EYEBROW}}", eyebrow).replace("{{HEADLINE}}", lines)}

LAYOUT
The headline occupies the lower left of the frame; the photograph is staged so its subject sits in the right 52% and the upper half, clear of the type. The mascot is the hero and is rendered large, at roughly 40% of the frame height, with the pool of light directly behind it. Any second object sits slightly behind or beside it, at visibly lower brightness. The lower left of the frame falls away to near-black, so the white type always sits on deep, even colour.

CARD — the only part that differs between cards in this set
${scene}${note ? `\n\n${note}` : ""}

${FORBIDDEN}

OUTPUT
One finished 16:9 card obeying every rule above, photographed convincingly, with the four text elements rendered sharply and spelled exactly as given.`;
}

export function promptHeader() {
  return `# Social card prompts

Generated by \`pnpm og:prompts\`. Do not edit by hand: edit
\`app/content/og-poster.ts\` (what each card photographs) or
\`scripts/og/poster.mjs\` (the system) and regenerate.

\`pnpm og:generate\` sends these to Gemini automatically. This file exists for
generating by hand in a chat UI, and for reading what the set is actually
asking for.

**Every generation must attach these references**, in this order:

${posterReferences()
  .map(({ file, note }) => `1. \`${file}\` — ${note}`)
  .join("\n")}

The style plate is the one that matters. Prose describes a look; an approved
card *is* the look, and a run without it will drift.

Save each result to \`assets/og/poster/<name>.webp\` (16:9, at least 1600 wide),
then run \`pnpm og\` to crop and publish into \`public/og/\`.
`;
}
