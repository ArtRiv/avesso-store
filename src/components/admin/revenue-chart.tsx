import type { components } from "@/lib/api/schema";
import {
  bucketAxisLabel,
  bucketRowLabel,
  type Granularity,
} from "@/lib/admin/reports";
import { formatBRL } from "@/lib/format";

type Bucket = components["schemas"]["RevenueBucketResponse"];

/**
 * Revenue by bucket, as inline SVG.
 *
 * No chart library, and none is missing. This is one series of columns over a
 * continuous time axis — the whole of it is a scale and a loop — and a library
 * would arrive with a rounded surface, a drop shadow and a gradient fill, all
 * three of which docs/design-system.md §7 forbids outright.
 *
 * Where the design and the usual chart advice disagree, the design wins:
 *
 * - **Square columns.** The received wisdom is a 4px rounded data-end. §1 puts
 *   the radius at 2px on buttons and fields and **0 on everything else**, and a
 *   chart is not an exception to a rule that specific.
 * - **One colour, and it is ink.** A second series would need a second hue, and
 *   §1 rations the only accent this design has to four places, none of them a
 *   chart. So the goods/freight split is not stacked here — it lives in the
 *   table underneath, where it costs no colour at all.
 * - **Two gridlines, both true.** The baseline is zero and the top line is the
 *   largest bucket in the window, labelled with that bucket's own value. There
 *   is no "nice" rounded ceiling, because a rounded ceiling is a money figure
 *   this screen would have invented; every number on this axis is one the API
 *   sent.
 *
 * No total is drawn anywhere, for the same reason. `RevenueReportResponse`
 * carries `buckets` and no period sum, and adding them up here is precisely
 * the arithmetic on money that CLAUDE.md rules out. See README, "Divergências
 * conhecidas".
 *
 * The columns are `<rect>` with a `<title>` each, which is a real tooltip on
 * hover with no JavaScript. The accessible reading is the table beside it —
 * the SVG carries one label and is otherwise a picture of numbers that are all
 * written down in text a few lines below.
 */

const WIDTH = 1000;
const HEIGHT = 300;
const PAD = { top: 28, right: 12, bottom: 44, left: 96 };

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const BASELINE = PAD.top + PLOT_H;

/** §2 caps a mark's weight: a column never fills its band, it sits in it. */
const MAX_BAR = 24;

/** At most this many x labels, so they never collide on a long window. */
const MAX_TICKS = 12;

export function RevenueChart({
  buckets,
  granularity,
  timeZone,
}: {
  buckets: readonly Bucket[];
  granularity: Granularity;
  timeZone: string;
}) {
  if (buckets.length === 0) {
    return (
      <p className="py-12 text-center text-small text-muted">
        A janela não cobre nenhum período inteiro.
      </p>
    );
  }

  // The largest bucket sets the scale. Not a sum, not an average — the biggest
  // number the API sent, used as the top of the axis and labelled as itself.
  const peak = buckets.reduce(
    (highest, bucket) => Math.max(highest, bucket.revenueCents),
    0,
  );

  const band = PLOT_W / buckets.length;
  const barWidth = Math.min(MAX_BAR, band * 0.6);
  const stride = Math.ceil(buckets.length / MAX_TICKS);

  return (
    <svg
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Receita por ${GRANULARITY_NOUN[granularity]}, em ${buckets.length} ${buckets.length === 1 ? "período" : "períodos"}, no fuso ${timeZone}. Os valores estão na tabela abaixo.`}
    >
      {/* The top gridline is only drawn when it means something. With every
          bucket at zero it would sit on top of the baseline and label a
          number that is not the peak of anything. */}
      {peak > 0 ? (
        <>
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={WIDTH - PAD.right}
            y2={PAD.top}
            className="stroke-admin-hairline"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 14}
            y={PAD.top}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-admin-dim font-mono text-[12px] tabular-nums"
          >
            {formatBRL(peak)}
          </text>
        </>
      ) : null}

      <line
        x1={PAD.left}
        y1={BASELINE}
        x2={WIDTH - PAD.right}
        y2={BASELINE}
        className="stroke-admin-hairline"
        strokeWidth={1}
      />
      <text
        x={PAD.left - 14}
        y={BASELINE}
        textAnchor="end"
        dominantBaseline="middle"
        className="fill-admin-dim font-mono text-[12px] tabular-nums"
      >
        {formatBRL(0)}
      </text>

      {buckets.map((bucket, index) => {
        const centre = PAD.left + band * index + band / 2;
        // A zero bucket is drawn as nothing above the baseline, which is what
        // zero looks like — but its band and its tick stay, so the series
        // never appears to skip a week. That continuity is the whole reason
        // the API returns zero buckets instead of gaps.
        const height =
          peak > 0 ? (bucket.revenueCents / peak) * PLOT_H : 0;

        return (
          <g key={bucket.periodStart}>
            {height > 0 ? (
              <rect
                x={centre - barWidth / 2}
                y={BASELINE - height}
                width={barWidth}
                height={height}
                className="fill-ink"
              />
            ) : null}
            <title>
              {`${bucketRowLabel(bucket.periodStart, granularity)} · ${formatBRL(bucket.revenueCents)} · ${String(bucket.orderCount)} ${bucket.orderCount === 1 ? "pedido" : "pedidos"}`}
            </title>
            {index % stride === 0 ? (
              <text
                x={centre}
                y={BASELINE + 22}
                textAnchor="middle"
                className="fill-admin-dim font-mono text-[11px] tabular-nums"
              >
                {bucketAxisLabel(bucket.periodStart, granularity)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* The AVESSO's ordinary view. It is a real answer, not a failure, and
          it says so in the plot rather than replacing the plot — the axis and
          the periods underneath are what make the zero readable as a zero. */}
      {peak === 0 ? (
        <text
          x={PAD.left + PLOT_W / 2}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted text-[14px]"
        >
          Nenhuma venda paga neste período.
        </text>
      ) : null}
    </svg>
  );
}

const GRANULARITY_NOUN: Readonly<Record<Granularity, string>> = {
  week: "semana",
  month: "mês",
};
