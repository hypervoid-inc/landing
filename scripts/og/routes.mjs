import path from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { createServer } from "vite";

/**
 * One card per canonical route, assembled from the app's own route manifest and
 * card content: a rendered card from `og-cards.ts` when the route has one,
 * otherwise its hand-made card registered in `og-poster.ts`.
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
    const { canonicalRoutes, upcomingRoutes, ogName, routeDisplayTitle } =
      await vite.ssrLoadModule("/app/lib/route-manifest.ts");
    const { ogPosters, posterEyebrow } = await vite.ssrLoadModule(
      "/app/content/og-poster.ts",
    );
    const { ogCards, cardContext } = await vite.ssrLoadModule(
      "/app/content/og-cards.ts",
    );

    // Scheduled posts get their card now, so it is ready on the day they go live.
    const routes = [...canonicalRoutes, ...upcomingRoutes];
    return routes.map((route) => {
      const name = ogName(route.path);
      const rendered = ogCards[name];
      if (rendered) {
        return {
          name,
          kind: route.kind,
          title: routeDisplayTitle(route),
          card: rendered,
          context: cardContext(route, routes, rendered),
          stem: path.basename(new URL(route.image).pathname, ".jpg"),
        };
      }
      const card = ogPosters[name];
      if (!card) {
        throw new Error(
          `${name}: no card. Add one to app/content/og-card-content.ts.`,
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
        // `/og/<stem>.jpg`, the route's own name unless MDX frontmatter named
        // a different image, in which case that name is published instead.
        stem: path.basename(new URL(route.image).pathname, ".jpg"),
      };
    });
  } finally {
    await vite.close();
  }
}
