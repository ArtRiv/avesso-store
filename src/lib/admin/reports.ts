import type { components } from "@/lib/api/schema";

/**
 * The reports period, and the words for what comes back.
 *
 * The one rule this file exists to protect: **the API decides what a window
 * means.** `from` and `to` are request parameters, never re-derived from the
 * response — the window drawn on screen is always the one the API echoed back,
 * cut in the zone it named.
 */

export type Granularity = "week" | "month";

export const GRANULARITY_LABEL: Readonly<Record<Granularity, string>> = {
  week: "Semana",
  month: "Mês",
};

const GRANULARITIES = new Set<string>(Object.keys(GRANULARITY_LABEL));

export function isGranularity(value: string): value is Granularity {
  return GRANULARITIES.has(value);
}

/**
 * The three lengths the artboard offers, as a segmented control.
 *
 * The artboard draws presets and no date fields, and that is the better
 * control for this screen: an operator asks "how are the last twelve weeks
 * going", not "give me 09/06 to 29/08".
 *
 * `30d` sends nothing at all. That is not a shortcut — omitting `from` and `to`
 * IS the API's documented default (30 days before now), so the commonest view
 * on this screen computes no date anywhere and cannot drift from the backend by
 * a day. The other two send only `from`, leaving `to` as now for the same
 * reason.
 *
 * `days` is a request parameter and nothing more. It is not a business rule —
 * no backend anywhere would offer "twelve weeks" as a concept — so working it
 * out here is presentation, not the arithmetic docs/upstream-first.md is about.
 * It is worked out on the SERVER, so every reader gets the same window from the
 * same URL rather than one cut by their own clock.
 */
export const PERIODS = {
  "30d": {
    label: "30 dias",
    long: "Últimos 30 dias",
    /** The same span said as a phrase, for a sentence to end with. */
    within: "nos últimos 30 dias",
    days: null,
  },
  "12s": {
    label: "12 semanas",
    long: "Últimas 12 semanas",
    within: "nas últimas 12 semanas",
    days: 84,
  },
  "12m": {
    label: "12 meses",
    long: "Últimos 12 meses",
    within: "nos últimos 12 meses",
    days: 365,
  },
} as const;

/** A window a URL named by date has no preset phrase — it is just the period. */
export function withinPhrase(preset: PeriodKey | null): string {
  return preset ? PERIODS[preset].within : "no período";
}

export type PeriodKey = keyof typeof PERIODS;

export const PERIOD_KEYS = Object.keys(PERIODS) as PeriodKey[];

export type Period = {
  /** Which segment is lit. Null when the URL carried explicit dates instead. */
  preset: PeriodKey | null;
  /** Inclusive start. Empty means 30 days before `to`, the API's own default. */
  from: string;
  /** **Exclusive** end. Empty means now. */
  to: string;
  granularity: Granularity;
};

type Query = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The period a URL is carrying.
 *
 * Explicit `from`/`to` win over a preset and light no segment. The screen's own
 * control never produces that combination — it is there because the window is
 * `[from, to)` and an impossible one is a **400 rather than an empty list**, a
 * refusal this screen has to be able to show. A hand-edited URL, or an old
 * bookmark, is how someone reaches it.
 *
 * An unreadable preset or granularity falls back rather than erroring: both are
 * choices about how to look, and the screen still has something true to show. A
 * date does not get that treatment — silently widening someone's window and
 * then showing them numbers is worse than showing them the refusal.
 */
export function readPeriod(params: Query): Period {
  const from = single(params.from);
  const to = single(params.to);
  const granularity = single(params.granularity);
  const preset = single(params.periodo);

  return {
    preset:
      from || to
        ? null
        : preset in PERIODS
          ? (preset as PeriodKey)
          : "30d",
    from,
    to,
    granularity: isGranularity(granularity) ? granularity : "week",
  };
}

/**
 * The `from`/`to` the three period-scoped routes take.
 *
 * A preset with `days` becomes a bare `from` date. `to` is never sent by a
 * preset: "now" is the API's default and is more accurate than any instant this
 * side could name.
 */
