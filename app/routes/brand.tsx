import { BrandPage } from "../features/brand/brand-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";
export const meta = () => routeMeta(getRoute("/brand")!);
export default BrandPage;
