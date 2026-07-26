import type { Route } from "./+types/blog-post";
import { ResourcePage } from "../features/content/resource-pages";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = ({ params }: Route.MetaArgs) => {
  const route = getRoute(`/blog/${params.slug}`);
  return route ? routeMeta(route) : notFoundMeta;
};
export default function BlogPostRoute({ params }: Route.ComponentProps) {
  return <ResourcePage slug={params.slug} />;
}
