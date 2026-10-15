/**
 * Turns a form's worth of Gmail filter settings into a search string and the
 * `mailFilters.xml` file Gmail's Settings > Filters > Import accepts.
 *
 * Property names and the feed shell mirror gmailctl's exporter
 * (github.com/mbrt/gmailctl, internal/engine/export/xml), which is used to
 * import filters into real accounts every day. Like gmailctl, everything that
 * is not from, to, or subject goes into `hasTheWord` as Gmail search syntax,
 * so exclusions, attachments, and size need no property of their own.
 */

export const CATEGORIES = [
  { value: "personal", label: "Primary" },
  { value: "social", label: "Social" },
  { value: "promo", label: "Promotions" },
  { value: "notification", label: "Updates" },
  { value: "group", label: "Forums" },
] as const;

export type Category = "" | (typeof CATEGORIES)[number]["value"];

export type GmailFilter = {
  /**
   * For the person, not for Gmail: Gmail stores no filter names, so the name
   * is written as an XML comment above the filter's entry, which any XML
   * reader skips.
   */
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly hasWords: string;
  readonly doesNotHave: string;
  readonly hasAttachment: boolean;
  readonly sizeOperator: "" | "larger" | "smaller";
  /** Megabytes, kept as typed. */
  readonly sizeMb: string;
  readonly label: string;
  readonly skipInbox: boolean;
  readonly markRead: boolean;
  readonly star: boolean;
  readonly neverSpam: boolean;
  readonly important: "" | "always" | "never";
  readonly trash: boolean;
  readonly category: Category;
  readonly forwardTo: string;
};

export const emptyFilter: GmailFilter = {
  name: "",
  from: "",
  to: "",
  subject: "",
  hasWords: "",
  doesNotHave: "",
  hasAttachment: false,
  sizeOperator: "",
  sizeMb: "",
  label: "",
  skipInbox: false,
  markRead: false,
  star: false,
  neverSpam: false,
  important: "",
  trash: false,
  category: "",
  forwardTo: "",
};

/** Comma or newline separated, any one of them matches. */
function terms(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) =>
      /\s/.test(term) && !/^".*"$/.test(term) ? `"${term}"` : term,
    );
}

/** `a` for one term, `(a OR b)` for several. */
function anyOf(raw: string): string {
  const list = terms(raw);
  return list.length > 1 ? `(${list.join(" OR ")})` : (list[0] ?? "");
}

function size(filter: GmailFilter): string {
  const mb = Number(filter.sizeMb);
  if (!filter.sizeOperator || !Number.isFinite(mb) || mb <= 0) return "";
  return `${filter.sizeOperator}:${Number(mb.toFixed(2))}M`;
}

/** The part of the query that goes into `hasTheWord`. */
function extraQuery(filter: GmailFilter): string {
  return [
    anyOf(filter.hasWords),
    ...terms(filter.doesNotHave).map((term) => `-${term}`),
    filter.hasAttachment ? "has:attachment" : "",
    size(filter),
  ]
    .filter(Boolean)
    .join(" ");
}

/** What to paste into Gmail's search bar to preview the matches. */
export function searchQuery(filter: GmailFilter): string {
  const field = (name: string, raw: string) => {
    const value = anyOf(raw);
    return value ? `${name}:${value}` : "";
  };
  return [
    field("from", filter.from),
    field("to", filter.to),
    field("subject", filter.subject),
    extraQuery(filter),
  ]
    .filter(Boolean)
    .join(" ");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Why this filter cannot be exported yet, or an empty list when it can. */
export function filterProblems(filter: GmailFilter): string[] {
  const problems: string[] = [];
  if (!searchQuery(filter)) problems.push("Add at least one condition.");
  if (filter.sizeOperator && !size(filter)) {
    problems.push("Enter a size in MB above 0.");
  }
  const forward = filter.forwardTo.trim();
  if (forward && !EMAIL.test(forward)) {
    problems.push("Enter one email address to forward to.");
  }
  if (properties(filter).length === criteria(filter).length) {
    problems.push("Pick at least one action.");
  }
  return problems;
}

function criteria(filter: GmailFilter): [string, string][] {
  const pairs: [string, string][] = [
    ["from", anyOf(filter.from).replace(/^\((.*)\)$/, "$1")],
    ["to", anyOf(filter.to).replace(/^\((.*)\)$/, "$1")],
    ["subject", anyOf(filter.subject)],
    ["hasTheWord", extraQuery(filter)],
  ];
  return pairs.filter(([, value]) => value);
}

/** Gmail filter properties in export order: criteria, then actions. */
export function properties(filter: GmailFilter): [string, string][] {
  const flag = (on: boolean, name: string): [string, string][] =>
    on ? [[name, "true"]] : [];
  return [
    ...criteria(filter),
    ...(filter.label.trim()
      ? [["label", filter.label.trim()] as [string, string]]
      : []),
    ...flag(filter.skipInbox, "shouldArchive"),
    ...flag(filter.markRead, "shouldMarkAsRead"),
    ...flag(filter.star, "shouldStar"),
    ...flag(filter.neverSpam, "shouldNeverSpam"),
    ...flag(filter.important === "always", "shouldAlwaysMarkAsImportant"),
    ...flag(filter.important === "never", "shouldNeverMarkAsImportant"),
    ...flag(filter.trash, "shouldTrash"),
    ...(filter.category
      ? [
          ["smartLabelToApply", `^smartlabel_${filter.category}`] as [
            string,
            string,
          ],
        ]
      : []),
    ...(filter.forwardTo.trim()
      ? [["forwardTo", filter.forwardTo.trim()] as [string, string]]
      : []),
  ];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * A fixed `updated` stamp keeps the prerendered XML identical to the one the
 * browser builds, so hydration never sees two versions. Gmail reads the
 * entries, not the feed date.
 */
const UPDATED = "2026-10-11T00:00:00Z";

export const NAME_MAX = 80;

/**
 * A filter name made safe for an XML comment, which may not contain `--` or
 * end in `-`, and kept to one line.
 */
export function commentName(name: string): string {
  return name
    .replace(/\p{Cc}+/gu, " ")
    .replace(/-{2,}/g, "-")
    .slice(0, NAME_MAX)
    .replace(/[\s-]+$/, "")
    .trim();
}

/** The import file. Filters with problems are left out. */
export function filtersXml(filters: readonly GmailFilter[]): string {
  const entries = filters
    .filter((filter) => filterProblems(filter).length === 0)
    .map((filter) =>
      [
        ...(commentName(filter.name)
          ? [`  <!-- ${commentName(filter.name)} -->`]
          : []),
        "  <entry>",
        '    <category term="filter"></category>',
        "    <title>Mail Filter</title>",
        "    <content></content>",
        ...properties(filter).map(
          ([name, value]) =>
            `    <apps:property name="${name}" value="${escapeXml(value)}"></apps:property>`,
        ),
        "  </entry>",
      ].join("\n"),
    );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:apps="http://schemas.google.com/apps/2006">',
    "  <title>Mail Filters</title>",
    "  <id>tag:mail.google.com,2008:filters:</id>",
    `  <updated>${UPDATED}</updated>`,
    "  <author>",
    "    <name>Construct Gmail filter generator</name>",
    "    <email>hello@construct.computer</email>",
    "  </author>",
    ...entries,
    "</feed>",
    "",
  ].join("\n");
}
