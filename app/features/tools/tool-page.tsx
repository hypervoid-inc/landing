import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { getTool, tools, type ToolEntry } from "../../content/tools";
import { getRoute } from "../../lib/route-manifest";
import { NotFoundPage } from "../not-found/not-found-page";
import { GmailFilterGenerator } from "./gmail-filter-generator";
import { McpConfigGenerator } from "./mcp-config-generator";
import { ZapierCostCalculator } from "./zapier-cost-calculator";
import { Breadcrumbs } from "./tool-breadcrumbs";
import { ToolCta } from "./tool-ui";

/** Each tool renders its result with the CTA passed in as `cta`. */
export type ToolProps = { readonly cta: ReactNode };

const components: Record<string, ComponentType<ToolProps>> = {
  "gmail-filter-generator": GmailFilterGenerator,
  "zapier-cost-calculator": ZapierCostCalculator,
  "mcp-config-generator": McpConfigGenerator,
};

const sectionHeading =
  "font-geist text-[26px] italic leading-tight tracking-[-0.015em] text-[#4e4646] sm:text-[30px]";

/** The other tools, so every tool page leads to the rest and to the hub. */
function MoreTools({ tool }: { tool: ToolEntry }) {
  const others = tools.filter((entry) => entry.slug !== tool.slug);
  return (
    <section aria-labelledby="more-tools-heading" className="mt-14">
      <h2 id="more-tools-heading" className={sectionHeading}>
        More free tools
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {others.map((entry) => (
          <li key={entry.slug}>
            <Link
              to={`/tools/${entry.slug}/`}
              className="group flex h-full flex-col rounded-xl border border-[#e5e7eb] bg-white p-4 transition-[border-color,box-shadow] hover:border-[#8adcdf] hover:shadow-[0_10px_28px_-18px_rgba(1,123,137,0.45)]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#01b4c8]">
                {entry.category}
              </span>
              <span className="font-geist mt-1 text-[20px] italic leading-tight text-[#4e4646] transition-colors group-hover:text-[#01b4c8]">
                {entry.title}
              </span>
              <span className="mt-1.5 text-[14px] leading-6 text-[#627c86]">
                {entry.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <Link
          to="/tools/"
          className="text-[15px] font-medium text-[#017b89] underline decoration-[#b6ecfb] underline-offset-4 hover:decoration-[#01b4c8]"
        >
          See all free tools
        </Link>
      </p>
    </section>
  );
}

/**
 * Native `details`, so every answer is in the prerendered HTML and opens with
 * no script. The same `faqs` feed the FAQPage JSON-LD in `routeJsonLd`.
 */
function Faq({ tool }: { tool: ToolEntry }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-16 sm:mt-20">
      <h2 id="faq-heading" className={sectionHeading}>
        Frequently asked questions
      </h2>
      <div className="mt-6 divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">
        {tool.faqs.map((faq, index) => (
          <details
            key={faq.question}
            open={index === 0}
            className="tool-details group py-4"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[16px] font-medium leading-6 text-[#4e4646] [&::-webkit-details-marker]:hidden">
              <h3 className="text-[16px] font-medium leading-6">
                {faq.question}
              </h3>
              <span
                aria-hidden
                className="mt-0.5 text-[#01b4c8] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#627c86]">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Plain HTML table, readable without script and easy for search and answer engines to quote. */
function Reference({ tool }: { tool: ToolEntry }) {
  const { heading, intro, columns, rows, note } = tool.reference;
  return (
    <section aria-labelledby="reference-heading" className="mt-16 sm:mt-20">
      <h2 id="reference-heading" className={sectionHeading}>
        {heading}
      </h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#627c86]">
        {intro}
      </p>
      <div
        className="mt-5 overflow-x-auto rounded-xl border border-[#e5e7eb]"
        tabIndex={0}
        role="region"
        aria-labelledby="reference-heading"
      >
        <table className="w-full min-w-[560px] border-collapse bg-white text-left text-[14px] leading-6">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="border-b border-[#e5e7eb] bg-[#fafafa] px-3 py-2 font-medium text-[#4e4646]"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.join("|")}
                className="border-b border-[#f0f2f4] last:border-0"
              >
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th
                      key={index}
                      scope="row"
                      className="px-3 py-2 align-top font-mono text-[13px] font-medium text-[#4e4646]"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td
                      key={index}
                      className="break-words px-3 py-2 align-top text-[#627c86]"
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && (
        <p className="mt-3 text-[13px] leading-5 text-[#526b75]">{note}</p>
      )}
    </section>
  );
}

function Related({ tool }: { tool: ToolEntry }) {
  const routes = tool.relatedSlugs
    .map((slug) => getRoute(`/blog/${slug}`))
    .filter((route) => route !== undefined);
  if (!routes.length) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-14">
      <h2 id="related-heading" className={sectionHeading}>
        Related reading
      </h2>
      <ul className="mt-5 space-y-3">
        {routes.map((route) => (
          <li key={route.path}>
            <Link
              to={`${route.path}/`}
              className="text-[16px] font-medium text-[#017b89] underline decoration-[#b6ecfb] underline-offset-4 hover:decoration-[#01b4c8]"
            >
              {route.displayTitle ?? route.title}
            </Link>
            <p className="mt-0.5 text-[14px] leading-6 text-[#627c86]">
              {route.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ToolPage({ slug }: { slug: string }) {
  const tool = getTool(slug);
  const Tool = components[slug];
  if (!tool || !Tool) return <NotFoundPage />;

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-8 sm:px-6 lg:pt-14"
      >
        <Breadcrumbs
          current={tool.name}
          parent={{ label: "Free tools", to: "/tools/" }}
        />
        <header className="mt-6 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#01b4c8]">
            Free tool, no signup
          </p>
          <h1 className="font-geist mt-3 text-[34px] italic leading-[1.1] tracking-[-0.02em] text-[#4e4646] sm:text-[44px] lg:text-[50px]">
            {tool.title}
          </h1>
          <p className="mt-4 text-[17px] leading-7 text-[#627c86] sm:text-[18px]">
            {tool.lede}
          </p>
        </header>

        <Tool
          cta={
            <ToolCta
              slug={tool.slug}
              pitch={tool.ctaPitch}
              label={tool.ctaLabel}
              plan={tool.ctaPlan}
              interval={tool.ctaInterval}
            />
          }
        />

        <Reference tool={tool} />
        <Faq tool={tool} />
        <MoreTools tool={tool} />
        <Related tool={tool} />
      </main>
      <SiteFooter />
    </div>
  );
}
