import { formatChance, formatCount, onePassSuccess } from "./reliability-math";

const W = 600;
const H = 230;
const PAD = { left: 44, right: 16, top: 18, bottom: 34 };
const SAMPLES = 120;

const x = (steps: number, max: number) =>
  PAD.left + (steps / max) * (W - PAD.left - PAD.right);
const y = (chance: number) =>
  PAD.top + (1 - chance) * (H - PAD.top - PAD.bottom);

/** A round axis end that keeps the job, and the half-life when near, in view. */
function axisEnd(steps: number, halfLife: number): number {
  const wanted = Math.max(
    steps * 1.25,
    Math.min(halfLife * 2.2, steps * 4),
    10,
  );
  const magnitude = 10 ** Math.floor(Math.log10(wanted));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= wanted)!;
  return step * magnitude;
}

/**
 * The one-run success curve for the calculator's per-step rate, redrawn as
 * the reader types: how likely a run of n steps is to get through, with the
 * half-life, the whole job and, when it is cut into pieces, one piece marked
 * on it. The drop from the job's mark to a piece's mark is what
 * checkpointing buys.
 */
export function ReliabilityCurve({
  stepSuccess,
  steps,
  pieceSize,
  halfLife,
}: {
  stepSuccess: number;
  steps: number;
  /** The largest piece, when the job is checkpointed. */
  pieceSize?: number;
  halfLife: number;
}) {
  const max = axisEnd(steps, halfLife);
  const points = Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const n = (index / SAMPLES) * max;
    return `${x(n, max).toFixed(1)},${y(onePassSuccess(stepSuccess, n)).toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  const area = `${line} L${x(max, max)},${y(0)} L${x(0, max)},${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) => share * max);

  const marks = [
    {
      n: steps,
      label: `Whole job: ${formatChance(onePassSuccess(stepSuccess, steps))}`,
      strong: true,
    },
    ...(pieceSize && pieceSize < steps
      ? [
          {
            n: pieceSize,
            label: `One piece: ${formatChance(onePassSuccess(stepSuccess, pieceSize))}`,
            strong: false,
          },
        ]
      : []),
  ];

  return (
    <figure className="mt-4 rounded-lg border border-[#e5e7eb] bg-white p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Chance a run gets through n steps at ${formatChance(stepSuccess)} per step. ${marks.map((mark) => mark.label).join(". ")}.`}
      >
        <defs>
          <linearGradient id="reliability-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#01b4c8" stopOpacity="0.18" />
            <stop offset="1" stopColor="#01b4c8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((chance) => (
          <g key={chance}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(chance)}
              y2={y(chance)}
              stroke="#eff3f5"
            />
            <text
              x={PAD.left - 8}
              y={y(chance) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#8a9aa2"
            >
              {chance * 100}%
            </text>
          </g>
        ))}
        {ticks.map((n) => (
          <text
            key={n}
            x={x(n, max)}
            y={H - 12}
            textAnchor="middle"
            fontSize="11"
            fill="#8a9aa2"
          >
            {formatCount(n)}
          </text>
        ))}
        <text
          x={W - PAD.right}
          y={H - 0.5}
          textAnchor="end"
          fontSize="10"
          letterSpacing="1"
          fill="#8a9aa2"
        >
          STEPS
        </text>
        <path d={area} fill="url(#reliability-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#01b4c8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {Number.isFinite(halfLife) && halfLife <= max && (
          <g>
            <line
              x1={x(halfLife, max)}
              x2={x(halfLife, max)}
              y1={y(0.5)}
              y2={y(0)}
              stroke="#01b4c8"
              strokeDasharray="3 4"
            />
            <line
              x1={PAD.left}
              x2={x(halfLife, max)}
              y1={y(0.5)}
              y2={y(0.5)}
              stroke="#01b4c8"
              strokeDasharray="3 4"
            />
            <text
              x={x(halfLife, max) + 6}
              y={y(0.5) - 6}
              fontSize="11"
              fill="#526b75"
            >
              Half-life {formatCount(halfLife)}
            </text>
          </g>
        )}
        {marks.map((mark) => {
          const cx = x(mark.n, max);
          const cy = y(onePassSuccess(stepSuccess, mark.n));
          const right = cx > W * 0.62;
          return (
            <g key={mark.label}>
              <circle
                cx={cx}
                cy={cy}
                r="5.5"
                fill="#fff"
                stroke={mark.strong ? "#018fa0" : "#4fb2f0"}
                strokeWidth="2.4"
              />
              <text
                x={right ? cx - 10 : cx + 10}
                y={cy - 10}
                textAnchor={right ? "end" : "start"}
                fontSize="12"
                fontWeight="600"
                fill="#4e4646"
              >
                {mark.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
