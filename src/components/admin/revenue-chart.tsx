import type { components } from "@/lib/api/schema";
import { bucketLabel, type Granularity } from "@/lib/admin/reports";
import { formatBRL } from "@/lib/format";

type Bucket = components["schemas"]["RevenueBucketResponse"];

/**
 * Gráfico de receita ao longo do tempo.
 *
 * Renderiza uma linha em degraus (step line) em SVG sobre linha de base,
 * com marcadores quadrados sobre a base para períodos de receita zero.
 * Os rótulos de valores e períodos são renderizados em HTML abaixo do gráfico
 * para manter acessibilidade e texto selecionável.
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
