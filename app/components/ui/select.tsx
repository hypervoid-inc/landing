import type { SelectHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

/**
 * Deliberately a native <select>.
 *
 * The OS forbids native selects (apps/web/docs/glass-surfaces.md) because OS
 * dropdown chrome breaks its frosted-glass surfaces. That reasoning doesn't
 * transfer to a light marketing page, and native buys real mobile pickers plus
 * complete keyboard and screen-reader behaviour for free.
 */
export function Select({
  className,
  label,
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Array<{ value: string; label: string }>;
}) {
  const selectId = props.id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          {...props}
          id={selectId}
          className={cn(
            "w-full appearance-none rounded-[var(--radius-control)] border",
            "border-[var(--color-line)] bg-white py-2.5 pr-9 pl-3",
            "text-sm text-[var(--color-ink)] outline-none",
            "transition-[border-color] duration-[var(--dur-hover)]",
            "focus:border-[var(--color-brand)]",
            "disabled:opacity-55",
            className,
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--color-ink-subtle)]"
        >
          <path
            d="M6 8l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
