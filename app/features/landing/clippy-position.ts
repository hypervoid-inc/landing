/**
 * Breathing room between the widget and the viewport edges. Used for both the
 * resting anchor and the drag bounds, so the place it starts is always a place
 * it is allowed to be.
 */
export const CLIPPY_EDGE_MARGIN = 36;

export type ClippyPosition = { x: number; y: number };

export type ClippyViewport = {
  width: number;
  height: number;
  /** SiteHeader is sticky, so the widget must never park underneath it. */
  headerHeight: number;
  margin: number;
  widgetWidth: number;
  widgetHeight: number;
};

function clippyBounds(viewport: ClippyViewport) {
  const minX = viewport.margin;
  const minY = viewport.headerHeight + viewport.margin;
  return {
    minX,
    minY,
    maxX: Math.max(
      minX,
      viewport.width - viewport.margin - viewport.widgetWidth,
    ),
    maxY: Math.max(
      minY,
      viewport.height - viewport.margin - viewport.widgetHeight,
    ),
  };
}

export function clampClippyPosition(
  position: ClippyPosition,
  viewport: ClippyViewport,
): ClippyPosition {
  const bounds = clippyBounds(viewport);
  return {
    x: Math.round(Math.min(bounds.maxX, Math.max(bounds.minX, position.x))),
    y: Math.round(Math.min(bounds.maxY, Math.max(bounds.minY, position.y))),
  };
}

/**
 * Resting place before the visitor has dragged it anywhere: the bottom right of
 * the drag area. This is a fixed point of clampClippyPosition by construction,
 * which clippy-position.test.ts asserts.
 */
export function getClippyAnchor(viewport: ClippyViewport): ClippyPosition {
  const bounds = clippyBounds(viewport);
  return { x: bounds.maxX, y: bounds.maxY };
}
