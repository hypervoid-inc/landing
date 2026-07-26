import { LandingPage } from "../features/landing/landing-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";

export const meta = () => routeMeta(getRoute("/")!);
export default LandingPage;
