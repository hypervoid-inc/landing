import path from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { createServer } from "vite";

/**
 * One card per canonical route, assembled from the app's own route manifest and
 * poster content.
 *
 * Both the generator and the publisher need the same list, and reading it
 * through Vite rather than duplicating it is what stops a new post from having
 * a page but no social card. A missing entry is fatal here rather than at the
 * point of use, so the failure names the file to edit.
 */
export async function loadCards() {
  const vite = await createServer({
    root: process.cwd(),
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    appType: "custom",
  });
  try {
    const { canonicalRoutes, ogName, routeDisplayTitle } =
      await vite.ssrLoadModule("/app/lib/route-manifest.ts");
    const { ogPosters, posterEyebrow } = await vite.ssrLoadModule(
      "/app/content/og-poster.ts",
    );

    return canonicalRoutes.map((route) => {
      const name = ogName(route.path);
      const card = ogPosters[name];
      if (!card) {
        throw new Error(
          `${name}: no card. Add a headline and a scene to app/content/og-poster.ts.`,
        );
      }
      return {
        name,
        kind: route.kind,
        title: routeDisplayTitle(route),
        eyebrow: posterEyebrow(route.kind),
        headline: card.headline,
        scene: card.scene,
        fullFrame: Boolean(card.fullFrame),
        // `/og/<stem>.jpg` — the route's own name unless MDX frontmatter named
        // a different image, in which case that name is published instead.
        stem: path.basename(new URL(route.image).pathname, ".jpg"),
      };
    });
  } finally {
    await vite.close();
  }
}
