import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { captureAnalytics } from "../analytics/analytics.client";
import { sanitizePathname } from "../analytics/sanitize-event";
import { StartLink, useBetaDialogOpen } from "./beta-access";
import {
  CLIPPY_CTA_LABEL,
  CLIPPY_HIDE_LABEL,
  CLIPPY_MINIMIZE_LABEL,
  CLIPPY_MIN_DWELL_MS,
  CLIPPY_REOPEN_LABEL,
  beatsFor,
  ctaSource,
  getClippyPageKind,
  initialClippyRecord,
  initialClippyTimer,
  resolveClippyDelay,
  tickClippyTimer,
  type ClippyRecord,
} from "./clippy-state";
import { CLIPPY_EDGE_MARGIN, type ClippyPosition } from "./clippy-position";
import { useClippyDrag } from "./use-clippy-drag";
import { useDesktop, usePrefersReducedMotion } from "./media";
import "./clippy.css";

/** How far the eyes travel toward the pointer, as a percentage of the screen box. */
const GAZE_RANGE = 9;
const GAZE_RADIUS_PX = 420;

/**
 * Banked foreground time, module scoped so it survives client navigation and
 * resets on a hard load. Never read during render.
 */
let bankedTimer = initialClippyTimer;

export function ClippyCta() {
  const location = useLocation();
  const desktop = useDesktop();
  const reducedMotion = usePrefersReducedMotion();
  const betaDialogOpen = useBetaDialogOpen();

  /*
   * Dismiss, beat, and drag position live in React state only. A hard refresh
   * remounts clean so the tip always re-arms after the dwell delay, including
   * for beta users. SPA navigations keep this tree mounted, so a dismiss
   * sticks until that refresh.
   */
  const [record, setRecord] = useState<ClippyRecord>(initialClippyRecord);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  const frameRef = useRef<HTMLDivElement>(null);
  const shownAtRef = useRef(0);
  const lastOutsideFocusRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef(false);

  const pageKind = getClippyPageKind(location.pathname);
  const path = String(sanitizePathname(location.pathname));
  const beats = pageKind ? beatsFor(pageKind) : [];
  const beatIndex = Math.min(record.beat, Math.max(0, beats.length - 1));
  const beat = beats[beatIndex];
  const isLastBeat = beatIndex >= beats.length - 1;

  const persist = useCallback((next: ClippyRecord) => {
    setRecord(next);
  }, []);

  // Dwell timer. Requires both banked time and a minimum stay on this page, so
  // arriving on a new post with the full delay already banked does not pop
  // instantly. Beta access never suppresses the tip.
  const armed = record.state !== "hidden";
  const delay = armed && pageKind ? resolveClippyDelay(location.search) : null;
  useEffect(() => {
    if (delay === null || visible) return;
    const mountedAt = Date.now();
    const minDwell = Math.min(delay, CLIPPY_MIN_DWELL_MS);

    const tick = () => {
      bankedTimer = tickClippyTimer(
        bankedTimer,
        Date.now(),
        document.visibilityState === "visible",
      );
      if (
        bankedTimer.elapsedMs >= delay &&
        Date.now() - mountedAt >= minDwell
      ) {
        setVisible(true);
      }
    };
    // Re-anchor on tab switch so the hidden stretch is never credited.
    const onVisibility = () => {
      bankedTimer = { ...bankedTimer, lastTickMs: null };
    };

    const id = window.setInterval(tick, 1_000);
    document.addEventListener("visibilitychange", onVisibility);
    tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [delay, visible]);

  const showing = visible && record.state !== "hidden" && pageKind !== null;

  useEffect(() => {
    if (!showing || shownAtRef.current) return;
    shownAtRef.current = Date.now();
    captureAnalytics("clippy_shown", {
      page_kind: pageKind,
      path,
      delay_ms: Math.round(bankedTimer.elapsedMs),
    });
  }, [showing, pageKind, path]);

  // Measure the frame so the drag bounds match what is actually on screen.
  useEffect(() => {
    const node = frameRef.current;
    if (!node || !showing) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [showing, record.state, beatIndex, desktop]);

  const onPlaced = useCallback(
    (position: ClippyPosition) => {
      captureAnalytics("clippy_dragged", { page_kind: pageKind, path });
      persist({ ...record, position });
    },
    [pageKind, path, persist, record],
  );

  const drag = useClippyDrag({
    enabled: desktop && showing,
    widgetWidth: size.width,
    widgetHeight: size.height,
    headerHeight: 56,
    margin: CLIPPY_EDGE_MARGIN,
    initialPosition: record.position,
    onPlaced,
  });

  // Eyes follow the pointer. Skipped on touch and under reduced motion.
  useEffect(() => {
    if (!showing || reducedMotion || !desktop || drag.isDragging) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const node = frameRef.current?.querySelector(".clippy-screen");
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / GAZE_RADIUS_PX);
        setGaze({
          x: (dx / distance) * GAZE_RANGE * reach,
          y: (dy / distance) * GAZE_RANGE * reach,
        });
      });
    };

    document.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [showing, reducedMotion, desktop, drag.isDragging]);

  // Remember where focus was, so Escape can hand it back.
  useEffect(() => {
    if (!showing) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !frameRef.current?.parentElement?.contains(target)) {
        lastOutsideFocusRef.current = target;
      }
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [showing]);

  const dismiss = useCallback(
    (to: "collapsed" | "hidden", reason: "close" | "escape") => {
      const root = frameRef.current?.parentElement;
      const hadFocus = root?.contains(document.activeElement) ?? false;
      captureAnalytics(to === "hidden" ? "clippy_hidden" : "clippy_collapsed", {
        page_kind: pageKind,
        path,
        beat: beatIndex + 1,
        visible_ms: Date.now() - shownAtRef.current,
        reason,
      });
      persist({ ...record, state: to });
      if (hadFocus) {
        (lastOutsideFocusRef.current ?? document.body).focus?.();
      }
    },
    [beatIndex, pageKind, path, persist, record],
  );

  // Escape collapses first, then hides. Never fights Radix's own handling.
  useEffect(() => {
    if (!showing || betaDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      dismiss(record.state === "open" ? "collapsed" : "hidden", "escape");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showing, betaDialogOpen, dismiss, record.state]);

  // The chip vanishes on the last beat, so send focus to the CTA it became.
  useEffect(() => {
    if (!pendingFocusRef.current || !isLastBeat) return;
    pendingFocusRef.current = false;
    frameRef.current
      ?.querySelector<HTMLAnchorElement>(".clippy-pill")
      ?.focus();
  }, [isLastBeat, beatIndex]);

  if (!visible || record.state === "hidden" || !pageKind || !beat) return null;

  const open = record.state === "open";

  const advance = () => {
    captureAnalytics("clippy_advanced", {
      page_kind: pageKind,
      path,
      beat: beatIndex + 2,
    });
    if (beatIndex + 1 >= beats.length - 1) pendingFocusRef.current = true;
    persist({ ...record, beat: beatIndex + 1 });
  };

  const reopen = () => {
    if (drag.consumeSuppressedClick()) return;
    captureAnalytics("clippy_reopened", { page_kind: pageKind, path });
    persist({ ...record, state: "open" });
  };

  /*
   * Always pinned to the sprite's outer top corner, so it stays put whether the
   * bubble is open or collapsed.
   */
  const closeButton = (
    <button
      type="button"
      className="clippy-close"
      aria-label={open ? CLIPPY_MINIMIZE_LABEL : CLIPPY_HIDE_LABEL}
      onClick={() => dismiss(open ? "collapsed" : "hidden", "close")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <X aria-hidden className="h-3 w-3" />
    </button>
  );

  const copy = (
    <>
      <p className="clippy-line">{beat.line}</p>
      <div className="clippy-actions">
        {beat.advance && (
          <button type="button" className="clippy-chip" onClick={advance}>
            {beat.advance}
          </button>
        )}
        <StartLink
          source={ctaSource(pageKind, beatIndex)}
          className="clippy-pill"
          onClick={() =>
            captureAnalytics("clippy_cta_clicked", {
              page_kind: pageKind,
              path,
              beat: beatIndex + 1,
              visible_ms: Date.now() - shownAtRef.current,
            })
          }
        >
          {CLIPPY_CTA_LABEL}
        </StartLink>
      </div>
    </>
  );

  return (
    <aside
      aria-label="Construct"
      className="clippy-widget"
      data-open={open ? "true" : "false"}
      data-variant={desktop ? "desktop" : "mobile"}
      data-dragging={drag.isDragging ? "true" : "false"}
      data-beta-open={betaDialogOpen ? "true" : "false"}
      data-placed={!desktop || drag.position ? "true" : "false"}
      style={
        desktop && drag.position
          ? {
              transform: `translate3d(${drag.position.x}px, ${drag.position.y}px, 0)`,
            }
          : undefined
      }
    >
      <div className="clippy-frame" ref={frameRef}>
        {open &&
          (desktop ? (
            <div className="clippy-bubble">
              <div className="clippy-copy" key={beatIndex}>
                {copy}
              </div>
            </div>
          ) : (
            <div className="clippy-card">
              <div className="clippy-copy" key={beatIndex}>
                {copy}
              </div>
              {closeButton}
            </div>
          ))}

        <div
          className="clippy-sprite"
          {...(desktop && open ? drag.pointerHandlers : {})}
        >
          <img
            className="clippy-sprite-art"
            src="/assets/landing/clippy/computer.webp"
            alt=""
            width={480}
            height={449}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          <span className="clippy-screen" aria-hidden="true">
            <img
              className="clippy-screen-logo"
              src="/assets/landing/clippy/screen-logo.webp"
              alt=""
              width={200}
              height={196}
              loading="lazy"
              decoding="async"
              draggable={false}
              style={{ transform: `translate(${gaze.x}%, ${gaze.y}%)` }}
            />
          </span>
          {!open && (
            <button
              type="button"
              className="clippy-reopen"
              aria-label={CLIPPY_REOPEN_LABEL}
              onClick={reopen}
              {...(desktop ? drag.pointerHandlers : {})}
            />
          )}
          {/* Mobile keeps it on the card; the bare sprite carries it otherwise. */}
          {(desktop || !open) && closeButton}
        </div>
      </div>

      {/* Stable live region. The visible copy is keyed per beat, and replacing a
          live region rather than mutating it stops screen readers announcing. */}
      <span className="sr-only" role="status" aria-live="polite">
        {open ? beat.line : ""}
      </span>
    </aside>
  );
}
