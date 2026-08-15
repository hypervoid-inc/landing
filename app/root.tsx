import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { SmoothScroll } from "./components/layout/smooth-scroll";
import { Analytics } from "./features/analytics/analytics";
import { AuthProvider } from "./features/auth/auth-provider";
import { BetaAccessProvider } from "./features/landing/beta-access";
import { ClippyCta } from "./features/landing/clippy-cta";
import { ProductHuntChrome } from "./features/product-hunt/product-hunt-chrome";
import "./app.css";
import "./features/product-hunt/product-hunt.css";

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/favicon-32.png?v=3",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/favicon-16.png?v=3",
  },
  { rel: "shortcut icon", href: "/favicon.ico?v=3" },
  {
    rel: "apple-touch-icon",
    sizes: "180x180",
    href: "/apple-touch-icon.png?v=3",
  },
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "alternate", type: "application/rss+xml", href: "/rss.xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#01b4c8" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var gs = document.createElement("script");
  gs.src = "https://join.construct.computer/pr/js";
  gs.type = "text/javascript";
  gs.async = true;

  gs.onload = gs.onreadystatechange = function () {
    var rs = this.readyState;
    if (rs && rs !== "complete" && rs !== "loaded") return;
    try {
      growsumo._initialize("pk_oUN7pQqNLRLHP4dyTz9piNx5v6mxI7YM");
      if (typeof growsumoInit === "function") growsumoInit();
    } catch (e) {}
  };

  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(gs, s);
})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BetaAccessProvider>
        <SmoothScroll />
        <ProductHuntChrome />
        <Outlet />
        <ClippyCta />
      </BetaAccessProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
