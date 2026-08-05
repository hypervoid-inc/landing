import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Animates between login panels instead of swapping them instantly.
 *
 * Two things are happening: the panel itself is direction-aware (advancing
 * slides in from the right, going back from the left, so navigation has a sense
 * of direction), and the frame animates its height so the card doesn't jump
 * when a taller panel replaces a shorter one.
 */
export function AuthPanelFrame({
  panelKey,
  depth,
  children,
}: {
  /** Changes when the visible panel changes; drives the enter animation. */
  panelKey: string;
  /** Position in the flow. Higher means further along. */
  depth: number;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Adjusting state during render (React's documented pattern for deriving from
  // changed props) rather than reading a ref, which isn't safe during render.
  const [lastDepth, setLastDepth] = useState(depth);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  if (lastDepth !== depth) {
    setDirection(depth >= lastDepth ? "forward" : "back");
    setLastDepth(depth);
  }

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    // Measure the new panel and animate the frame to it. ResizeObserver keeps
    // the height honest when a panel grows later (a validation error appearing).
    const sync = () => setHeight(element.offsetHeight);
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [panelKey, depth]);

  return (
    <div
      className="auth-panel-frame relative overflow-hidden"
      style={height == null ? undefined : { height }}
    >
      <div ref={contentRef}>
        <div key={panelKey} className="auth-panel" data-direction={direction}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Depth of each panel in the flow, for deciding slide direction. */
export const PANEL_DEPTH: Record<string, number> = {
  signin: 0,
  create: 1,
  forgot: 1,
  reset: 1,
  "magic-otp": 1,
  "create-otp": 2,
  "forgot-sent": 2,
  "set-password": 3,
};
