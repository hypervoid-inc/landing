/**
 * Brand reference images, attached to generations that are not social cards.
 *
 * The labels matter as much as the images. Unlabelled, the model averages every
 * reference into one mood and the mascot drifts; told which image is the logo
 * and which is only the material, it treats them differently. Order matters
 * too, so the two that fix the mascot come first.
 *
 * The dark social banners (`scripts/generate-social-card.mjs`) and the asset
 * retheme (`scripts/retheme-asset.mjs`) read these. Route cards do not: they
 * have their own, style-plate-first list in `scripts/og/poster.mjs`.
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
