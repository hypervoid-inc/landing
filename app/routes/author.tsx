import type { Route } from "./+types/author";
import { AuthorPage } from "../features/content/resource-pages";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = ({ params }: Route.MetaArgs) => {
  const route = getRoute(`/authors/${params.id}`);
  return route ? routeMeta(route) : notFoundMeta;
};

export default function AuthorRoute({ params }: Route.ComponentProps) {
  return <AuthorPage id={params.id} />;
}
