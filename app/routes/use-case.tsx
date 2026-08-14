import type { Route } from "./+types/use-case";
import { UseCasePage } from "../features/content/use-case-pages";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = ({ params }: Route.MetaArgs) => {
  const route = getRoute(`/use-cases/${params.slug}`);
  return route ? routeMeta(route) : notFoundMeta;
};

export default function UseCaseRoute({ params }: Route.ComponentProps) {
  return <UseCasePage slug={params.slug} />;
}
