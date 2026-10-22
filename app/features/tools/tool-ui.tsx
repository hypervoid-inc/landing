import { useId, useState, type ReactNode } from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import type { BillingInterval, PaidPlanId } from "../../platform/api/schemas";
import { StartLink } from "../landing/beta-access";
import {
  ChangeFlash,
  CheckIcon,
  SwapLabel,
  useChangeCount,
  useConfirm,
} from "./tool-motion";

/**
 * Inputs and outputs shared by the free tools. Same look as the in-post
 * calculators (`components/content/calculators/calculator-ui.tsx`), whose
 * number, choice, preset, and stat pieces the tools reuse directly. Inputs are
 * 16px so iOS Safari does not zoom the page on focus.
 */

const labelClass = "block text-[13px] font-medium leading-5 text-[#4e4646]";
const hintClass = "mt-1 text-[12px] leading-5 text-[#526b75]";
const boxClass =
  "mt-1.5 w-full min-w-0 rounded-lg border border-[#d7dee2] bg-white px-3 py-2 text-[16px] text-[#4e4646] outline-none transition-colors focus:border-[#01b4c8]";

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline = false,
  invalid = false,
  type = "text",
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  invalid?: boolean;
  type?: "text" | "email" | "url";
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const shared = {
    id,
    value,
    placeholder,
    spellCheck: false,
    autoCapitalize: "off",
    autoComplete: "off",
    "aria-invalid": invalid || undefined,
    "aria-describedby": hint ? hintId : undefined,
    className: `${boxClass} ${invalid ? "border-[#b42318]" : ""}`,
  } as const;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared.className} font-mono text-[14px] sm:text-[14px]`}
        />
      ) : (
        <input
          {...shared}
          type={type}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={boxClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="tool-press flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-[#d7dee2] bg-white px-3 text-[14px] leading-5 text-[#4e4646] transition-colors hover:border-[#01b4c8] has-checked:border-[#01b4c8] has-checked:bg-[#effbfc] has-checked:text-[#017b89]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#01b4c8]"
      />
      {label}
    </label>
  );
}

function track(tool: string, action: string) {
  captureAnalytics("tool_output_used", { tool, action });
}

/** Copies `text`, then confirms with a drawn tick for two seconds. */
export function CopyButton({
  text,
  tool,
  label = "Copy",
}: {
  text: string;
  tool: string;
  label?: string;
}) {
  const [copied, confirm] = useConfirm();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            confirm();
            track(tool, "copy");
          });
        }}
        className={`tool-press min-h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium ${
          copied
            ? "border-[#01b4c8] bg-[#effbfc] text-[#017b89]"
            : "border-[#d7dee2] bg-white text-[#4e4646] hover:border-[#01b4c8] hover:text-[#017b89]"
        }`}
      >
        <SwapLabel
          done={copied}
          idle={label}
          confirmed={
            <>
              <CheckIcon />
              Copied
            </>
          }
        />
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

/** An arrow over a tray. `dropping` plays the arrow falling into it. */
function DownloadIcon({ dropping = false }: { dropping?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className={dropping ? "tool-drop" : undefined}>
        <path d="M8 2.5v7" />
        <path d="M4.8 6.8 8 10l3.2-3.2" />
      </g>
      <path d="M3 13.2h10" />
    </svg>
  );
}

/**
 * Saves `text` as a file. A Blob URL, so nothing is uploaded to build it. The
 * confirmation drops the arrow into its tray on each save.
 */
export function DownloadButton({
  text,
  filename,
  mime,
  tool,
  children,
}: {
  text: string;
  filename: string;
  mime: string;
  tool: string;
  children: ReactNode;
}) {
  const [saved, confirm] = useConfirm();
  // Keys the confirmation, so a second save inside two seconds replays it.
  const [saves, setSaves] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          const url = URL.createObjectURL(new Blob([text], { type: mime }));
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          setSaves((count) => count + 1);
          confirm();
          track(tool, "download");
        }}
        className="tool-press min-h-10 rounded-full bg-[#01b4c8] px-4 text-[14px] font-semibold text-white hover:bg-[#019fb1]"
      >
        <SwapLabel
          done={saved}
          idle={
            <>
              <DownloadIcon />
              {children}
            </>
          }
          confirmed={
            <span key={saves} className="inline-flex items-center gap-1.5">
              <DownloadIcon dropping />
              Saved {filename}
            </span>
          }
        />
      </button>
      <span aria-live="polite" className="sr-only">
        {saved ? `Saved ${filename}` : ""}
      </span>
    </>
  );
}

/** A labelled block of output with its own copy button. */
export function CodeBlock({
  label,
  code,
  tool,
}: {
  label: string;
  code: string;
  tool: string;
}) {
  return (
    <figure className="relative isolate mt-3 overflow-hidden rounded-xl border border-[#dcecef] bg-white">
      <ChangeFlash value={code} />
      <figcaption className="flex items-center justify-between gap-3 border-b border-[#eef3f5] px-3 py-2">
        <span className="min-w-0 truncate font-mono text-[12px] text-[#526b75]">
          {label}
        </span>
        <CopyButton text={code} tool={tool} />
      </figcaption>
      <pre className="max-h-[420px] overflow-auto p-3 text-[13px] leading-5 text-[#4e4646]">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

/**
 * The tool's result sentence. A polite live region that stays mounted, so a
 * screen reader hears each new answer, with a tint that fades out of it
 * whenever `changeKey` moves.
 */
export function LiveResult({
  changeKey,
  children,
}: {
  changeKey: string;
  children: ReactNode;
}) {
  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      className="relative isolate mt-6 rounded-xl border border-[#b6ecfb] bg-white p-4 text-[15px] leading-6 text-[#4e4646]"
    >
      <ChangeFlash value={changeKey} />
      {children}
    </p>
  );
}

/** One headline number that rolls into place when it changes. */
export function ToolStat({ label, value }: { label: string; value: string }) {
  const changes = useChangeCount(value);
  return (
    <div className="rounded-xl border border-[#dcecef] bg-white p-3">
      <dt className="text-[12px] leading-5 text-[#526b75]">{label}</dt>
      <dd className="font-geist tabular mt-1 overflow-hidden text-[24px] leading-tight text-[#4e4646]">
        <span key={changes} className={changes ? "tool-tick" : undefined}>
          {value}
        </span>
      </dd>
    </div>
  );
}

/**
 * The tool's frame. `ph-no-capture` keeps everything inside out of PostHog's
 * autocapture and blocks it in session replay, which otherwise records inputs
 * unmasked. That is what lets the page promise that typed values stay put.
 */
export function ToolFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="ph-no-capture mt-10 rounded-2xl border border-[#dcecef] bg-[#f7fbfc] p-4 sm:p-6"
    >
      <h2 id={titleId} className="sr-only">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The single call to action, placed directly under a tool's result. */
export function ToolCta({
  slug,
  pitch,
  label,
  plan,
  interval,
}: {
  slug: string;
  pitch: string;
  label: string;
  plan?: PaidPlanId;
  interval?: BillingInterval;
}) {
  return (
    <div className="mt-6 rounded-xl border border-[#b6ecfb] bg-white p-4 text-center sm:p-5">
      <p className="mx-auto max-w-xl text-[15px] leading-6 text-[#4e4646]">
        {pitch}
      </p>
      <StartLink
        source={`tool-${slug}`}
        plan={plan}
        interval={interval}
        className="site-cta mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white"
      >
        {label}
      </StartLink>
    </div>
  );
}

export const toolStyles = { labelClass, hintClass };
