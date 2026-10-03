import { useId, type ReactNode } from "react";

/**
 * Shared building blocks for the in-post calculators. Everything renders on
 * the server first (the blog is prerendered), so nothing here touches
 * `window` or `document`; state lives in the calculators themselves.
 */

/**
 * Reads a typed value, or null when it is empty, not a number, or outside
 * the allowed range. Inputs keep the raw string so a reader can clear a field
 * and type a new value without it snapping back mid-edit.
 */
export function parseField(raw: string, min: number, max: number) {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function CalculatorFrame({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="my-8 rounded-2xl border border-[#dcecef] bg-[#f7fbfc] p-4 sm:p-6"
    >
      <h3
        id={titleId}
        className="font-geist text-[20px] italic leading-tight text-[#4e4646]"
      >
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-6 text-[#526b75]">{intro}</p>
      {children}
    </section>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  invalid,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  invalid: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, invalid ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[13px] font-medium leading-5 text-[#4e4646]"
      >
        {label}
      </label>
      <div
        className={`mt-1.5 flex items-center rounded-lg border bg-white px-3 focus-within:border-[#01b4c8] ${
          invalid ? "border-[#b42318]" : "border-[#d7dee2]"
        }`}
      >
        {prefix && (
          <span aria-hidden className="pr-1 text-[15px] text-[#526b75]">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          // 16px stops iOS Safari zooming the page on focus.
          className="w-full min-w-0 bg-transparent py-2 text-[16px] text-[#4e4646] outline-none"
        />
        {suffix && (
          <span
            aria-hidden
            className="whitespace-nowrap pl-1 text-[14px] text-[#526b75]"
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[12px] leading-5 text-[#526b75]">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="mt-1 text-[12px] leading-5 text-[#b42318]">
          Enter a number from {min.toLocaleString("en-US")} to{" "}
          {max.toLocaleString("en-US")}.
        </p>
      )}
    </div>
  );
}

/**
 * A labelled set of radio buttons. Native inputs inside a fieldset, so arrow
 * keys move between options and the legend names the group.
 */
export function ChoiceField<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; hint: string }[];
}) {
  const name = useId();
  return (
    <fieldset className="mt-4">
      <legend className="text-[13px] font-medium leading-5 text-[#4e4646]">
        {legend}
      </legend>
      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex cursor-pointer gap-2.5 rounded-lg border bg-white p-3 ${
                value === option.value
                  ? "border-[#01b4c8]"
                  : "border-[#d7dee2] hover:border-[#01b4c8]"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1 accent-[#01b4c8]"
              />
              <span>
                <span className="block text-[14px] font-medium leading-5 text-[#4e4646]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-5 text-[#526b75]">
                  {option.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export type Preset = {
  readonly label: string;
  readonly active: boolean;
  readonly apply: () => void;
};

/** A row of one-tap starting points. `aria-pressed` shows which is current. */
export function PresetRow({
  label,
  presets,
}: {
  label: string;
  presets: readonly Preset[];
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <p
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#526b75]"
      >
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={id}
        className="mt-2 flex flex-wrap gap-2"
      >
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            aria-pressed={preset.active}
            onClick={preset.apply}
            className={`rounded-full border px-3 py-1.5 text-[13px] leading-5 transition-colors ${
              preset.active
                ? "border-[#01b4c8] bg-[#effbfc] text-[#017b89]"
                : "border-[#d7dee2] bg-white text-[#4e4646] hover:border-[#01b4c8]"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One headline number. Rendered inside a `dl`. */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dcecef] bg-white p-3">
      <dt className="text-[12px] leading-5 text-[#526b75]">{label}</dt>
      <dd className="font-geist mt-1 text-[24px] leading-tight text-[#4e4646]">
        {value}
      </dd>
    </div>
  );
}

/**
 * The polite live region. It holds one plain sentence that restates the
 * result, so a screen reader hears a complete answer after each edit rather
 * than a run of changed table cells with no context.
 */
export function ResultSummary({ children }: { children: ReactNode }) {
  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      className="mt-6 rounded-xl border border-[#b6ecfb] bg-white p-4 text-[15px] leading-6 text-[#4e4646]"
    >
      {children}
    </p>
  );
}
