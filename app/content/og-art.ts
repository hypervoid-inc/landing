/**
 * What the generated artwork on each OG image actually depicts.
 *
 * Style, palette, lighting, and the mascot are fixed by the style contract in
 * `scripts/og/prompt.mjs` and are deliberately absent here — this file only
 * answers "what is in the picture", so two posts can never drift apart on
 * anything but subject. Keys are OG names (see `ogName` in `route-manifest`).
 *
 * Write subjects as concrete staged scenes, not concepts: an image model can
 * draw "two glass panels on a light balance" and cannot draw "cost efficiency".
 */
export const ogArtSubjects: Record<string, string> = {
  home: "The mascot at the centre of a bright workspace, a tall glass panel behind it holding a calm stack of files and a schedule strip, small rounded app tiles orbiting on dashed rings. One desk that never resets.",

  about:
    "Three glass panels of slightly different heights standing together on a soft cyan plinth, the mascot resting in front of them. Quiet and architectural, a company rather than a product.",
  careers:
    "An empty rounded glass seat-shaped panel beside the mascot, one warm cyan bloom lighting the space where someone would sit, and an open doorway of light behind it.",
  "editorial-policy":
    "A single upright glass sheet with a fine cyan checkmark etched into it and a second fainter sheet behind showing the same shape mid-revision. The mascot looks up at both.",
  support:
    "The mascot leaning toward a floating frosted speech-bubble panel, a soft ring of light bridging the two, one small chip below carrying a faint lifebuoy glyph.",
  privacy:
    "A sealed glass vault-cube with a soft cyan padlock glyph glowing inside it and the mascot standing beside it, faint dashed rings marking a boundary nothing crosses.",
  terms:
    "A tall folded glass document with three faint ruled bands and a cyan seal disc at its base, the mascot beside it at desk height.",

  blog: "A loose fan of frosted glass cards floating in a shallow arc, each a slightly different pale cyan tint, the mascot hovering in front of the nearest one. A library caught mid-shuffle.",

  "blog-how-to-choose-an-ai-agent-platform-for-your-team":
    "An upright glass scorecard panel with six softly glowing evaluation rows, three small candidate cubes weighed on a beam of light beneath it, the mascot studying the result.",
  "blog-build-internal-tools-with-construct":
    "The mascot assembling a small glass app window out of floating rounded blocks that snap together along cyan guide lines, one finished block glowing apart from the rest to show the last good build held safe.",
  "blog-ai-agent-vs-zapier":
    "A split scene: on the left a rigid chain of three identical chips running along one straight rail, on the right the mascot inside a soft bloom drawing its own branching path of light between scattered tiles. The right side is brighter.",
  "blog-ai-agent-vs-virtual-assistant":
    "Two glass panels balanced on a beam of light, one stacked with coin-like discs and a clock face, the other holding a single luminous mascot with a continuous ribbon of activity trailing behind it.",
  "blog-ai-agent-memory":
    "The mascot inside a shallow dome of concentric dashed rings with small frosted memory cards in orbit, two cards pulled forward and lit cyan, one dimmed and drifting outward. A mind that keeps, corrects, and forgets on purpose.",
  "blog-ai-employee":
    "The mascot at a glass workstation: a curved panel of task tiles in front of it, a small file tray, a calendar chip, and a mail pill, all threaded together by thin cyan traces. It is working, not waiting.",
  "blog-ai-workflow-automation":
    "One luminous cyan track running left to right through four rounded glass stations with a repeat-arrow ring looping back at the end, the mascot riding the middle station.",
  "blog-construct-vs-chatgpt":
    "On one side a single frosted chat bubble, elegant and empty; on the other the mascot surrounded by working panels, files, and app tiles wired with cyan traces. The bloom rises on the working side.",
  "blog-construct-vs-coding-agents":
    "Two glass forms side by side: a narrow deep column etched with bracket glyphs, and a wide low platform carrying mail, calendar, browser, and file tiles with the mascot standing on it. Breadth beside depth.",
  "blog-construct-vs-copilot":
    "Two walled glass gardens, each sealed under its own tinted dome, and between them the mascot standing in open white light with connector traces reaching into both.",
  "blog-construct-vs-diy":
    "On the left a heap of loose unconnected parts, cables, brackets, half-panels, under a dim haze; on the right those same parts assembled into one clean glass cabinet with the mascot lit inside it.",
  "blog-construct-vs-zapier":
    "Three rigid parallel rails of identical linked chips running straight through the frame, and above them the mascot on a soft floating platform choosing which rail to touch. Determinism below, judgement above.",
  "blog-what-is-an-ai-employee":
    "The mascot rendered larger and more finished than usual, centred, a faint glass badge chip floating beside it and a soft ring of completed task ticks behind. Essentially a portrait.",
  "blog-chat-assistants-vs-ai-employees":
    "A row of small talking-bubble chips fading away to the left and resolving on the right into the mascot holding a finished glass document marked with a cyan tick. Talk becoming output.",

  authors:
    "Three frosted glass profile discs floating at slightly different depths above a soft cyan bloom, each carrying a faint quill glyph, the mascot small at the front.",
  "authors-ankush":
    "A single frosted glass profile disc lit from behind with a fine cyan quill glyph resting across it and the mascot small at its base. One writer's mark.",
  "authors-nischal":
    "A frosted glass profile disc tilted three-quarters with two faint article cards fanned out behind it, the mascot hovering at its edge.",
  "authors-construct-team":
    "Three overlapping glass discs merging into a single silhouette with the mascot centred inside them, a byline that is a team rather than a person.",

  "blog-tag-ai-agent":
    "A cluster of small frosted tag-shaped chips orbiting the mascot on dashed rings, the nearest chip pulled forward and lit cyan with a faint compass-needle glyph on it.",
  "blog-tag-ai-employee":
    "A cluster of frosted tag chips orbiting the mascot, the forward chip lit cyan and carrying a faint badge glyph while the rest recede into white.",
  "blog-tag-chatgpt":
    "A cluster of frosted tag chips orbiting the mascot, the forward chip lit cyan with a faint speech-bubble glyph, the trailing chips dimmer and out of focus.",
  "blog-tag-comparison":
    "A cluster of frosted tag chips orbiting the mascot, the forward chip lit cyan with a faint balance-scale glyph and two chips behind it held level with each other.",
  "blog-tag-product":
    "A cluster of frosted tag chips orbiting the mascot, the forward chip lit cyan with a faint rounded app-window glyph on its face.",
  "blog-tag-workflow-automation":
    "A cluster of frosted tag chips orbiting the mascot with a short cyan track threading through them, the forward chip lit and carrying a faint loop-arrow glyph.",
  "blog-tag-zapier":
    "A cluster of frosted tag chips orbiting the mascot, the forward chip lit cyan with a faint lightning-bolt glyph and set on a short straight rail.",
};

/**
 * Artwork fills the whole card, with the type set over a scrim. Full-bleed is
 * the only layout in use: side by side, a small tile floating in white simply
 * did not read at the size these images are actually seen.
 *
 * @deprecated The square-tile layout is retired and nothing is wired to it. The
 * code path still exists behind `--layout tile` so it can be revived without
 * being rebuilt — see `docs/og-images.md`. Listing a route here does nothing on
 * its own; `ogLayout` no longer consults it.
 */
export const ogTiled: readonly string[] = [];

/**
 * Kept as a function, and kept taking a name, so per-route layouts can come
 * back without every caller changing shape.
 */
export function ogLayout(name: string): "full" | "tile" {
  return ogTiled.includes(name) ? "tile" : "full";
}

export function ogArtSubject(name: string): string | undefined {
  return ogArtSubjects[name];
}
