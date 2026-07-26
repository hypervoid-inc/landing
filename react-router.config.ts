import type { Config } from "@react-router/dev/config";
import { canonicalRoutes } from "./app/lib/route-manifest";

export default {
  ssr: false,
  prerender: [...canonicalRoutes.map(({ path }) => path), "/404"],
} satisfies Config;
