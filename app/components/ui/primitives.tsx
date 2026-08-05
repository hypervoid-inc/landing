import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../../lib/cn";

/**
 * The account and login screens each used to re-declare their own `fieldClass`
 * / `btn` / `btnPrimary` string constants against raw hexes. These are the
 * shared vocabulary, built on the tokens in app.css.
 *
 * Press feedback lives in `Button` itself rather than an opt-in `.site-cta`
 * class, which is how the account buttons ended up with no feedback at all.
 */

export const buttonVariants = cva(
  cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4",
    "text-sm font-semibold whitespace-nowrap",
    "transition-[transform,background-color,border-color,box-shadow,color]",
    "duration-[var(--dur-hover)] ease-[var(--ease-snap)]",
    "active:scale-[0.97] active:duration-[var(--dur-press)]",
    "motion-reduce:transform-none",
    "disabled:pointer-events-none disabled:opacity-55",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "bg-black text-white",
          "hover:bg-[#172126] hover:shadow-[0_6px_16px_rgba(0,0,0,.2)]",
        ),
        secondary: cn(
          "border border-[var(--color-line)] bg-white text-[var(--color-ink)]",
          "hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-tint)]",
        ),
        ghost: cn(
          "text-[var(--color-ink-muted)]",
          "hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-ink)]",
        ),
        danger: cn(
          "border border-[var(--color-line)] bg-white text-[var(--color-danger)]",
          "hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]",
        ),
      },
      size: {
        md: "min-h-10 px-4 text-sm",
        sm: "min-h-8 px-3 text-xs",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "secondary", size: "md", full: false },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { busy?: boolean };

export function Button({
  className,
  variant,
  size,
  full,
  busy = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      // Busy is a disabled state *and* an announced one; `disabled` alone tells
      // assistive tech nothing about why.
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(buttonVariants({ variant, size, full }), className)}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent",
        "motion-safe:animate-spin",
      )}
    />
  );
}

export function Card({
  className,
  children,
  index,
  ...props
}: { className?: string; children: ReactNode; index?: number } & Omit<
  React.HTMLAttributes<HTMLElement>,
  "className" | "children"
>) {
  return (
    <section
      {...props}
      className={cn(
        "account-section rounded-[var(--radius-card)] border border-[var(--color-line)]",
        "bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]",
        className,
      )}
      style={
        index == null
          ? props.style
          : ({ ...props.style, "--section-index": index } as React.CSSProperties)
      }
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {/* Tighter tracking as size grows, per the type scale. */}
        <h2 className="font-geist text-lg font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Rare-config sections on /account. Collapsed by default so primary status
 * (plan, usage, profile) stays above the fold.
 */
export function CollapsibleCard({
  title,
  summary,
  index,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  /** Shown next to the title while collapsed (e.g. "3 sessions"). */
  summary?: string;
  index?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `collapsible-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <Card index={index} className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left",
          "rounded-[var(--radius-control)]",
        )}
      >
        <div className="min-w-0">
          <h2 className="font-geist text-lg font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
            {title}
          </h2>
          {!open && summary ? (
            <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
              {summary}
            </p>
          ) : null}
        </div>
        <Chevron
          className={cn(
            "size-5 shrink-0 text-[var(--color-ink-muted)]",
            "transition-transform duration-[var(--dur-hover)] ease-[var(--ease-snap)]",
            "motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        // Keep children mounted so password/BYOK form state survives collapse.
        className={cn(!open && "hidden")}
      >
        {children}
      </div>
    </Card>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Label + value + optional control, with a hairline rule between rows. */
export function Row({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 py-3",
        "border-t border-[var(--color-line-soft)] first:border-t-0",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
        >
          {label}
        </label>
      ) : null}
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          "w-full rounded-[var(--radius-control)] border bg-white px-3 py-2.5",
          "text-sm text-[var(--color-ink)] outline-none",
          "transition-[border-color,box-shadow] duration-[var(--dur-hover)]",
          "placeholder:text-[var(--color-ink-subtle)]",
          error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-line)] focus:border-[var(--color-brand)]",
          className,
        )}
      />
      {error && errorId ? (
        <p id={errorId} className="mt-1 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Meter({
  label,
  value,
  detail,
}: {
  label: string;
  /** 0-100. */
  value: number;
  detail?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  // Colour is never the only signal — the percentage is always shown too.
  const tone =
    pct >= 90
      ? "bg-[var(--color-danger)]"
      : pct >= 75
        ? "bg-[#b54708]"
        : "bg-[var(--color-brand)]";

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-[var(--color-ink)]">{label}</p>
        <p className="tabular text-sm font-semibold text-[var(--color-ink)]">
          {pct}%
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-line-soft)]"
      >
        <div className={cn("meter-fill h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      {detail ? (
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "positive" | "warning" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-[var(--color-line-soft)] text-[var(--color-ink-muted)]",
    positive: "bg-[#ecfdf3] text-[var(--color-positive)]",
    warning: "bg-[var(--color-warn-tint)] text-[#b54708]",
    danger: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton rounded-[var(--radius-control)]", className)}
    />
  );
}

/**
 * Status messages. `aria-live` matters here: the old page swapped banner text
 * with no announcement, so a screen-reader user got no confirmation at all.
 */
export function Banner({
  tone,
  children,
  onDismiss,
}: {
  tone: "info" | "error" | "warning";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const tones = {
    info: "bg-[var(--color-brand-tint)] text-[var(--color-brand-strong)]",
    error: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
    warning: "bg-[var(--color-warn-tint)] text-[#b54708]",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "banner-enter mt-4 flex items-start justify-between gap-3 rounded-[var(--radius-control)]",
        "px-3 py-2 text-sm",
        tones[tone],
      )}
    >
      <p className="min-w-0">{children}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded px-1 opacity-70 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

/** Failed section content, with the retry the old page never offered. */
export function ErrorState({
  message,
  onRetry,
  busy,
}: {
  message: string;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <div role="status" className="py-6 text-center">
      <p className="text-sm text-[var(--color-ink-muted)]">{message}</p>
      {onRetry ? (
        <Button size="sm" className="mt-3" onClick={onRetry} busy={busy}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
