import { Link } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { tools, type ToolEntry } from "../../content/tools";
import { getRoute, siteUrl } from "../../lib/route-manifest";
import { Breadcrumbs } from "./tool-breadcrumbs";
import { CheckIcon } from "./tool-motion";

/**
 * `/tools/`, the hub. Static on purpose: everything here is in the
 * prerendered HTML, and each card is one link to a tool page, which is where
 * the single call to action lives.
 */

const promises = [
  "No account",
  "Runs in your browser",
  "Works on your phone",
  "AI agents can use them",
] as const;

const sectionHeading =
  "font-geist text-[26px] italic leading-tight tracking-[-0.015em] text-[#4e4646] sm:text-[30px]";

function ToolCard({ tool }: { tool: ToolEntry }) {
  const route = getRoute(`/tools/${tool.slug}`);
  const href = `/tools/${tool.slug}/`;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:border-[#8adcdf] hover:shadow-[0_18px_40px_-22px_rgba(1,123,137,0.55)] motion-reduce:hover:translate-y-0">
      <Link
        to={href}
        className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b4c8]"
        aria-label={tool.title}
      />
      <div className="overflow-hidden border-b border-[#eef3f5] bg-[#f7fbfc]">
        {route && (
          <img
            src={new URL(route.image).pathname}
            alt=""
            width="1200"
            height="630"
            loading="lazy"
            decoding="async"
            className="aspect-[1200/630] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#01b4c8]">
          {tool.category}
        </p>
        <h2 className="font-geist mt-2 text-[24px] italic leading-tight tracking-[-0.01em] text-[#4e4646] transition-colors group-hover:text-[#017b89]">
          {tool.title}
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-[#627c86]">
          {tool.description}
        </p>
        <ul aria-label="What you get" className="mt-4 flex flex-wrap gap-1.5">
          {tool.outputs.map((output) => (
            <li
              key={output}
              className="rounded-full bg-[#f2f6f7] px-2.5 py-1 text-[12px] leading-4 text-[#526b75]"
            >
              {output}
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-5 text-[14px] font-semibold text-[#017b89]">
          Open the tool{" "}
          <span
            aria-hidden
            className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
          >
            &rarr;
          </span>
        </p>
      </div>
    </article>
  );
}

export function ToolsIndexPage() {
  const example = tools.find(({ slug }) => slug === "zapier-cost-calculator");
  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6 lg:pt-14"
      >
        <Breadcrumbs current="Free tools" />
        {/* A div, not a header: Markdown converters, Cloudflare's included,
            drop <header> as site chrome, and the heading with it. */}
        <div className="mt-6 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#01b4c8]">
            Free tools, no signup
          </p>
          <h1 className="font-geist mt-3 text-[38px] italic leading-[1.05] tracking-[-0.02em] text-[#4e4646] sm:text-[48px] lg:text-[56px]">
            Free tools
          </h1>
          <p className="mt-4 text-[17px] leading-7 text-[#627c86] sm:text-[18px]">
            Small, single-purpose tools for email, automation and AI setup, made
            by the team behind Construct. Each one works the moment it opens,
            keeps what you type on your device, and gives you something you can
            use straight away: a file to import, a price to plan around, or
            config to paste.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {promises.map((promise) => (
              <li
                key={promise}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dcecef] bg-[#f7fbfc] px-3 py-1.5 text-[13px] text-[#4e4646]"
              >
                <span className="text-[#01b4c8]">
                  <CheckIcon draw={false} />
                </span>
                {promise}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-12 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>

        <section
          aria-labelledby="agents-heading"
          className="mt-16 grid gap-6 rounded-[22px] border border-[#dcecef] bg-[#f7fbfc] p-6 sm:mt-20 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center"
        >
          <div>
            <h2 id="agents-heading" className={sectionHeading}>
              Use them from an AI agent
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[#627c86]">
              Every tool is also a free endpoint with no key. Agents that can
              fetch a URL get each tool's input schema and an example, then run
              it with a GET or a POST. Agents working in a browser with WebMCP
              find the same tools registered on every page of this site.
            </p>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-medium">
              <a
                href="/docs/api/"
                className="text-[#017b89] underline decoration-[#b6ecfb] underline-offset-4 hover:decoration-[#01b4c8]"
              >
                API reference
              </a>
              <a
                href="/llms.txt"
                className="text-[#017b89] underline decoration-[#b6ecfb] underline-offset-4 hover:decoration-[#01b4c8]"
              >
                llms.txt
              </a>
            </p>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-[#dcecef] bg-white p-4 text-[13px] leading-6 text-[#4e4646]">
            <code>
              {`# Every tool, with schemas and examples
GET ${siteUrl}/api/tools

# Run one
GET ${siteUrl}/api/tools/${example?.slug ?? ""}
    ?input={"zaps":[{"action_steps":2,"runs_per_month":300}]}`}
            </code>
          </pre>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
