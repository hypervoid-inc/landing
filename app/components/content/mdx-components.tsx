import type { ComponentPropsWithoutRef } from "react";
import { useMDXComponents } from "@mdx-js/react";

import { ProductHuntEmbed } from "../../features/product-hunt/product-hunt-embed";
import { BetaCta } from "./beta-cta";
import { ReadNext } from "./related-links";

type MDXComponents = ReturnType<typeof useMDXComponents>;

/**
 * `tabIndex` is what makes the horizontal scroll reachable by keyboard, and is
 * enough on its own. The wrapper deliberately carries no `role="region"`: a
 * post with two tables would then expose two landmarks with the same name,
 * which `landmark-unique` fails and which is genuinely worse for a screen
 * reader than no landmark at all. The `caption` still names the table.
 */
function Table({ children, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 overflow-x-auto" tabIndex={0}>
      <table
        {...props}
        className="w-full min-w-[520px] border-collapse text-sm"
      >
        <caption className="sr-only">Article table</caption>
        {children}
      </table>
    </div>
  );
}

/**
 * Fenced blocks scroll rather than wrap, so the region needs to be reachable by
 * keyboard for the axe pass. The nested `code` reset undoes the inline pill
 * below, which would otherwise paint a background behind every line.
 */
function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  return (
    <div
      className="my-6 overflow-x-auto rounded-lg border border-[#e5e7eb] bg-[#fafafa]"
      tabIndex={0}
    >
      <pre
        {...props}
        className="p-4 font-mono text-[13px] leading-relaxed text-[#4e4646] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      >
        {children}
      </pre>
    </div>
  );
}

function ExternalAwareLink({
  href = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      {...props}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-[#01b4c8] underline underline-offset-2"
    >
      {children}
    </a>
  );
}

export const mdxComponents: MDXComponents = {
  // Capitalised entries are authorable in MDX with no import, e.g. `<BetaCta />`.
  BetaCta,
  ReadNext,
  ProductHuntEmbed,
  h2: ({ children }) => (
    <h2 className="font-geist mt-10 mb-4 text-[22px] italic leading-tight text-[#4e4646] lg:text-[26px]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#4e4646]">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-4">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-5">{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-[#4e4646]">{children}</strong>
  ),
  code: ({ children, ...props }) => (
    <code
      {...props}
      className="rounded bg-[#f3f4f6] px-1.5 py-0.5 font-mono text-[0.9em] text-[#4e4646]"
    >
      {children}
    </code>
  ),
  pre: CodeBlock,
  a: ExternalAwareLink,
  table: Table,
  th: ({ children, ...props }) => (
    <th
      {...props}
      className="border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left font-medium text-[#4e4646]"
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="border border-[#e5e7eb] px-3 py-2 align-top">
      {children}
    </td>
  ),
};
