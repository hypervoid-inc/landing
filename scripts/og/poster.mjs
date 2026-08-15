/**
 * The design system for Construct's social cards.
 *
 * Every card is one photograph: a real physical object and the Construct
 * mascot, shot together in a bright, seamless, paper-white studio, with the
 * type set over the frame afterwards.
 *
 * The model no longer draws the words. It photographs the objects and leaves
 * the type regions empty; `scripts/og/typeset.mjs` sets CONSTRUCT, the badge,
 * the headline and the domain at exact pixel positions at publish time. That
 * split is what fixed the set's typography — see that file for what it replaced.
 * What is left here is the harder half: making several dozen photographs look like
 * one shoot.
 *
 * Three levers hold that together, in order of how much they actually do:
 *
 *   1. `assets/refs/mascot-sheet.png` — the mascot's real turnaround, attached
 *      first on every call. The shape is the thing that drifted worst, and a
 *      shape is fixed with images, not with adjectives.
 *   2. `assets/og/style/master.webp` — one approved photograph, attached second
 *      as the studio, the light, and the staging to copy.
 *   3. This contract, sent byte-identical every time.
 *
 * Only the per-route entry in `app/content/og-poster.ts` changes between cards.
 *
 * The direction is deliberate and was chosen against alternatives: real objects
 * from the working-computer world of roughly 1995 to 2005, photographed on a
 * bright table, in the landing page's own palette. The failure mode this set
 * exists to avoid is the default one — a swarm of glowing translucent UI panels
 * and dashed orbit rings on a gradient, which is what every image model reaches
 * for and what every AI company already looks like. The contract forbids it by
 * name, because asking nicely does not work.
 *
 * If one card comes out wrong, fix its scene. Only edit the contract when the
 * whole set should change, and regenerate everything after, or the set stops
 * matching itself.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RESERVED } from "./typeset.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** Bump when the contract changes, to mark every committed card stale. */
export const POSTER_VERSION = 4;

/**
 * Gemini offers no 1.91:1, so cards are rendered at the nearest wider ratio and
 * centre-cropped down to 1200x630. That eats 3.4% off the top and the bottom,
 * which is why the contract reserves a safe band.
 */
export const POSTER_ASPECT = "16:9";

/** The approved photograph, attached to every later call as the one to match. */
export const stylePlatePath = path.join(root, "assets/og/style/master.webp");

/**
 * The mascot's real turnaround, cut from `assets/refs/construct-rotate.gif` by
 * `scripts/og/mascot-sheet.mjs`.
 *
 * This replaced `public/favicon.png`, which was the reference for the first
 * set and was wrong in two ways at once: one flat view cannot pin a solid, so
 * the model invented the depth afresh on every card, and the favicon's own
 * canvas clips the left and right lobes — the model was being shown a cut-off
 * silhouette and asked to keep it intact. Six cards came back as domes,
 * lobeless squircles, or blobs with limbs.
 */
const mascotReference = {
  file: "assets/refs/mascot-sheet.png",
  note: "THE MASCOT, and the single most important thing to get right. Seven photographs of ONE real moulded object — the large one at the left is its front, and the six beside it are the same object turned slightly so you can see its thickness. Photograph this exact object. Copy its outline, its proportions, its depth, and the size and placement of its two eyes directly from these pictures. It reads as a square with four soft corner bulges, as wide as it is tall, broad and full through the middle. It is an inanimate product, not a character: it has no limbs and never poses. Do not restyle it and do not improve it.",
};

/**
 * Brand references, in weight order. Everything here is free of people: the
 * poster references in `assets/refs/` that feature a model are deliberately
 * left out, because a face bleeding into a social card is the one mistake that
 * cannot be shipped.
 *
 * `magazine-cover.png` used to lead this list and is now gone from it. It is a
 * beautiful reference and it was the single strongest source of the thing this
 * rebase set out to remove: a deep saturated blue ground and a hard dramatic
 * rim light, on a set that is now bright, pale, and soft. A reference fights
 * the contract or supports it, and that one had started fighting.
 */
