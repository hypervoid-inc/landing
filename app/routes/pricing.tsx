import { PricingPage } from "../features/landing/pricing-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";

export const meta = () => routeMeta(getRoute("/pricing")!);
export default PricingPage;
