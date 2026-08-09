import { SubProcessorsPage } from "../features/content/sub-processors-page";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";

export const meta = () => routeMeta(getRoute("/sub-processors")!);
export default SubProcessorsPage;
