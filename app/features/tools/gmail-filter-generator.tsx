import { useState } from "react";

import {
  CATEGORIES,
  NAME_MAX,
  emptyFilter,
  filterProblems,
  filtersXml,
  searchQuery,
  type Category,
  type GmailFilter,
} from "../../../shared/tools/gmail-filter";
import type { ToolProps } from "./tool-page";
import {
  ChangeFlash,
  CheckIcon,
  SwapLabel,
  layoutTransition,
  revealElement,
  transitionName,
  useChangeCount,
  useConfirm,
} from "./tool-motion";
import {
  CheckField,
  CodeBlock,
  CopyButton,
  DownloadButton,
  LiveResult,
  SelectField,
  TextField,
  ToolFrame,
  toolStyles,
} from "./tool-ui";

type Row = GmailFilter & { id: number };

const TOOL = "gmail-filter-generator";

const STARTERS: readonly GmailFilter[] = [
  {
    ...emptyFilter,
    name: "Receipts",
    subject: "receipt, invoice, order confirmation",
    label: "Receipts",
    skipInbox: true,
  },
  {
    ...emptyFilter,
    name: "Newsletters",
    hasWords: "unsubscribe",
    label: "Newsletters",
    skipInbox: true,
    markRead: true,
  },
  {
    ...emptyFilter,
    name: "Calendar invites",
    hasWords: "filename:ics",
    label: "Invites",
  },
  {
    ...emptyFilter,
    name: "Big attachments",
    hasAttachment: true,
    sizeOperator: "larger",
    sizeMb: "10",
    label: "Large files",
  },
  {
    ...emptyFilter,
    name: "Important sender",
    from: "boss@company.com",
    star: true,
    important: "always",
    neverSpam: true,
  },
];

const hint = "Separate options with commas. Any one of them matches.";
const cardId = (id: number) => `gmail-filter-${id}`;

function displayName(filter: GmailFilter, number: number) {
  return filter.name.trim() || `Filter ${number}`;
}

/** "Receipts", "Receipts and Invites", "Receipts, Invites and Newsletters". */
function listNames(names: readonly string[]) {
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
    : (names[0] ?? "");
}

const FIRST_ID = 1;

/**
 * A starter chip. It answers its own click with a drawn tick and "Added", so
 * the click registers right where it happened, whatever the list does.
 */
function StarterChip({
  label,
  dashed = false,
  onAdd,
}: {
  label: string;
  dashed?: boolean;
  onAdd: () => void;
}) {
  const [added, confirm] = useConfirm();
  return (
    <button
      type="button"
      onClick={() => {
        onAdd();
        confirm();
      }}
      className={`tool-press min-h-9 rounded-full border px-3 text-[13px] ${
        added
          ? "border-[#01b4c8] bg-[#effbfc] text-[#017b89]"
          : dashed
            ? "border-dashed border-[#01b4c8] bg-white font-medium text-[#017b89] hover:bg-[#effbfc]"
            : "border-[#d7dee2] bg-white text-[#4e4646] hover:border-[#01b4c8] hover:text-[#017b89]"
      }`}
    >
      <SwapLabel
        done={added}
        idle={`+ ${label}`}
        confirmed={
          <>
            <CheckIcon />
            Added
          </>
        }
      />
    </button>
  );
}

