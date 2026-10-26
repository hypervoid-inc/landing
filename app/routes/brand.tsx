import { BrandPage } from "../features/brand/brand-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";
export const meta = () => routeMeta(getRoute("/brand")!);
/** Where an agent handed this page finds it as data (Markdown is in `routeMeta`). */
export const links = () => [
  { rel: "alternate", type: "application/json", href: "/brand/brand.json" },
];
export default BrandPage;
