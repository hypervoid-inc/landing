import { useId } from "react";

import { cn } from "../../lib/cn";
import {
  HEARD_ABOUT_DETAIL_MAX,
  HEARD_ABOUT_OPTIONS,
  isHeardAbout,
  type HeardAbout,
} from "./heard-about";

/**
 * One native select so it costs a single row above the Google button, with a
 * short text box only once "Other" is picked. Optional, and nothing about it
 * can block sign-in.
 */
export function HeardAboutField({
  appearance,
  fieldClassName,
  value,
  detail,
  onChange,
  onDetailChange,
}: {
  appearance: "page" | "dialog";
  fieldClassName: string;
  value: HeardAbout | "";
  detail: string;
  onChange: (value: HeardAbout | "") => void;
  onDetailChange: (value: string) => void;
}) {
  const legendId = useId();
  const detailId = useId();

  return (
    <fieldset className="mx-0 mt-0 mb-3 min-w-0 space-y-2 border-0 p-0 text-left">
      <legend
        id={legendId}
        className={cn(
          "mb-1.5 p-0",
          appearance === "dialog"
            ? "text-[13px] leading-[18px] text-[#627c86]"
            : "text-sm text-[#627c86]",
        )}
      >
        How did you hear about us?{" "}
        <span className="text-[#8aa1a9]">(optional)</span>
      </legend>
      <select
        aria-labelledby={legendId}
        className={cn(
          fieldClassName,
          "cursor-pointer appearance-auto",
          value === "" && "text-[#8aa1a9]",
        )}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(isHeardAbout(next) ? next : "");
        }}
      >
        <option value="">Pick one if you like</option>
        {HEARD_ABOUT_OPTIONS.map(([slug, label]) => (
          <option key={slug} value={slug} className="text-[#4e4646]">
            {label}
          </option>
        ))}
      </select>
      {value === "other" ? (
        <>
          <label htmlFor={detailId} className="sr-only">
            Where did you hear about us?
          </label>
          <input
            id={detailId}
            // Kept out of session replay; only the scrubbed text is sent.
            className={cn(fieldClassName, "ph-no-capture")}
            type="text"
            maxLength={HEARD_ABOUT_DETAIL_MAX}
            autoComplete="off"
            placeholder="Where was it?"
            value={detail}
            onChange={(event) => onDetailChange(event.target.value)}
          />
        </>
      ) : null}
    </fieldset>
  );
}
