import { AuthorsIndexPage } from "../features/content/resource-pages";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = () => {
  const route = getRoute("/authors");
  return route ? routeMeta(route) : notFoundMeta;
};

export default function AuthorsRoute() {
  return <AuthorsIndexPage />;
}
