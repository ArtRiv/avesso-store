import type { components } from "@/lib/api/schema";
import { bucketLabel, type Granularity } from "@/lib/admin/reports";
import { formatBRL } from "@/lib/format";

type Bucket = components["schemas"]["RevenueBucketResponse"];

/**
 * Revenue over time, traced from the artboard: a step line in ink over a
 * hairline baseline, with an 8px square sitting ON the baseline wherever a
 * period measured zero.
 *
 * The step is the right mark and not a stylistic choice. A bucket is a value
 * that holds for a whole week or month, so a flat segment spanning the band
 * says what happened; a sloped line between midpoints would draw revenue
 * arriving gradually on days nobody measured.
 *
 * **The zero marker is the point of the whole chart.** The API returns a
 * continuous series — an empty week comes back as a zero bucket rather than as
 * a gap — and a line lying flat on the baseline is invisible against the
 * baseline itself. The square is what makes a measured zero legible as a
 * measurement, which is the difference between "we sold nothing that week" and
 * "we have no data for that week". The legend underneath names it.
 *
 * No library, and none is missing: this is a scale and a loop. A library would
 * arrive with the rounded surface, the drop shadow and the gradient fill that
 * docs/design-system.md §7 forbids outright.
 *
 * `preserveAspectRatio="none"` lets the plot stretch to the card, and
 * `vector-effect="non-scaling-stroke"` is what keeps the 2px stroke 2px through
 * that stretch. Both are the artboard's own. No text lives inside the SVG — the
 * labels are HTML in a grid below, so nothing is distorted by the stretch and
 * every value is real selectable text.
 */

const W = 1080;
const H = 220;
const PAD = 6;
const BASE = H - PAD;
const TOP = PAD + 6;

/** The square that marks a measured zero. 8×8, on the baseline. */
const ZERO_MARK = 8;

export function RevenueChart({
  buckets,
  granularity,
  timeZone,
}: {
  buckets: readonly Bucket[];
  granularity: Granularity;
  timeZone: string;
}) {
  const peak = buckets.reduce(
    (highest, bucket) => Math.max(highest, bucket.revenueCents),
    0,
  );

  const step = W / buckets.length;

  const y = (cents: number) =>
    peak === 0 ? BASE : BASE - (cents / peak) * (BASE - TOP);

  const path = buckets
    .map((bucket, index) => {
      const x0 = index * step;
      const x1 = (index + 1) * step;
      const yy = y(bucket.revenueCents);

      return `${index === 0 ? "M" : "L"}${String(x0)} ${String(yy)} L${String(x1)} ${String(yy)}`;
    })
    .join(" ");

  return (
    <div className="flex items-stretch gap-5">
      {/* The axis. Three gradations: the largest bucket, half of it, and zero.
          The top is a bucket's own value, so the axis never states a rounded
          ceiling the API never sent; the midpoint is a gradation of the scale
          rather than a claim about any period. */}
      <div className="flex h-[220px] w-[88px] shrink-0 flex-col items-end justify-between py-1.5">
        <span className="font-mono text-[12px] tabular-nums text-admin-dim">
          {formatBRL(peak)}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-admin-dim">
          {formatBRL(Math.round(peak / 2))}
        </span>
        <span className="font-mono text-[12px] tabular-nums">
          {formatBRL(0)}
        </span>
      </div>

      <div className="flex flex-grow flex-col gap-2.5">
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${String(W)} ${String(H)}`}
          preserveAspectRatio="none"
          className="block overflow-visible"
          role="img"
          aria-label={`Receita paga por período, em ${String(buckets.length)} ${buckets.length === 1 ? "período" : "períodos"}, no fuso ${timeZone}. Cada valor está escrito abaixo do gráfico.`}
        >
          <line
            x1={0}
            y1={BASE}
            x2={W}
            y2={BASE}
            className="stroke-admin-hairline"
            strokeWidth={1}
          />
          <path
            d={path}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
            className="stroke-ink"
          />
          {buckets.map((bucket, index) =>
            bucket.revenueCents === 0 ? (
              <rect
                key={bucket.periodStart}
                x={index * step + step / 2 - ZERO_MARK / 2}
                y={BASE - ZERO_MARK / 2}
                width={ZERO_MARK}
                height={ZERO_MARK}
                className="fill-ink"
              />
            ) : null,
          )}
        </svg>

        {/* Every bucket's value, under its own band. This is what the chart
            would otherwise gate behind a pointer: the numbers are text, they
            are all here, and a zero is set in ink rather than muted because a
            week that measured nothing is the one worth reading twice. */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${String(buckets.length)}, minmax(0, 1fr))`,
          }}
        >
          {buckets.map((bucket) => (
            <div
              key={bucket.periodStart}
              className="flex flex-col items-center gap-1"
            >
              <span className="font-mono text-[11px] font-medium tracking-[0.06em] uppercase">
                {bucketLabel(bucket.periodStart, granularity)}
              </span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  bucket.revenueCents === 0 ? "text-ink" : "text-muted"
                }`}
              >
                {formatBRL(bucket.revenueCents)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The two marks the chart uses, named. Only shown when there is a line to read. */
export function ChartLegend({ granularity }: { granularity: Granularity }) {
  const noun = granularity === "week" ? "Semana" : "Mês";
  const adjective = granularity === "week" ? "medida" : "medido";

  return (
    <div className="flex flex-wrap items-center gap-8 border-t border-admin-hairline pt-4">
      <span className="flex items-center gap-2.5 text-[13px] text-muted">
        <span className="h-0.5 w-6 bg-ink" />
        Receita paga por {noun.toLowerCase()}
      </span>
      <span className="flex items-center gap-2.5 text-[13px] text-muted">
        <span className="size-2 bg-ink" />
        {noun} {adjective} em {formatBRL(0)} — o ponto fica na linha de base
      </span>
    </div>
  );
}
