/**
 * The Construct mascot silhouette, traced from the brand artwork. Centered
 * on the origin, 100 units tall; eyes are two capsules.
 */
export const mascotPath =
  "M45.5 0L45.7 3.2L46.7 6.6L48.5 10.3L50.1 14.4L51.2 18.6L51.6 23L51 27.1L50 31.2L48.3 35.1L46.3 38.9L43.4 41.9L40.1 44.6L36.5 46.8L32.7 48.4L28.5 49.3L24.1 49.4L19.8 49L15.5 47.8L11.4 45.8L7.7 43.5L4.5 42.6L1.5 41.9L-1.5 41.9L-4.5 42.8L-7.7 43.9L-11.5 46L-15.7 48.2L-20 49.5L-24.4 50.1L-28.7 49.6L-32.8 48.6L-36.7 47L-40.4 44.9L-43.4 41.9L-46.3 38.9L-48.5 35.2L-50.2 31.3L-51.1 27.2L-51.6 23L-51.2 18.6L-49.9 14.3L-48.1 10.2L-46.5 6.5L-45.7 3.2L-45.3 0L-45.7 -3.2L-46.5 -6.5L-48.5 -10.3L-50.1 -14.4L-51.2 -18.6L-51.6 -23L-51.1 -27.2L-50 -31.2L-48.3 -35.1L-46.1 -38.7L-43.2 -41.7L-40 -44.4L-36.4 -46.5L-32.3 -47.9L-28.2 -48.8L-23.8 -48.9L-19.6 -48.4L-15.3 -47L-11.2 -45L-7.6 -43.1L-4.5 -42.3L-1.5 -41.9L1.5 -42.1L4.5 -43L7.8 -44.3L11.7 -46.8L15.8 -48.6L20.1 -49.7L24.4 -50.1L28.7 -49.6L33 -48.9L36.7 -47L40.4 -44.9L43.4 -41.9L46.3 -38.9L48.5 -35.2L50.2 -31.3L51 -27.1L51.6 -23L51 -18.6L49.9 -14.3L47.9 -10.2L46.3 -6.5L45.5 -3.2Z";

/** White mascot with see-through eyes; `eyes` paints the eye capsules. */
export function Mascot({
  className,
  eyes,
}: {
  className?: string;
  eyes: string;
}) {
  return (
    <svg className={className} viewBox="-52 -51 104 102" aria-hidden>
      <path d={mascotPath} fill="#fff" />
      <rect
        x="-22.9"
        y="-17.7"
        width="16.3"
        height="34.8"
        rx="8.15"
        fill={eyes}
      />
      <rect
        x="6.6"
        y="-17.7"
        width="16.3"
        height="34.8"
        rx="8.15"
        fill={eyes}
      />
    </svg>
  );
}
