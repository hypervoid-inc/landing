import { useEffect, useRef, useState, type ReactNode } from "react";

import { StartLink } from "../../features/landing/beta-access";
import { cn } from "../../lib/cn";
import "./start-cta.css";

/** Keep in step with the boot keyframes in `start-cta.css`. */
const BOOT_MS = 620;

/**
 * The nav's black pill, read as a small screen for the machine it starts:
 * light sweeps across the surface on hover, and pressing it sends a power-on
 * ring off the edge under the auth dialog. The one place in the chrome where
 * "your computer, awake" gets to act instead of be described.
 */
export function StartCta({
  source,
  label,
  className,
  children,
  authedChildren,
  onClick,
}: {
  source: string;
  label?: string;
  className?: string;
  children: ReactNode;
  authedChildren?: ReactNode;
  onClick?: () => void;
}) {
  const [booting, setBooting] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const body = (content: ReactNode) => (
    <>
      {/* Clipped by its own box so the pill can keep `overflow: visible` for
          the power-on ring, which expands past the pill's edge. */}
      <span aria-hidden className="start-cta-sheen" />
      <span className="start-cta-label">{content}</span>
    </>
  );

  return (
    <StartLink
      source={source}
      label={label}
      authedChildren={authedChildren != null ? body(authedChildren) : undefined}
      onClick={() => {
        window.clearTimeout(timer.current);
        setBooting(true);
        timer.current = window.setTimeout(() => setBooting(false), BOOT_MS);
        onClick?.();
      }}
      className={cn(
        "site-cta start-cta inline-flex items-center justify-center rounded-full bg-black font-semibold text-white",
        booting && "start-cta-booting",
        className,
      )}
    >
      {body(children)}
    </StartLink>
  );
}