export function GmailFilterGenerator({ cta }: ToolProps) {
  const [rows, setRows] = useState<Row[]>([{ ...STARTERS[0]!, id: FIRST_ID }]);
  const count = useChangeCount(rows.length);

  // Newest first, so a new filter lands under the chips that added it, where
  // the reader is already looking. Numbers follow creation order and do not
  // shift when a newer filter arrives above.
  const add = (filter: GmailFilter) => {
    const id = Math.max(0, ...rows.map((row) => row.id)) + 1;
    void layoutTransition(() =>
      setRows((current) => [{ ...filter, id }, ...current]),
    ).then(() => revealElement(cardId(id)));
  };
  const numbers = new Map(
    [...rows]
      .sort((left, right) => left.id - right.id)
      .map((row, index) => [row.id, index + 1]),
  );
  const remove = (id: number) =>
    void layoutTransition(() =>
      setRows((current) => current.filter((row) => row.id !== id)),
    );
  const update = (id: number, patch: Partial<GmailFilter>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  const ready = rows
    .map((row) => ({ row, number: numbers.get(row.id)! }))
    .filter(({ row }) => filterProblems(row).length === 0);
  const readyNames = ready.map(({ row, number }) => displayName(row, number));
  const xml = filtersXml(rows);
  // Animate the download area only when it appears after an edit, not on load.
  const outputShown = useChangeCount(ready.length > 0);

  return (
    <ToolFrame title="Gmail filter generator">
      <div>
        <p className={toolStyles.labelClass}>Add a starter filter</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <StarterChip
              key={starter.name}
              label={starter.name}
              onAdd={() => add(starter)}
            />
          ))}
          <StarterChip
            label="Blank filter"
            dashed
            onAdd={() => add(emptyFilter)}
          />
        </div>
        <p className={toolStyles.hintClass}>
          Click or tap a filter's name to rename it. Gmail doesn't show filter
          names, so the file keeps each one as a note above its filter.
        </p>
      </div>

      <p
        className={`${toolStyles.labelClass} mt-5 flex items-center gap-2`}
        aria-live="polite"
      >
        Your filters
        <span className="inline-flex min-w-6 justify-center overflow-hidden rounded-full bg-[#effbfc] px-2 py-0.5 text-[12px] font-semibold text-[#017b89]">
          <span key={count} className={count ? "tool-tick" : undefined}>
            {rows.length}
          </span>
        </span>
        <span className="font-normal text-[#526b75]">newest first</span>
      </p>
      <ol className="mt-3 space-y-4">
        {rows.map((row) => (
          <FilterCard
            key={row.id}
            fresh={row.id !== FIRST_ID}
            number={numbers.get(row.id)!}
            filter={row}
            onChange={(patch) => update(row.id, patch)}
            onRemove={rows.length > 1 ? () => remove(row.id) : undefined}
          />
        ))}
      </ol>

      {/* Named so it glides with the list instead of cross-fading. */}
      <div style={transitionName("gmail-filter-results")}>
        <LiveResult changeKey={readyNames.join("|") + `/${rows.length}`}>
          {ready.length === 0
            ? "Give each filter at least one condition and one action, and the import file appears here."
            : `${ready.length} of ${rows.length} ${rows.length === 1 ? "filter is" : "filters are"} ready: ${listNames(readyNames)}. Download the file, then in Gmail open Settings, See all settings, Filters and Blocked Addresses, and click Import filters.`}
        </LiveResult>

        {ready.length > 0 && (
          <div className={outputShown ? "tool-enter" : undefined}>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <DownloadButton
                text={xml}
                filename="mailFilters.xml"
                mime="application/xml"
                tool={TOOL}
              >
                Download mailFilters.xml
              </DownloadButton>
              <CopyButton text={xml} tool={TOOL} label="Copy XML" />
            </div>
            <CodeBlock label="mailFilters.xml" code={xml} tool={TOOL} />
          </div>
        )}

        {cta}
      </div>
    </ToolFrame>
  );
}

/** Ready or not, popping in each time it flips. */
function StatusBadge({ ready }: { ready: boolean }) {
  const changes = useChangeCount(ready);
  return (
    <span
      key={changes}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium leading-4 ${
        ready ? "bg-[#ecfdf3] text-[#067647]" : "bg-[#f2f4f5] text-[#526b75]"
      } ${changes ? "tool-pop" : ""}`}
    >
      {ready ? (
        <>
          <CheckIcon draw={changes > 0} />
          Ready
        </>
      ) : (
        "Incomplete"
      )}
    </span>
  );
}

/** The card title, edited in place. */
function NameField({
  filter,
  number,
  onChange,
}: {
  filter: GmailFilter;
  number: number;
  onChange: (name: string) => void;
}) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center">
      <span className="sr-only">Filter name</span>
      <input
        value={filter.name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Filter ${number}`}
        maxLength={NAME_MAX}
        spellCheck={false}
        autoComplete="off"
        className="peer -ml-1.5 w-full min-w-0 rounded-md border border-transparent bg-transparent py-1 pl-1.5 pr-7 text-[16px] font-semibold text-[#4e4646] outline-none transition-colors placeholder:font-semibold placeholder:text-[#8a9aa2] hover:border-[#d7dee2] focus:border-[#01b4c8] focus:bg-white"
      />
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[#8a9aa2] transition-opacity peer-focus:opacity-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      >
        <path d="M10.8 2.7l2.5 2.5-7.6 7.6-3.2.7.7-3.2z" />
      </svg>
    </label>
  );
}