const brandReferences = [
  {
    file: "assets/refs/sys-requirements.png",
    note: "THE PALETTE AND THE FINISH. A pale, softly lit, near-white studio; a real product photographed calmly with no drama; gentle contact shadows; the mascot reading as a physical object rather than a graphic. Match this brightness, this restraint, and this quality of light exactly. Do not copy its cream tint, its ruled boxes, its layout, its hard-edged rendering of the mascot, or any of its words.",
  },
  {
    file: "assets/refs/realistic-slip.png",
    note: "PHYSICAL CRAFT. One real object photographed against a plain bright seamless wall, with honest material, honest paper, and real air around it. Match this respect for the object and this amount of empty space. Do not copy its grey tint, its layout, or any of its words.",
  },
  {
    file: "public/assets/landing/pricing/enterprise-agent.webp",
    note: "The mascot's material as the brand renders it: soft, milky, semi-opaque pale ice-blue, one gentle diffuse highlight, nothing visible through it. Match the material and the softness only. Do not copy this image's angle, its white tray, its background rays, or its composition.",
  },
];

/**
 * What is attached to a request.
 *
 * The mascot goes first and the style plate second. That order was the other
 * way round at first, on the reasoning that matching one approved card is a
 * stronger instruction than any description of one — which is true of the
 * staging, and turned out to be the problem. The plate's mascot is one lit,
 * partly occluded view of the character rather than its full form, and cards
 * that copied the plate hardest drifted furthest from the shape. Leading with
 * the turnaround fixes the object while the plate, still second, keeps the room.
 */
export function posterReferences() {
  if (!existsSync(stylePlatePath)) return [mascotReference, ...brandReferences];
  return [
    mascotReference,
    {
      file: path.relative(root, stylePlatePath),
      note: "THE STYLE PLATE — an approved photograph from this exact set. Copy its studio, its background tone and falloff, its light, its exposure, its contact shadows, its depth of field, and how large the mascot sits in the frame. Your photograph must look like it came off the same table on the same afternoon. Take the room and the light from this, but take the mascot's form from reference 1, which outranks it. Only the object being photographed differs. It carries no text, and neither does yours.",
    },
    ...brandReferences,
  ];
}

const percent = (value) => `${Math.round(value * 100)}%`;

const STUDIO_GROUND = `THE STUDIO — identical on every card, never redesign it
A bright, seamless, paper-white studio. The background is near-white #FFFFFF through the upper middle of the frame and cools very gently to a pale blue-white #EFF7F9 toward the outer edges and the lower corners. It is a soft, even, almost shadowless room: one very large diffused source high and slightly front-left, a white bounce on the right, and no other lights. There is no visible floor line, no horizon, and no wall corner — the objects sit on a seamless surface that fades away behind them.
The falloff is gentle and physical. There is no vignette, no spotlight pool, no rays, no starburst, no lens flare, no bloom, and no dark corners anywhere in the frame. Nothing in this photograph is dark: the darkest thing on the card is the mascot's navy eyes and the shadow directly beneath an object.

THE PHOTOGRAPH
A real studio product photograph on a medium-format camera with a 100mm macro at a middling aperture: sharp through the subject, softly and evenly lit, honest materials, and soft-edged contact shadows pooling close under everything that touches the surface. High key, airy, and expensive. Calm rather than dramatic.
Not an illustration, not flat vector, not cel shading, not a painting, not a UI mockup, not a glowing marketing render, and not a dark moody studio.

COLOUR — the landing page's own palette, and nothing else
The ground is white and pale blue-white. On it: warm beige and grey moulded plastic, brushed aluminium, pale steel, off-white printed paper and manila card, and the soft milky ice-blue of the mascot. Brand cyan #01B4C8 appears once at most, small, as an indicator light, a printed label, or a cable. Deep navy #1B3A6B appears only in the mascot's eyes.
No deep or saturated blue ground. No navy, black, or charcoal background. No purple, magenta, orange, red, yellow, green, gold, or iridescent oil-slick. No neon anything.`;

/**
 * The mascot's contract, which is the one part of this file that is true no
 * matter what room the photograph is taken in.
 *
 * Exported separately so a one-off shot in a different studio — see
 * `scripts/generate-social-card.mjs` — can bring its own ground, light, and
 * palette while keeping the object itself word for word identical. The mascot
 * is the thing that drifts, and it should never drift for a reason as
 * incidental as the wall being a different colour.
 */
