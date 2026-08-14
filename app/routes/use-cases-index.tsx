import { UseCaseIndexPage } from "../features/content/use-case-pages";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";

export const meta = () => routeMeta(getRoute("/use-cases")!);
export default UseCaseIndexPage;
