import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  clampClippyPosition,
  getClippyAnchor,
  type ClippyPosition,
  type ClippyViewport,
} from "./clippy-position";

/** Below this a press is a click, above it a drag. Stops a 2px wobble eating the click. */
const DRAG_THRESHOLD_PX = 8;

type DragSession = {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  position: ClippyPosition;
  moved: boolean;
};

type ClippyDragOptions = {
  enabled: boolean;
  widgetWidth: number;
  widgetHeight: number;
  headerHeight: number;
  margin: number;
  /** Restored from the session record. null means "use the resting anchor". */
  initialPosition: ClippyPosition | null;
  onPlaced: (position: ClippyPosition) => void;
};

export function useClippyDrag({
  enabled,
  widgetWidth,
  widgetHeight,
  headerHeight,
  margin,
  initialPosition,
  onPlaced,
}: ClippyDragOptions) {
  const getViewport = useCallback(
    (): ClippyViewport => ({
      width: window.innerWidth,
      height: window.innerHeight,
      headerHeight,
      margin,
      widgetWidth,
      widgetHeight,
    }),
    [headerHeight, margin, widgetWidth, widgetHeight],
  );

  const [position, setPosition] = useState<ClippyPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const userPlacedRef = useRef(initialPosition !== null);
  const onPlacedRef = useRef(onPlaced);
  useEffect(() => {
    onPlacedRef.current = onPlaced;
  }, [onPlaced]);

  // Position is resolved here rather than in useState so nothing reads window
  // during render, which would break the prerender pass.
  useEffect(() => {
    // Wait for the real measurement. Anchoring against a zero-sized widget would
    // park it off the right edge for a frame before snapping back.
    if (!enabled || widgetWidth === 0 || widgetHeight === 0) return;
    const fit = () => {
      setPosition((current) => {
        const base = current ?? initialPosition ?? getClippyAnchor(getViewport());
        return userPlacedRef.current
          ? clampClippyPosition(base, getViewport())
          : getClippyAnchor(getViewport());
      });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [enabled, getViewport, initialPosition, widgetWidth, widgetHeight]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0 || dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const live = clampClippyPosition(
      position ?? { x: rect.left, y: rect.top },
      getViewport(),
    );
    setPosition(live);
    dragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      position: live,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    drag.moved = true;
    userPlacedRef.current = true;
    suppressClickRef.current = true;
    setIsDragging(true);
    setPosition(
      clampClippyPosition(
        { x: drag.position.x + deltaX, y: drag.position.y + deltaY },
        getViewport(),
      ),
    );
  };

  const finish = (
    event: ReactPointerEvent<HTMLElement>,
    releaseCapture: boolean,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (
      releaseCapture &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    if (drag.moved) {
      setPosition((current) => {
        if (current) onPlacedRef.current(current);
        return current;
      });
      // The click event lands after pointerup, so clear the guard a tick later.
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    suppressClickRef.current = false;
    setIsDragging(false);
  };

  const consumeSuppressedClick = (): boolean => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  };

  return {
    position,
    isDragging,
    consumeSuppressedClick,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: ReactPointerEvent<HTMLElement>) =>
        finish(event, true),
      onPointerCancel,
      onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) =>
        finish(event, false),
    },
  };
}