export const MASCOT = `THE MASCOT — a manufactured object, present and hero on every card
The mascot is a small moulded product that exists in the real world, like a paperweight or a desk toy that came out of a mould. It is NOT a character, NOT a creature, and NOT a mascot costume. It does not act, pose, perch, lean, climb, hold, or react.

HOW IT IS ALWAYS PLACED. It rests flat on the upward-facing surface of the larger object in the scene, the way a paperweight rests on a stack of paper: its whole underside in contact, square to the camera, sitting still and upright. It never stands on the table on its own, never straddles or sits astride anything, never hangs over an edge, and nothing of it dangles below the surface it rests on. Its contact shadow is a soft patch directly under it.
HOW BIG IT IS. Large. It is the hero of the photograph and it fills roughly a third of the frame's height — about as wide as the surface it is resting on, so it reads as a substantial object in its own right rather than as a small ornament placed on furniture. Photographed straight on at its own level, not looked down upon.

ITS FORM IS GIVEN ENTIRELY BY REFERENCE 1. Copy the object in that image — its outline, its proportions, its thickness, the size and placement of its two eyes — as if you were photographing that exact object again from a slightly different angle. Do not redesign it, do not stylise it, and do not improve it. Read the shape off the picture, not off this paragraph.
The only thing worth saying in words is the one proportion that goes wrong: it reads as a SQUARE first, with four soft bulges at its corners. It is as wide as it is tall, and the body between the lobes stays broad and full.

ITS MATERIAL. A soft, semi-opaque, milky pale ice-blue, the colour of frosted resin or a pale silicone gel. It is matte to satin, never wet-looking: one broad soft diffuse highlight and nothing else. It is NOT clear glass — it does not refract, throws no caustics, has no mirror-bright speculars, and you cannot see through it.

WHAT IT IS NEVER. No arms, no legs, no hands, no feet, no paws, no ears, no tail, no mouth, no nose, no eyebrows, no limbs of any kind. Its four lobes are corners of its own body and are never drawn as limbs or used to sit, straddle, dangle, grip, or hold anything.
It is never two objects joined end to end, never pinched or waisted in the middle, never a bone, dumbbell, cross, X, starfish, bowtie, or four balls on a stalk. It is never a cube, a box, a rounded brick, or a cushion with corners. It is never a cloud, a puff, a blob, a dome, an egg, an oval, a flower with petals, or an animal.
Its two upright deep-navy #1B3A6B capsule eyes are always present, level, the same size, and clearly visible in the middle of its front. A render without them is a failure.`;

/**
 * The prop vocabulary. Exported for the same reason as `MASCOT`: the era and
 * the materials are the brand, and they hold whatever the room is doing.
 *
 * The last sentence is the restraint clause, and it is separated out because a
 * wide banner is the one place it is deliberately relaxed.
 */
export const OBJECTS = `THE OBJECTS — real things, photographed
Everything sharing the frame with the mascot is a tangible object from the world of working computers, roughly 1995 to 2005, in beige and grey moulded plastic, brushed aluminium, steel, and printed paper: desktop towers, hard disk platters, rack units, floppy disks, CD-ROMs, shrink-wrapped software boxes, dot-matrix continuous printout, punched tape, index card drawers, hanging file folders, manila folders, paper trays, desk telephones, clipboards, bound reports, nameplates, ID badges, keyboards, cables. Well used but immaculate.`;

/**
 * The whole studio, assembled. Byte-identical to the single string this
 * replaced, which is what stops the refactor from re-basing all 34 cards.
 */
export const STUDIO = `${STUDIO_GROUND}

${MASCOT}

${OBJECTS} One hero object, two at the very most.`;

/**
 * Writing on the objects themselves is allowed and wanted: it is what makes a
 * reference like `sys-requirements.png` read as a real artifact rather than a
 * render. It is fenced tightly because a garbled label is worse than no label,
 * and it is now the only writing in the frame at all.
 */
export const IN_WORLD_TEXT = `WRITING ON THE OBJECTS — the only writing anywhere in this image
The objects may carry the writing real objects carry: a product name silkscreened on a box, a label on a file tab, a line of print on a page, a moulded logo on a bezel. It should feel manufactured, not annotated.
It must be short — a few words at most — in plain correctly-spelled English, set small in a quiet neutral sans or a monospace, and physically part of the object it sits on. Where a product name is wanted, use CONSTRUCT or CONSTRUCT COMPUTER. Never invent a price, a version number, a year, a rating, or a marketing slogan. Never write a web address. Nothing may be blurred, doubled, half-formed, or nonsense: if a piece of writing cannot be rendered cleanly and legibly, leave the surface blank instead.`;

