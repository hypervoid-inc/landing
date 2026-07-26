import { TermsPage } from "../features/content/terms-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";
export const meta = () => routeMeta(getRoute("/terms")!);
export default TermsPage;
