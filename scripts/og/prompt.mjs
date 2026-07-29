/**
 * The style contract for Construct's generated OG artwork.
 *
 * Consistency across images comes from three things, in order of how much they
 * matter: the reference images attached to every call, this contract being sent
 * verbatim every time, and the per-post subject line being the only part that
 * changes. Editing the contract re-bases the whole set, so treat it as a design
 * token — if one image is wrong, fix its subject in `app/content/og-art.ts`,
 * not this file.
 *
 * The artwork is always wordless: it is composited into a frame that draws the
 * wordmark, title, and domain as real vector text, so the model never has to
 * render type it would render inconsistently.
 */

/**
 * Sent with every request, each preceded by its own label so the model knows
 * what to take from it rather than averaging all of them into a mood.
 *
 * Order matters — earlier references carry more weight, so the two that fix the
 * mascot come first. Everything here is text-free wherever possible: a
 * reference with words in it is the surest way to get words back out.
 *
 * Gemini 3 Pro Image accepts up to 14; six is enough to pin the material,
 * the mascot, the supporting forms, and the falloff without muddying them.
 */
export const referenceImages = [
  {
    file: "public/assets/landing/pricing/enterprise-agent.webp",
    note: "THE MASCOT, rendered correctly. Match this shape, these proportions, this translucency, and these eyes exactly.",
  },
  {
    file: "public/icon-512.png",
    note: "The mascot again, as a clean logo on transparency. This is its canonical silhouette — four even lobes, two upright navy capsule eyes.",
  },
  {
    file: "public/assets/landing/features/automations.webp",
    note: "Material and atmosphere: frosted glass panels, pale circuit traces, cyan light falling off to white.",
  },
  {
    file: "public/assets/landing/features/integrations.webp",
    note: "The supporting vocabulary of floating rounded chips and app tiles.",
  },
  {
    file: "public/assets/landing/features/cloud-control.webp",
    note: "Glass surface treatment and the soft cyan-to-white gradient.",
  },
  {
    file: "public/assets/landing/pricing/enterprise-rings.webp",
    note: "Dashed concentric orbit rings and the soft bloom, at the right subtlety.",
  },
];

/**
 * Where the artwork sits in the finished card. `tile` is composited into the
 * branded frame's square; `full` fills the whole 1200x630 card with the type
 * overlaid on a scrim, so its left side has to stay quiet enough to read on.
 */
export const layouts = {
  tile: {
    aspectRatio: "1:1",
    canvas:
      "Square 1:1. Artwork runs edge to edge. No border, no frame, no rounded corners, no drop shadow around the canvas itself, no mockup presentation. The outer edges must fall off to pure white, because this image is composited into a white card and any hard edge will read as a sticker pasted on top.",
    composition:
      "One unmistakable focal subject, centred, filling 70-85% of the canvas with only a thin margin of white around it. Fill the frame: this artwork is scaled down into a small tile inside a larger card, so a subject floating small in a sea of white disappears entirely at the size people actually see it. Crop in close and let the composition breathe through its own internal spacing rather than through empty border.",
  },
  full: {
    aspectRatio: "16:9",
    canvas:
      "Wide 16:9 landscape. Artwork runs edge to edge with no border or frame. The top and bottom few percent may be cropped, so keep the subject clear of them.",
    composition:
      "The left 45% of the frame is reserved for type that is set afterwards: keep it near-empty — white, softly lit, no forms, no detail, nothing that would fight a headline placed over it. Stage the focal subject in the right 55%, filling that half generously edge to edge, with its glow spilling leftward into the empty space to tie the halves together.",
  },
};

