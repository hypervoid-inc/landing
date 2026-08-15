/**
 * Brand reference images, attached to generations that are not social cards.
 *
 * The labels matter as much as the images. Unlabelled, the model averages every
 * reference into one mood and the mascot drifts; told which image is the object
 * and which is only the material, it treats them differently. Order matters
 * too, so the two that fix the mascot come first.
 *
 * The turnaround leads. It replaced `public/icon-512.png`, which was one flat
 * view — not enough to pin a solid, so the model invented its depth afresh
 * every time — and whose own canvas clips the left and right lobes off the
 * silhouette it was there to establish.
 *
 * The dark social banners (`scripts/generate-social-card.mjs`) and the asset
 * retheme (`scripts/retheme-asset.mjs`) read these. Route cards do not: they
 * have their own, style-plate-first list in `scripts/og/poster.mjs`.
 */
export const referenceImages = [
  {
    file: "assets/refs/mascot-sheet.png",
    note: "THE MASCOT, and the thing to get right. Seven views of one real object, turning: the large one at the left is its canonical front. Its outline is a rounded square as wide as it is tall with one soft lobe bulging from each of the four corners, reading as a square first, never pinched or bone-shaped between them. It is a soft-bodied solid, convex everywhere, with two upright deep-navy capsule eyes side by side in the centre of its front. Match this exactly.",
  },
  {
    file: "public/assets/landing/pricing/enterprise-agent.webp",
    note: "The mascot's material as the brand renders it: soft, milky, semi-opaque pale ice-blue with one gentle highlight. Match the material, not this image's angle or composition.",
  },
  {
    file: "public/assets/landing/features/automations-poster.webp",
    note: "Material and atmosphere: frosted glass panels, pale circuit traces, cyan light falling off to white.",
  },
  {
    file: "public/assets/landing/features/integrations.webp",
    note: "The supporting vocabulary of floating rounded chips and app tiles.",
  },
  {
    file: "public/assets/landing/features/cloud-control-poster.webp",
    note: "Glass surface treatment and the soft cyan-to-white gradient.",
  },
  {
    file: "public/assets/landing/pricing/enterprise-rings.webp",
    note: "Dashed concentric orbit rings and the soft bloom, at the right subtlety.",
  },
];
