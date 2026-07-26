import type { ComponentPropsWithoutRef } from "react";
import { useMDXComponents } from "@mdx-js/react";

type MDXComponents = ReturnType<typeof useMDXComponents>;

function Table({ children, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div
      className="my-6 overflow-x-auto"
      role="region"
      aria-label="Article table"
      tabIndex={0}
    >
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
