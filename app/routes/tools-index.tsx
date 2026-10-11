import { ToolsIndexPage } from "../features/tools/tools-index-page";
import { getRoute } from "../lib/route-manifest";
import { notFoundMeta, routeMeta } from "../lib/seo";

export const meta = () => {
  const route = getRoute("/tools");
  return route ? routeMeta(route) : notFoundMeta;
};

export default function ToolsIndexRoute() {
  return <ToolsIndexPage />;
}
