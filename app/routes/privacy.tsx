import { PrivacyPage } from "../features/content/privacy-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";
export const meta = () => routeMeta(getRoute("/privacy")!);
export default PrivacyPage;
