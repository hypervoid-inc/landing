import type { Config } from "@react-router/dev/config";
import { canonicalRoutes } from "./app/lib/route-manifest";

export default {
  ssr: false,
  // Auth shells and the campaign page are prerendered but excluded from the
  // sitemap (see route-manifest).
  prerender: [
    ...canonicalRoutes.map(({ path }) => path),
    "/login",
    "/account",
    "/launch",
    "/embed",
    "/embed1",
    "/embed2",
    "/404",
  ],
} satisfies Config;
