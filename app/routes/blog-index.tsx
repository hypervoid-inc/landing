import { BlogIndexPage } from "../features/content/blog-index";
import { getRoute } from "../lib/route-manifest";
import { routeMeta } from "../lib/seo";

export const meta = () => routeMeta(getRoute("/blog")!);
export default BlogIndexPage;
