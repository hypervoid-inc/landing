import {
  cloneElement,
  createContext,
  useContext,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useMDXComponents } from "@mdx-js/react";

import { ArticleVideo } from "./article-video";
import { BetaCta } from "./beta-cta";
import { CostCalculator } from "./calculators/cost-calculator";
import { PreviewLink } from "./link-preview";
import { Prompt } from "./prompt";
import {
  SortIcon,
  nextSort,
  readTable,
  sortRows,
  withSortControls,
  type SortDirection,
  type TableSort,
} from "./sortable-table";
import { ReliabilityCalculator } from "./calculators/reliability-calculator";
import { ReadNext } from "./related-links";

type MDXComponents = ReturnType<typeof useMDXComponents>;

const TableCaptionContext = createContext<string | null>(null);

/**
 * Names a markdown table for screen readers. GFM tables cannot carry a
 * `<caption>`, and the default "Article table" is indistinguishable when a
 * post has more than one.
 */
function ArticleTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <TableCaptionContext.Provider value={caption}>
      {children}
    </TableCaptionContext.Provider>
  );
}

/**
 * `tabIndex` is what makes the horizontal scroll reachable by keyboard, and is
 * enough on its own. The wrapper deliberately carries no `role="region"`: a
 * post with two tables would then expose two landmarks with the same name,
 * which `landmark-unique` fails and which is genuinely worse for a screen
 * reader than no landmark at all. The `caption` still names the table.
 */
function Table({ children, ...props }: ComponentPropsWithoutRef<"table">) {
  const caption = useContext(TableCaptionContext);
  const [sort, setSort] = useState<TableSort>(null);
  const table = readTable(children);
  const sortable = table.sortable && table.head && table.body;
  return (
    <div className="my-6 overflow-x-auto" tabIndex={0}>
      <table
        {...props}
        className="w-full min-w-[520px] border-collapse text-sm"
      >
        <caption className="sr-only">
          {caption ?? "Article table"}
          {sortable ? ", sortable by column" : ""}
        </caption>
        {sortable ? (
          <>
            {withSortControls(table.head!, sort, (column) =>
              setSort((current) => nextSort(current, column)),
            )}
            {cloneElement(table.body!, {}, sortRows(table, sort))}
          </>
        ) : (
          children
        )}
      </table>
    </div>
  );
}

/**
 * A header cell. In a sortable table it holds a button that cycles the
 * column through ascending, descending and the author's order, and says
 * which in `aria-sort`.
 */
function HeaderCell({
  children,
  onSort,
  sortDirection,
  ...props
}: ComponentPropsWithoutRef<"th"> & {
  onSort?: () => void;
  sortDirection?: SortDirection;
}) {
  return (
    <th
      {...props}
      aria-sort={onSort ? (sortDirection ?? "none") : undefined}
      className="border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left font-medium text-[#4e4646]"
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1.5 text-left font-medium transition-colors hover:text-[#017b89]"
        >
          {children}
          <SortIcon direction={sortDirection} />
        </button>
      ) : (
        children
      )}
    </th>
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

/**
 * A chart or screenshot with its caption. `width` and `height` are the file's
 * pixel size, so the browser reserves the space before the image loads.
 */
function ArticleFigure({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}) {
  return (
    <figure className="my-8">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-lg border border-[#e5e7eb]"
      />
      <figcaption className="mt-2 text-[13px] leading-relaxed text-[#526b75]">
        {caption}
      </figcaption>
    </figure>
  );
}

function ExternalAwareLink({
  href = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const external = /^https?:\/\//.test(href);
  if (href.startsWith("/")) {
    return (
      <PreviewLink
        {...props}
        href={href}
        className="text-[#01b4c8] underline underline-offset-2"
      >
        {children}
      </PreviewLink>
    );
  }
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
  ArticleFigure,
  ArticleTable,
  ArticleVideo,
  BetaCta,
  CostCalculator,
  Prompt,
  ReadNext,
  ReliabilityCalculator,
  // `id` comes from `scripts/remark-headings.mjs`, which also lists it in the
  // post's table of contents. The scroll margin keeps a jumped-to heading
  // clear of the sticky header.
  h2: ({ children, id }) => (
    <h2
      id={id}
      className="font-geist mt-10 mb-4 scroll-mt-[calc(var(--site-chrome-height)+1.5rem)] text-[22px] italic leading-tight text-[#4e4646] lg:text-[26px]"
    >
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
  th: HeaderCell,
  td: ({ children, ...props }) => (
    <td {...props} className="border border-[#e5e7eb] px-3 py-2 align-top">
      {children}
    </td>
  ),
};