/**
 * The reserved regions, written from `RESERVED` in `typeset.mjs` so the prompt
 * and the type layer can never disagree about where the words go.
 *
 * Stated as a photographic instruction rather than a layout one. "Compose so
 * the object sits right of centre" is something a photographer can do; "keep
 * 58% clear" is something a model rounds.
 */
const RESERVED_AREAS = `WHERE NOTHING GOES — this photograph carries no type, and has to leave room for it
The finished card has words set over it afterwards, in a separate pass you are not doing. Your job is to photograph the objects so there is somewhere clean to put them. Stage the shot so that:

THE ONE FRAMING RULE, and the easiest one to get wrong:
Picture a vertical line drawn ${percent(RESERVED.columnWidth)} of the way across the frame from the left edge.

  EVERYTHING YOU PHOTOGRAPH SITS ENTIRELY TO THE RIGHT OF THAT LINE.

Nothing crosses it. Not the mascot, not the object it rests on, not a second object, not a corner, not a cable, not a cast shadow, not a highlight, not a blurred edge. If the object is too big to fit to the right of the line, shoot it smaller or from further back until it fits — do not let it stretch across.
Everything to the LEFT of that line is completely empty: plain, smooth, evenly lit pale background, from the top of the frame to the bottom, with nothing in it at all. It is about ${percent(RESERVED.columnWidth)} of the picture and it must read as deliberate, generous air.
Also keep the top ${percent(RESERVED.top)} of the frame clear across the full width. Nothing rises into it.

So the composition is: a wide sweep of empty studio filling the left of the frame, and the mascot on its object sitting compactly in the right-hand portion, well clear of the line.
Do not draw a headline, a logo, a wordmark, a badge, a caption, a URL, a watermark, or any lettering laid over the photograph. There is no text over this image.`;

/**
 * The clause the whole art direction exists for. Every contract in this repo
 * carries it verbatim, whatever room it is shooting in.
 */
export const FORBIDDEN_FILLER = `ABSOLUTELY NOT
Above all: no swarm of floating translucent UI panels, no glowing glass cards hanging in mid-air, no dashed concentric orbit rings, no floating rounded app tiles, no circuit traces, no cyan gradient haze, no particles. That is generic AI-company filler, it is what an image model reaches for by default, and it is the single thing this set exists to avoid. Photograph real objects instead.`;

/** The only clause a differently-lit shot has to replace rather than inherit. */
const FORBIDDEN_BRIGHT = `No dark background of any kind, no navy or black studio, no dramatic rim lighting, no spotlight, and no moody low-key exposure. This is a bright room.`;

export const FORBIDDEN_MASCOT = `The mascot is never rendered as clear glass, crystal, acrylic, chrome, or polished stone, and never as a thin flat-faced slab with a hard edge. It is soft, milky, and inflated.`;

export const FORBIDDEN_FRAME = `No text overlaid on the photograph. No humans, faces, hands, or body parts. No QR codes, price starbursts, rating stars, or year badges. No paper texture, halftone dots, film grain, scan lines, folds, or tears laid over the image. No chrome, gold, or iridescence. No neon cyberpunk, glitch effects, wireframe globes, brains wired with circuits, humanoid robots, handshakes, lightbulbs, gears, or jigsaw pieces. No isometric or aerial three-quarter view.`;

/** Relaxed on a wide banner, which is composed to be dense on purpose. */
const FORBIDDEN_RESTRAINT = ` No busy collage: one hero idea, photographed clearly, with real air around it.`;

export const FORBIDDEN = `${FORBIDDEN_FILLER}
${FORBIDDEN_BRIGHT}
${FORBIDDEN_MASCOT}
${FORBIDDEN_FRAME}${FORBIDDEN_RESTRAINT}`;

/**
 * The complete prompt for one card. Everything except the CARD block is
 * byte-identical across the set, and that invariance is the whole point.
 *
 * `eyebrow` and `headline` are not in the prompt: they are set at publish time
 * and the model never sees them. They stay on the card object so one type
 * describes a card end to end.
 */
