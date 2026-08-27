import type { ProductQuery, ProductSort } from "@/lib/catalog";

/**
 * The catalogue's filters, and the map between what the URL says and what the
 * API takes.
 *
 * Every dimension here is applied by the **backend**. That is worth stating
 * because both docs/design-system.md §3 and the build brief say the opposite —
 * that `GET /products` only filters by category and name, and that the price
 * bands are computed in the browser. The live OpenAPI document has `sort`,
 * `minPriceCents` and `maxPriceCents`, and the spec beats the prose. Queried
 * against the deployed API the four bands come back 5 / 2 / 4 / 1, which is
 * exactly the corrected count in §8 — so nothing here does arithmetic on a
 * price, and the counts cannot drift from the grid they label.
 */
export const PER_PAGE = 12;

/** URL value → what the API calls it. Ordered as the design lists them. */
export const SORTS = [
  { value: "recentes", label: "Mais recentes", api: "newest" },
  { value: "menor-preco", label: "Menor preço", api: "price_asc" },
  { value: "maior-preco", label: "Maior preço", api: "price_desc" },
  { value: "nome", label: "Nome A–Z", api: "name_asc" },
] as const satisfies readonly {
  value: string;
  label: string;
  api: ProductSort;
}[];

export type SortValue = (typeof SORTS)[number]["value"];

/**
 * The four bands from §3, in integer cents, with bounds that are inclusive on
 * both ends exactly as the API treats them. The labels are the design's.
 */
export const PRICE_BANDS = [
  {
    value: "ate-149",
    label: "até R$ 149,90",
    maxPriceCents: 14990,
  },
  {
    value: "150-249",
    label: "R$ 150 – R$ 249,90",
    minPriceCents: 15000,
    maxPriceCents: 24990,
  },
  {
    value: "250-349",
    label: "R$ 250 – R$ 349,90",
    minPriceCents: 25000,
    maxPriceCents: 34990,
  },
  {
    value: "acima-350",
    label: "acima de R$ 350",
    minPriceCents: 35000,
  },
] as const satisfies readonly {
  value: string;
  label: string;
  minPriceCents?: number;
  maxPriceCents?: number;
}[];

export type PriceBandValue = (typeof PRICE_BANDS)[number]["value"];

/** What the catalogue page understands from its own URL. */
export type CatalogFilters = {
  category: string | null;
  search: string | null;
  sort: SortValue;
  band: PriceBandValue | null;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string): string | null {
  const value = raw[key];
  const found = Array.isArray(value) ? value[0] : value;

  return found && found.length > 0 ? found : null;
}

/**
 * Anything unrecognised falls back to the default rather than reaching the API.
 * A hand-edited `?ordem=` should show the catalogue, not a 400.
 */
export function parseFilters(raw: RawParams): CatalogFilters {
  const sort = one(raw, "ordem");
  const band = one(raw, "faixa");
  const page = Number(one(raw, "pagina") ?? "1");

  return {
    category: one(raw, "categoria"),
    search: one(raw, "busca"),
    sort: SORTS.some((option) => option.value === sort)
      ? (sort as SortValue)
      : "recentes",
    band: PRICE_BANDS.some((option) => option.value === band)
      ? (band as PriceBandValue)
      : null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function bandBounds(band: PriceBandValue | null): {
  minPriceCents?: number;
  maxPriceCents?: number;
} {
  const found = PRICE_BANDS.find((option) => option.value === band);

  if (!found) {
    return {};
  }

  return {
    ...("minPriceCents" in found
      ? { minPriceCents: found.minPriceCents }
      : {}),
    ...("maxPriceCents" in found
      ? { maxPriceCents: found.maxPriceCents }
      : {}),
  };
}

export function toProductQuery(filters: CatalogFilters): ProductQuery {
  const sort = SORTS.find((option) => option.value === filters.sort);

  return {
    page: filters.page,
    perPage: PER_PAGE,
    sort: sort?.api ?? "newest",
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...bandBounds(filters.band),
  };
}

/**
 * Builds a catalogue URL by changing some filters and keeping the rest.
 *
 * Any change to what is being filtered resets to page one — landing on page 3
 * of a narrower result set is how a filter click turns into an empty screen.
 */
export function catalogHref(
  filters: CatalogFilters,
  changes: Partial<CatalogFilters>,
): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();

  if (next.category) {
    params.set("categoria", next.category);
  }

  if (next.search) {
    params.set("busca", next.search);
  }

  if (next.sort !== "recentes") {
    params.set("ordem", next.sort);
  }

  if (next.band) {
    params.set("faixa", next.band);
  }

  const page = "page" in changes ? next.page : 1;

  if (page > 1) {
    params.set("pagina", String(page));
  }

  const query = params.toString();

  return query ? `/catalogo?${query}` : "/catalogo";
}
