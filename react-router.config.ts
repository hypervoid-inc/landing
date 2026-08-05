import type { Config } from "@react-router/dev/config";
import { canonicalRoutes } from "./app/lib/route-manifest";

export default {
  ssr: false,
  // Auth shells are prerendered but excluded from sitemap (see route-manifest).
  prerender: [
    ...canonicalRoutes.map(({ path }) => path),
    "/login",
    "/account",
    "/404",
  ],
} satisfies Config;
