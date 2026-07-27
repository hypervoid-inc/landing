# Mobile Hero Spacing Plan

## Goal

Keep the mobile hero centered on tall screens while preserving readable spacing between the headline, CTA, and artwork on short screens.

## Implementation

1. Extend the existing hero E2E coverage to 320x568 and 390x667 viewports.
2. Give the mobile hero responsive row spacing and vertical padding instead of a fixed media margin.
3. Run the focused E2E test and the project checks.

## Acceptance Criteria

- Hero copy remains horizontally centered at mobile widths.
- The CTA and artwork retain at least 40px of separation.
- Short screens scroll rather than shrinking or overlapping hero content.
- Existing tall-mobile and desktop centering behavior remains intact.

## Risk

The hero becomes taller than very short viewports by design; this preserves content readability instead of compressing the artwork.
