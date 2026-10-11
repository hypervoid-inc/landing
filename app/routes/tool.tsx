import type { Route } from "./+types/tool";
import { ToolPage } from "../features/tools/tool-page";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = ({ params }: Route.MetaArgs) => {
  const route = getRoute(`/tools/${params.slug}`);
  return route ? routeMeta(route) : notFoundMeta;
};

export default function ToolRoute({ params }: Route.ComponentProps) {
  return <ToolPage slug={params.slug} />;
}