export function buildPosterPrompt({ scene, note }) {
  return `CONSTRUCT COMPUTER — SOCIAL CARD SYSTEM
You are shooting one photograph from a set of several dozen. Every card in the set is the same studio, the same lighting rig, the same surface, and the same staging. Only the object being photographed changes. The cards are seen side by side, where any drift is obvious, so follow this exactly.

CANVAS
16:9 landscape, filling the frame edge to edge. No border, no frame, no rounded corners, no mockup presentation, no drop shadow around the canvas itself.
The top 4% and the bottom 4% of the frame will be cropped away before publishing. Keep the whole of the hero object inside the middle 92%.

${STUDIO}

${IN_WORLD_TEXT}

${RESERVED_AREAS}

CARD — the only part that differs between cards in this set
${scene}${note ? `\n\n${note}` : ""}

${FORBIDDEN}

OUTPUT
One finished 16:9 photograph obeying every rule above: bright, pale, calm, convincingly photographic, with the mascot's four-lobed form exactly as reference 1 shows it, and with no type anywhere on it.`;
}

/**
 * References for a repair pass: the card being fixed, then the turnaround.
 *
 * Deliberately just those two. A repair is asked to change one object and copy
 * everything else pixel for pixel, and the style plate and palette references
 * that hold a fresh generation together only give it more reasons to redraw the
 * parts that were already right.
 */
export function repairReferences(card) {
  return [
    {
      file: card,
      note: "THE PHOTOGRAPH TO EDIT. Everything in it except the mascot is already correct and final.",
    },
    mascotReference,
  ];
}

/**
 * The prompt for an image-to-image mascot repair.
 *
 * The mascot's form is the one thing in this system that prose cannot hold.
 * Three rewrites of the description in `STUDIO` produced, in order, a flat
 * glass slab, a pinched bone, and a cube with corner bumps — each fixing the
 * last complaint and introducing a new one, because a paragraph is a lossy way
 * to specify a solid. An edit pass sidesteps the argument: the model is shown
 * the finished photograph and the real object side by side and asked to swap
 * one for the other, which it is far better at than describing either.
 *
 * So the working loop for a card that comes back with a bad mascot is
 * `pnpm og:fix <name>`, not another paragraph in this file.
 */
export function buildRepairPrompt() {
  return `Return reference 1 again, unchanged in every respect except one.

Keep its framing, its crop, its background, its exposure, its white balance, its depth of field, its grain, and every other object in it pixel for pixel identical. Do not restage it, do not relight it, do not recolour it, do not move the camera, and do not add or remove anything.

THE ONE CHANGE. The pale blue object in it is the Construct mascot, and its shape and material are wrong. Replace it with the object shown in reference 2, at the same position, the same size, and the same orientation, sitting on the same surface with the same contact shadow.

Reference 2 is the real object, photographed from seven angles. Copy it directly — its outline, its proportions, its thickness, its material, and the size and placement of its eyes — rather than working from any description of it. In particular:
  • It reads as a SQUARE FIRST, with four soft bulges at its corners, as wide as it is tall and broad and full through the middle. Never pinched or waisted, never two objects joined end to end, never a bone, cross, X, or four balls on a stalk, and never a cube or a rounded box.
  • It is an inanimate moulded product, not a creature. No arms, no legs, no paws, no ears. Its lobes are corners of its body, never limbs, and it never sits on, straddles, grips, or dangles off anything — it is simply set down like a paperweight.
  • Its material is soft, milky, semi-opaque pale ice-blue, matte to satin. Not clear glass, not crystal, not chrome, not wet-looking. Nothing is visible through it.
  • Two deep-navy #1B3A6B eyes, upright rounded capsules, both the same size, sit side by side and level in the middle of its front. They are always present and always clearly visible.

Nothing else in the photograph changes.`;
}

export function promptHeader() {
  return `# Social card prompts

Generated by \`pnpm og:prompts\`. Do not edit by hand: edit
\`app/content/og-poster.ts\` (what each card photographs) or
\`scripts/og/poster.mjs\` (the system) and regenerate.

\`pnpm og:generate\` sends these to Gemini automatically. This file exists for
generating by hand in a chat UI, and for reading what the set is actually
asking for.

**These prompts produce the photograph only.** The wordmark, the badge, the
headline and the domain are set in code by \`scripts/og/typeset.mjs\` when
\`pnpm og\` publishes the card, which is why no headline appears below.

**Every generation must attach these references**, in this order:

${posterReferences()
  .map(({ file, note }) => `1. \`${file}\` — ${note}`)
  .join("\n")}

The first two are the ones that matter. Prose describes a shape and a room;
the turnaround and the plate *are* the shape and the room, and a run without
them will drift.

Save each result to \`assets/og/poster/<name>.webp\` (16:9, at least 1600 wide),
then run \`pnpm og\` to crop, typeset, and publish into \`public/og/\`.
`;
}
