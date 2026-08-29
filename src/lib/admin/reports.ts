/**
 * The reports period, and the words for what comes back.
 *
 * Pure on purpose — no `server-only` — because the filter row is a client
 * component and needs the same labels the server renders. Nothing here reads a
 * cookie or calls the API.
 *
 * The one rule this file exists to protect: **a period is what the operator
 * typed, and the API decides what it means.** `from` and `to` are passed
 * through verbatim. Omitting `to` means "now" and omitting `from` means "30
 * days before `to`" — both are the backend's defaults, and computing either
 * one here would put a second definition of "the last 30 days" in a codebase
 * that already has the real one. It would also compute it in the *browser's*
 * time zone, which is exactly the mistake `timeZone` on the response exists to
 * stop.
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

export type Period = {
  /** Inclusive start, as typed. Absent means 30 days before `to`. */
  from: string;
  /** **Exclusive** end, as typed. Absent means now. */
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
 * An unreadable `granularity` falls back to `month` rather than erroring: it is
 * a bucket size, and the screen still has something true to show. `from` and
 * `to` do NOT get that treatment — a date the API refuses is a refusal the
 * operator has to see, because silently widening someone's window and then
 * showing them numbers is worse than showing them nothing.
 */
export function readPeriod(params: Query): Period {
  const granularity = single(params.granularity);

  return {
    from: single(params.from),
    to: single(params.to),
    granularity: isGranularity(granularity) ? granularity : "month",
  };
}

/** The query the three period-scoped routes take, with the empties dropped. */
export function periodQuery(period: Pick<Period, "from" | "to">) {
  return {
    ...(period.from ? { from: period.from } : {}),
    ...(period.to ? { to: period.to } : {}),
  };
}

const MONTH_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

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
 * would re-cut them, and the way to honour that is to not parse the string at
 * all.
 */
function parts(periodStart: string): { y: string; m: number; d: string } {
  const [year = "", month = "", day = ""] = periodStart.split("-");

  return { y: year, m: Number(month) - 1, d: day };
}

/** Under a bar: `24/08` for a week, `ago 2026` for a month. */
export function bucketAxisLabel(
  periodStart: string,
  granularity: Granularity,
): string {
  const { y, m, d } = parts(periodStart);

  return granularity === "week"
    ? `${d}/${String(m + 1).padStart(2, "0")}`
    : `${MONTH_SHORT[m] ?? "?"} ${y}`;
}

/** In a row, and in the bar's tooltip: the bucket said in full. */
export function bucketRowLabel(
  periodStart: string,
  granularity: Granularity,
): string {
  const { y, m, d } = parts(periodStart);

  return granularity === "week"
    ? `Semana de ${d} de ${MONTH_LONG[m] ?? "?"} de ${y}`
    : `${MONTH_LONG[m] ?? "?"} de ${y}`;
}

/**
 * The window the API answered with, in the zone it cut the buckets in.
 *
 * `from` and `to` come back as instants, and rendering them in the reader's
 * zone would contradict the buckets underneath them. The zone is the one the
 * response named; an unknown zone falls back to UTC rather than throwing,
 * because `Intl` answers a bad `timeZone` with a RangeError and a report screen
 * must not disappear over a label.
 */
export function formatWindow(from: string, to: string, timeZone: string): string {
  const format = dayFormatter(timeZone);

  return `${format(from)} → ${format(to)}`;
}

function dayFormatter(timeZone: string): (iso: string) => string {
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