function FilterCard({
  number,
  fresh,
  filter,
  onChange,
  onRemove,
}: {
  number: number;
  /** Added by the reader rather than present at load, so it glows once. */
  fresh: boolean;
  filter: Row;
  onChange: (patch: Partial<GmailFilter>) => void;
  onRemove?: () => void;
}) {
  const query = searchQuery(filter);
  const problems = filterProblems(filter);
  const name = displayName(filter, number);
  const set =
    <K extends keyof GmailFilter>(key: K) =>
    (value: GmailFilter[K]) =>
      onChange({ [key]: value } as Partial<GmailFilter>);

  return (
    <li
      id={cardId(filter.id)}
      style={transitionName(cardId(filter.id))}
      className={`tool-item rounded-xl border border-[#dcecef] bg-white p-3 sm:p-4 ${fresh ? "tool-new" : ""}`}
    >
      <h3 className="sr-only">{name}</h3>
      <div className="flex items-center gap-2 sm:gap-3">
        <NameField filter={filter} number={number} onChange={set("name")} />
        <StatusBadge ready={problems.length === 0} />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="tool-press min-h-9 shrink-0 rounded-full px-2 text-[13px] font-medium text-[#526b75] underline underline-offset-4 hover:text-[#b42318]"
          >
            Remove
          </button>
        )}
      </div>

      <fieldset className="mt-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#526b75]">
          When an email matches
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="From"
            value={filter.from}
            onChange={set("from")}
            placeholder="billing@stripe.com, @acme.com"
            hint={hint}
          />
          <TextField
            label="To"
            value={filter.to}
            onChange={set("to")}
            placeholder="you+receipts@gmail.com"
          />
          <TextField
            label="Subject contains"
            value={filter.subject}
            onChange={set("subject")}
            placeholder="receipt, invoice"
            hint={hint}
          />
          <TextField
            label="Has the words"
            value={filter.hasWords}
            onChange={set("hasWords")}
            placeholder="unsubscribe"
            hint="Gmail search operators work here too."
          />
          <TextField
            label="Doesn't have"
            value={filter.doesNotHave}
            onChange={set("doesNotHave")}
            placeholder="urgent, refund"
            hint="Any of these words keeps an email out."
          />
          <div className="grid grid-cols-[1.2fr_1fr] gap-3">
            <SelectField
              label="Size"
              value={filter.sizeOperator}
              onChange={set("sizeOperator")}
              options={[
                { value: "", label: "Any size" },
                { value: "larger", label: "Larger than" },
                { value: "smaller", label: "Smaller than" },
              ]}
            />
            <TextField
              label="MB"
              value={filter.sizeMb}
              onChange={set("sizeMb")}
              placeholder="10"
              invalid={
                Boolean(filter.sizeOperator) && !(Number(filter.sizeMb) > 0)
              }
            />
          </div>
        </div>
        <div className="mt-3">
          <CheckField
            label="Has an attachment"
            checked={filter.hasAttachment}
            onChange={set("hasAttachment")}
          />
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#526b75]">
          Do this
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Apply the label"
            value={filter.label}
            onChange={set("label")}
            placeholder="Receipts or Clients/Acme"
            hint="Create new labels in Gmail before importing."
          />
          <TextField
            label="Forward to"
            type="email"
            value={filter.forwardTo}
            onChange={set("forwardTo")}
            placeholder="bookkeeper@firm.com"
            hint="Gmail needs this address verified under Forwarding first."
            invalid={problems.includes(
              "Enter one email address to forward to.",
            )}
          />
          <SelectField
            label="Importance"
            value={filter.important}
            onChange={set("important")}
            options={[
              { value: "", label: "Leave as is" },
              { value: "always", label: "Always mark important" },
              { value: "never", label: "Never mark important" },
            ]}
          />
          <SelectField<Category>
            label="Categorize as"
            value={filter.category}
            onChange={set("category")}
            options={[
              { value: "", label: "Leave as is" },
              ...CATEGORIES.map(({ value, label }) => ({ value, label })),
            ]}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <CheckField
            label="Skip the inbox"
            checked={filter.skipInbox}
            onChange={set("skipInbox")}
          />
          <CheckField
            label="Mark as read"
            checked={filter.markRead}
            onChange={set("markRead")}
          />
          <CheckField
            label="Star it"
            checked={filter.star}
            onChange={set("star")}
          />
          <CheckField
            label="Never send to spam"
            checked={filter.neverSpam}
            onChange={set("neverSpam")}
          />
          <CheckField
            label="Delete it"
            checked={filter.trash}
            onChange={set("trash")}
          />
        </div>
      </fieldset>

      <div className="relative isolate mt-4 rounded-lg bg-[#f7fbfc] p-3">
        <ChangeFlash value={query} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#526b75]">
            Test {name} in Gmail search
          </p>
          {query && <CopyButton text={query} tool={TOOL} />}
        </div>
        <p className="mt-1 break-words font-mono text-[14px] leading-6 text-[#4e4646]">
          {query || "Add a condition to see the search string."}
        </p>
        {problems.length > 0 && (
          <ul className="tool-enter mt-2 list-disc pl-5 text-[13px] leading-5 text-[#b42318]">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
