import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home-seo.tsx"),
  route("about", "routes/about.tsx"),
  route("careers", "routes/careers.tsx"),
  route("affiliates", "routes/affiliates.tsx"),
  route("editorial-policy", "routes/editorial-policy.tsx"),
  route("support", "routes/support.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("blog", "routes/blog-index.tsx"),
  route("blog/tag/:tag", "routes/tag.tsx"),
  route("blog/:slug", "routes/blog-post.tsx"),
  route("authors", "routes/authors.tsx"),
  route("authors/:id", "routes/author.tsx"),
  route("login", "routes/login.tsx"),
  route("account", "routes/account.tsx"),
  // Campaign landing page. Prerendered but deliberately kept out of
  // canonicalRoutes so it stays out of the sitemap and doesn't compete with `/`
  // in search — same treatment as /login and /account.
  route("launch", "routes/launch.tsx"),
  // `/404` is deliberately NOT its own route. finalize-build.mjs promotes the
  // prerendered /404 output to build/client/404.html, which Cloudflare then
  // serves (with a real 404 status) at every unmatched URL. Those URLs resolve
  // to the splat route, so the prerendered HTML has to be built from the splat
  // route too. When /404 had its own module the payload said `routes/not-found`
  // while the router resolved `routes/catch-all`, so hydration could not match
  // and the client re-rendered the page beneath the prerendered copy — two
  // headers, one pre-auth and one post-auth.
  route("*", "routes/catch-all.tsx"),
] satisfies RouteConfig;
