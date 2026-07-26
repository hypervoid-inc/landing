import { AboutPage } from "../features/content/company-pages";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";
export const meta = () => routeMeta(getRoute("/about")!);
export default AboutPage;