export function periodQuery(period: Period): { from?: string; to?: string } {
  if (period.from || period.to) {
    return {
      ...(period.from ? { from: period.from } : {}),
      ...(period.to ? { to: period.to } : {}),
    };
  }

  const days = period.preset ? PERIODS[period.preset].days : null;

  if (days === null) {
    return {};
  }

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);

  return { from: start.toISOString().slice(0, 10) };
}

const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * `periodStart` is a calendar date in the instance's zone — `YYYY-MM-DD` — and
 * it is read as three strings here, never through `new Date()`.
 *
 * That is the whole point. `new Date("2026-08-24")` is midnight **UTC**, and
 * `Intl` would then render it in the *reader's* zone: an operator in São Paulo
 * would see the bar labelled 23/08, one week earlier than the week it holds.
 * The server already cut these buckets in its own zone precisely so nobody
 * would re-cut them, and the way to honour that is to not parse the string.
 */
export function bucketLabel(
  periodStart: string,
  granularity: Granularity,
): string {
  const [year = "", month = "", day = ""] = periodStart.split("-");

  return granularity === "week"
    ? `${day}/${month}`
    : (MONTH_SHORT[Number(month) - 1] ?? "?") + ` ${year}`;
}

/**
 * How many buckets, in words — `cinco semanas`, the way the artboard writes the
 * zero caption. Past the list it falls back to digits rather than growing a
 * number speller nobody asked for.
 */
const COUNT_WORD = [
  "nenhuma",
  "uma",
  "duas",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
];

export function countInWords(n: number): string {
  return COUNT_WORD[n] ?? String(n);
}

export function bucketNoun(granularity: Granularity, n: number): string {
  if (granularity === "week") {
    return n === 1 ? "semana" : "semanas";
  }

  return n === 1 ? "mês" : "meses";
}

/**
 * A date in the zone the instance keeps its books in, not the reader's.
 *
 * Everything dated on this screen — the window, a piece's last sale — is an
 * instant the API sent, and the only zone that makes those agree with the
 * buckets drawn beside them is the one on the revenue response. `Intl` answers
 * an unknown zone with a RangeError, so an unusable one falls back to UTC
 * rather than taking the screen down over a label.
 */
export function zoneFormatter(timeZone: string): (iso: string) => string {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  let intl: Intl.DateTimeFormat;

  try {
    intl = new Intl.DateTimeFormat("pt-BR", { ...options, timeZone });
  } catch {
    intl = new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" });
  }

  return (iso) => intl.format(new Date(iso));
}

/**
 * `Últimos 30 dias · 30/07 a 29/08/2026`, the artboard's meta line — built from
 * the window the API answered with, never from the one that was asked for.
 */
export function periodRange(
  revenue: components["schemas"]["RevenueReportResponse"],
  preset: PeriodKey | null,
): string {
  const format = zoneFormatter(revenue.timeZone);
  const from = format(revenue.from);
  const to = format(revenue.to);

  // The start drops its year when both ends share one — `30/07 a 29/08/2026`,
  // exactly as the artboard writes it.
  const short = from.slice(-4) === to.slice(-4) ? from.slice(0, 5) : from;
  const window = `${short} a ${to}`;

  // A window the URL named by date carries no preset name. Prefixing one would
  // label it as a span it may not be.
  return preset ? `${PERIODS[preset].long} · ${window}` : window;
}

/**
 * `page` and `perPage` off a route handler's query string.
 *
 * Absent is absent — the API has its own defaults and this does not restate
 * them. Present but not a positive integer is refused here rather than
 * forwarded, because the typed client cannot carry a non-number and the API
 * would answer 400 for the same reason. Values above 100 are NOT clamped: the
 * spec says the server clamps them, and clamping twice is a second rule that
 * could one day disagree with the first.
 */
export function readPaging(
  search: URLSearchParams,
): { page?: number; perPage?: number } | null {
  const paging: { page?: number; perPage?: number } = {};

  for (const key of ["page", "perPage"] as const) {
    const raw = search.get(key);

    if (raw === null || raw === "") {
      continue;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value < 1) {
      return null;
    }

    paging[key] = value;
  }

  return paging;
}
