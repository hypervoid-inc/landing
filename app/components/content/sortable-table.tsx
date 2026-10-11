import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export type SortDirection = "ascending" | "descending";
export type TableSort = { column: number; direction: SortDirection } | null;

type WithChildren = ReactElement<{ children?: ReactNode }>;

/** A list table, as opposed to one that lays attributes out by product. */
const MIN_ROWS = 4;
/** A column is numeric when this share of its cells holds a number. */
const NUMERIC_SHARE = 0.75;

export function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

/** The first number in a cell: "$1,299.50 a month" is 1299.5. */
export function numberIn(text: string): number | null {
  const match = text.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

const elements = (node: ReactNode) =>
  Children.toArray(node).filter(isValidElement) as WithChildren[];

/**
 * Takes a Markdown table's `thead` and `tbody` apart, so `Table` in
 * `mdx-components.tsx` can sort its rows in React rather than by moving DOM
 * nodes behind React's back.
 *
 * Sorting is offered only where it means something: a table listing at
 * least four rows with at least one mostly numeric column, like a price
 * comparison. A table whose rows are attributes and whose columns are
 * products ("Price | $9 | $29.99") mixes types down each column and is left
 * alone.
 */
export function readTable(children: ReactNode) {
  const parts = elements(children);
  const head = parts.find((part) => part.type === "thead");
  const body = parts.find((part) => part.type === "tbody");
  const rows = body ? elements(body.props.children) : [];
  const cells = rows.map((row) =>
    elements(row.props.children).map((cell) =>
      textOf(cell.props.children).trim(),
    ),
  );
  const columns = Math.max(0, ...cells.map((row) => row.length));
  const numeric = Array.from({ length: columns }, (_, column) => {
    const values = cells.map((row) => row[column] ?? "");
    const counted = values.filter((value) => numberIn(value) !== null);
    return counted.length >= values.length * NUMERIC_SHARE;
  });
  const sortable = rows.length >= MIN_ROWS && numeric.some(Boolean);
  return { head, body, rows, cells, numeric, sortable };
}

export function sortRows(
  table: ReturnType<typeof readTable>,
  sort: TableSort,
): WithChildren[] {
  if (!sort) return table.rows;
  const { column, direction } = sort;
  const sign = direction === "ascending" ? 1 : -1;
  const order = table.rows.map((row, index) => ({
    row,
    text: table.cells[index]?.[column] ?? "",
  }));
  order.sort((left, right) => {
    if (table.numeric[column]) {
      const a = numberIn(left.text);
      const b = numberIn(right.text);
      // Cells with no number ("Free", "Usage") stay at the end either way.
      if (a === null || b === null)
        return (a === null ? 1 : 0) - (b === null ? 1 : 0);
      return (a - b) * sign;
    }
    return left.text.localeCompare(right.text, "en", { numeric: true }) * sign;
  });
  return order.map((entry) => entry.row);
}

/** Ascending, then descending, then the author's own order. */
export function nextSort(current: TableSort, column: number): TableSort {
  if (current?.column !== column) return { column, direction: "ascending" };
  if (current.direction === "ascending") {
    return { column, direction: "descending" };
  }
  return null;
}

/**
 * The header row with sort controls wired into each cell. The `th` in
 * `mdx-components.tsx` renders them as buttons.
 */
export function withSortControls(
  head: WithChildren,
  sort: TableSort,
  onSort: (column: number) => void,
) {
  const [row] = elements(head.props.children);
  if (!row) return head;
  const cells = elements(row.props.children).map((cell, column) =>
    cloneElement(cell as ReactElement<Record<string, unknown>>, {
      key: column,
      sortDirection: sort?.column === column ? sort.direction : undefined,
      onSort: () => onSort(column),
    }),
  );
  return cloneElement(head, {}, cloneElement(row, {}, cells));
}

export function SortIcon({ direction }: { direction?: SortDirection }) {
  return (
    <svg
      aria-hidden
      width="10"
      height="12"
      viewBox="0 0 10 12"
      className={direction ? "text-[#01b4c8]" : "text-[#b8c7cc]"}
    >
      <path
        d="M5 1 8.5 4.5h-7z"
        fill="currentColor"
        opacity={direction === "descending" ? 0.3 : 1}
      />
      <path
        d="M5 11 1.5 7.5h7z"
        fill="currentColor"
        opacity={direction === "ascending" ? 0.3 : 1}
      />
    </svg>
  );
}
