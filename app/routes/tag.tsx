import type { Route } from "./+types/tag";
import { TagPage } from "../features/content/resource-pages";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = ({ params }: Route.MetaArgs) => {
  const route = getRoute(`/blog/tag/${params.tag}`);
  return route ? routeMeta(route) : notFoundMeta;
};

export default function TagRoute({ params }: Route.ComponentProps) {
  return <TagPage tag={params.tag} />;
}