function contractFor(layout) {
  const { canvas, composition } = layouts[layout];
  return `STYLE CONTRACT — Construct Computer key art. Follow it exactly; it is identical for every image in this set and deviation shows up immediately when the images sit next to each other.

MEDIUM
Soft 3D product key art: clean vector illustration crossed with a frosted-glass 3D render. Marketing-grade, weightless, precise. Not photographic, not painterly, not hand-drawn.

CANVAS
${canvas}

PALETTE — use these values and nothing else
  #FFFFFF  pure white — the dominant value, at least 45% of the canvas
  #F2FCFE  near-white cyan haze
  #E8FAFF  pale cyan wash
  #B6ECFB  light cyan
  #38C6F4  mid cyan
  #01B4C8  brand cyan — accents, edges, and glows only
  #017B89  deep teal — sparingly, for depth at the base of forms
  #1B3A6B  deep navy — the mascot's eyes only, nowhere else
No purple, magenta, orange, red, yellow, or green anywhere. No black. No dark background.

LIGHT
Bright, airy, high key. One soft bloom behind the focal subject, light falling off to pure white at every edge. No hard shadows, no cast shadows on a ground plane, no vignette, no dark corners. Forms glow gently from within.

CAMERA
Straight-on, level with the subject, like a product shot on white. Never isometric. Never a three-quarter aerial view. Never looking down onto a ground plane, platform, dais, or podium — the forms float in white space, and nothing rests on a visible surface. No horizon line, no dutch angle, no perspective distortion, no extreme close-up.

DEPTH AND DRAMA
These images have to stop a thumb mid-scroll, so airy must never become weak. Build three clear planes: a crisp, high-contrast focal subject in front; mid-ground forms at visibly reduced contrast; a background that dissolves into white. Give the focal subject a luminous rim light and a saturated cyan bloom directly behind it, so one region of the frame is genuinely intense against all that white. Keep that glow soft and volumetric — light diffusing through air and glass, never a hard neon outline traced around a shape, never an electric strip-light edge. Scale reads better than quantity: one large, confident, beautifully lit form beats five small ones.

THE MASCOT — include it unless the SUBJECT says otherwise
A small creature made of thick clear glass, shaped like a four-lobed rounded clover: a puffy square cloud with one soft bump at each corner. It is genuinely transparent — whatever sits behind it is visibly distorted and refracted through its body, the way a solid glass paperweight bends what is behind it. Pale ice-blue tint, a bright specular highlight on the upper left, and a softer bounce highlight below. Never an opaque white blob, never matte, never a flat silhouette. Two vertical rounded-capsule eyes in deep navy #1B3A6B, set close together near the centre, both the same size and perfectly upright. No mouth, no nose, no eyebrows, no limbs, no hands, no feet, no accessories. Calm and attentive — never cute-cartoonish, never robotic, never anthropomorphised. Match the attached reference exactly, including its proportions; it is a logo, not a character to reinterpret.

SUPPORTING FORMS — draw only from this vocabulary
Rounded-rectangle glass panels with thin white borders and a soft inner glow. Thin circuit traces running at 90 and 45 degrees only, pale cyan, low contrast, never crossing the focal subject. Faint dashed concentric orbit rings. Small pill-shaped chips and rounded app tiles. Soft volumetric cloud forms. Everything floats with generous air around it.

COMPOSITION
${composition}

ABSOLUTELY NOT
No text, letters, numbers, words, labels, captions, UI copy, watermarks, or logos of any kind — the frame supplies all type, and any rendered text will be discarded with the image. No humans, faces, hands, or body parts. No photorealism, film grain, noise, lens flare, or bokeh. No dark or navy backgrounds. No neon cyberpunk, glitch effects, isometric grids, wireframe globes, brains wired with circuits, humanoid robots, handshakes, lightbulbs, gears, or jigsaw pieces. No busy collage. No flat, evenly-lit, washed-out composition where every element sits at the same depth and nothing is the subject. No isometric or aerial three-quarter view, and no platform, dais, podium, pedestal, plinth, or floor plane beneath the subject — everything floats in open white space.`;
}

export const styleContract = contractFor("tile");

const kindNotes = {
  home: "This is the site's front door — the most complete and confident image in the set.",
  page: "A company page. Keep it calmer and sparser than the editorial images.",
  "blog-index":
    "An index over the whole library. Suggest plurality without clutter.",
  "blog-post": "An article illustration. One idea, staged clearly.",
  guide: "A guide illustration. Favour a sense of structure and sequence.",
  comparison:
    "A comparison illustration. Two sides may be shown, but they must share one lighting setup and one palette — never split the canvas with a hard divider or a seam.",
  "author-index": "An index of bylines. Abstract, no faces.",
  author:
    "A byline mark. Abstract, no faces, no portraits, no silhouettes of people.",
  tag: "A topic archive. It must be legible as one of a family of near-identical tag images that differ only in the highlighted glyph.",
};

/**
 * The complete, paste-ready prompt for one route. Everything above the SUBJECT
 * line is byte-identical across every image sharing a layout; that invariance
 * is the whole point.
 */
export function buildPrompt({ name, kind, title, subject, layout = "tile" }) {
  const destination =
    layout === "full"
      ? `assets/og/full/${name}.png`
      : `assets/og/art/${name}.png`;
  return `${contractFor(layout)}

CONTEXT
This image illustrates "${title}" on construct.computer. ${kindNotes[kind] ?? ""}

SUBJECT — the only thing that changes between images in this set
${subject}

OUTPUT
A single wordless illustration obeying the style contract above. Save it as ${destination}`;
}

export function promptHeader() {
  return `# OG artwork prompts

Generated by \`pnpm og:prompts\`. Do not edit by hand — edit
\`app/content/og-art.ts\` (subjects) or \`scripts/og/prompt.mjs\` (style) and
regenerate.

\`pnpm og:generate\` sends these to Gemini automatically. This file exists for
generating by hand in a chat UI, and for reviewing what the set is actually
asking for.

**Every generation must attach these reference images**, in this order:

${referenceImages.map(({ file, note }) => `1. \`${file}\` — ${note}`).join("\n")}

They carry the mascot's exact geometry, the glass material, and the cyan
falloff far more reliably than words do. A prompt run without them will drift.

Save each result to \`assets/og/full/<name>.png\`, then run \`pnpm og\` to
draw the type over it and publish into \`public/og/\`.
`;
}
