import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home-seo.tsx"),
  route("about", "routes/about.tsx"),
  route("careers", "routes/careers.tsx"),
  route("editorial-policy", "routes/editorial-policy.tsx"),
  route("support", "routes/support.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("blog", "routes/blog-index.tsx"),
  route("blog/:slug", "routes/blog-post.tsx"),
  route("404", "routes/not-found.tsx"),
  route("*", "routes/catch-all.tsx"),
] satisfies RouteConfig;
