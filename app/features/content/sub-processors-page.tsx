import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDeferredValue, useId, useState } from "react";

import {
  ContentShell,
  formatDate,
  InlineLink,
  Section,
} from "../../components/content/content-shell";
import {
  matchesQuery,
  SUB_PROCESSOR_GROUPS,
  SUB_PROCESSORS,
  SUB_PROCESSORS_UPDATED,
  type SubProcessor,
} from "../../content/sub-processors";

export function SubProcessorsPage() {
  return (
    <ContentShell
      title="Sub-processors"
      metadata={
        <>
          Last updated:{" "}
          <time dateTime={SUB_PROCESSORS_UPDATED}>
            {formatDate(SUB_PROCESSORS_UPDATED)}
          </time>
        </>
      }
    >
      <Section title="Who processes data for Construct">
        <p>
          Construct Computer engages the vendors below to help operate
          construct.computer and the Construct platform (API and web app). Each
          processes personal data only as needed for the stated purpose, under
          Construct’s instructions and the agreements we have with them. This
          list supplements our{" "}
          <InlineLink href="/privacy/">Privacy Policy</InlineLink>.
        </p>
        <p>
          Prompts and conversation context required to run your agent are sent
          to the model provider serving the request. On the platform fleet that
          is Cloudflare Workers AI and Google Gemini, and with your own key
          (BYOK) it is the provider you choose. Platform decision questions are
          answered by Cloudflare’s Clef model on Workers AI. TypeSafe’s Jev is
          kept as an alternative decision model and does not receive your
          conversations.
        </p>
        <p>
          Apps you choose to connect (for example Google Workspace tools, Slack,
          Telegram, Discord, or a custom MCP server) exchange data with those
          services at your direction. Those connections are described in Privacy
          Policy section 4.1 and are not repeated here as Construct
          infrastructure sub-processors.
        </p>
      </Section>

      <Directory />

      <Section title="Changes">
        <p>
          We may update this list when we add or replace a vendor. Material
          changes will be reflected here with a revised “Last updated” date. For
          questions, see <InlineLink href="/support/">Support</InlineLink>.
        </p>
      </Section>
    </ContentShell>
  );
}

/**
 * The searchable vendor list. It prerenders in full, so the page reads the
 * same before hydration, and the search box only narrows it once React is up.
 */
function Directory() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const inputId = useId();
  const matches = SUB_PROCESSORS.filter((processor) =>
    matchesQuery(processor, deferred),
  );
  const searching = deferred.trim().length > 0;

  return (
    <section aria-labelledby={`${inputId}-heading`} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id={`${inputId}-heading`}
          className="font-geist text-[22px] italic leading-tight tracking-[-0.015em] text-[#4e4646] lg:text-[26px]"
        >
          Current sub-processors
        </h2>
        <div className="relative sm:w-64">
          <label htmlFor={inputId} className="sr-only">
            Search sub-processors
          </label>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#8a9aa2]">
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} />
          </span>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-9 text-[14px] text-[#4e4646] outline-none transition-colors placeholder:text-[#8a9aa2] focus:border-[#01b4c8] focus-visible:ring-2 focus-visible:ring-[#01b4c8]/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-1.5 my-auto flex size-7 items-center justify-center rounded-md text-[#8a9aa2] transition-colors hover:bg-[#f3f5f6] hover:text-[#4e4646]"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {searching
          ? `${matches.length} of ${SUB_PROCESSORS.length} sub-processors match`
          : ""}
      </p>

      {SUB_PROCESSOR_GROUPS.map((group) => {
        const rows = matches.filter(
          (processor) => processor.group === group.id,
        );
        if (rows.length === 0) return null;
        return (
          <div key={group.id} className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#4e4646]">
                {group.title}
              </h3>
              <p className="text-[13px] leading-5 text-[#8a9aa2]">
                {group.note}
              </p>
            </div>
            <ul className="divide-y divide-[#e5e7eb] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
              {rows.map((processor) => (
                <ProcessorRow key={processor.name} processor={processor} />
              ))}
            </ul>
          </div>
        );
      })}

      {matches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#e5e7eb] px-6 py-10 text-center">
          <p className="text-[15px] text-[#4e4646]">
            No sub-processors match “{deferred.trim()}”.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 text-[14px] text-[#01b4c8] underline underline-offset-2"
          >
            Clear search
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Logo, name and role, then what the vendor does with the data. Region sits in
 * its own column from `sm` up and drops under the name on a phone, where a
 * third column would squeeze the description to a few words a line.
 */
function ProcessorRow({ processor }: { processor: SubProcessor }) {
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 px-4 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-6 sm:px-6">
      <img
        src={`/assets/sub-processors/${processor.logo}.webp`}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className="row-span-3 mt-0.5 size-10 rounded-[10px] ring-1 ring-black/[0.06] sm:row-span-2"
      />
      <h4 className="col-start-2 text-[15px] leading-6 text-[#4e4646] lg:text-[16px]">
        <span className="font-medium">{processor.name}</span>
        <span aria-hidden className="mx-1.5 text-[#cfd7db]">
          •
        </span>
        <span className="sr-only">, </span>
        <span className="text-[#627c86]">{processor.role}</span>
      </h4>
      <p className="col-start-2 text-[13px] leading-6 text-[#4e4646] sm:col-start-3 sm:row-start-1 sm:text-right sm:text-[14px]">
        <span className="sr-only">Region: </span>
        {processor.region}
      </p>
      <div className="col-start-2 mt-1 space-y-2">
        <p className="text-[14px] leading-[1.6] text-[#627c86] lg:text-[15px]">
          {processor.description}
        </p>
        <p className="text-[13px] leading-5 text-[#8a9aa2]">
          {processor.entity}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <a
            href={processor.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#01b4c8] underline underline-offset-2"
          >
            Privacy policy
            <span className="sr-only"> for {processor.entity}</span>
          </a>
        </p>
      </div>
    </li>
  );
}
