import type { Metadata } from "next";
import Link from "next/link";

import { ProductTile } from "@/components/product-tile";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";
import { countProducts, listCategories, listProducts } from "@/lib/catalog";
import {
  bandBounds,
  catalogHref,
  parseFilters,
  PER_PAGE,
  PRICE_BANDS,
  toProductQuery,
  type CatalogFilters,
} from "@/lib/catalog-filters";

import { CatalogControls } from "./catalog-controls";
import { FilterRail } from "./filter-rail";

export const metadata: Metadata = {
  title: "Catálogo · AVESSO",
  description:
    "As doze peças da AVESSO: camisetas, moletons, calças e acessórios.",
};

/**
 * Artboard 03. Every filter, the ordering and the pagination are applied by the
 * API — see src/lib/catalog-filters.ts for why that contradicts the design doc
 * and why the spec wins.
 */
export default async function CatalogPage(props: PageProps<"/catalogo">) {
  const filters = parseFilters(await props.searchParams);

  const [page, categories, totalCount, bandCounts] = await Promise.all([
    listProducts(toProductQuery(filters)),
    listCategories(),
    // "Todas as peças" has to agree with the grid, so it is counted with the
    // price band applied and only the category dropped.
    countProducts({ ...toProductQuery(filters), category: undefined }),
    countBands(filters),
  ]);

  const scopedCategories = await scopeCategoryCounts(filters, categories);
  const lastPage = Math.max(1, Math.ceil(page.total / PER_PAGE));

  return (
    <>
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <div className="flex flex-col gap-8 px-24 pt-16">
          <h1 className="text-h1">Catálogo</h1>

          <div className="flex items-center justify-between border-t border-b border-hairline py-4">
            <p className="type-meta">
              {page.total} {page.total === 1 ? "peça" : "peças"}
            </p>
            <CatalogControls filters={filters} />
          </div>
        </div>

        <div className="grid grid-cols-[3fr_9fr] gap-16 px-24 pt-12 pb-24">
          <FilterRail
            filters={filters}
            categories={scopedCategories}
            totalCount={totalCount}
            bandCounts={bandCounts}
          />

          <div className="flex flex-col gap-16">
            {page.items.length > 0 ? (
              <div className="grid grid-cols-4 gap-x-6 gap-y-12">
                {page.items.map((product) => (
                  <ProductTile
                    key={product.id}
                    slug={product.slug}
                    name={product.name}
                    priceCents={product.priceCents}
                    stockQuantity={product.stockQuantity}
                  />
                ))}
              </div>
            ) : (
              <EmptyResult filters={filters} />
            )}

            {page.total > 0 ? (
              <Pagination filters={filters} page={filters.page} lastPage={lastPage} />
            ) : null}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function EmptyResult({ filters }: { filters: CatalogFilters }) {
  return (
    <div className="flex flex-col items-start gap-4 border-t border-hairline pt-12">
      <p className="text-h3">Nenhuma peça com esses filtros</p>
      <p className="text-body max-w-[480px] text-muted">
        {filters.search
          ? `Não encontramos nada para “${filters.search}”. A busca olha só o nome da peça.`
          : "Nenhuma peça se encaixa nessa combinação de categoria e faixa de preço."}
      </p>
      <Link
        href="/catalogo"
        className="type-meta text-rust outline-none hover:underline focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2"
      >
        Ver as doze peças
      </Link>
    </div>
  );
}

/**
 * `Anterior · 1 · Próxima` from artboard 03. The ends are muted and inert
 * rather than hidden, so the row keeps its shape on the first and last page.
 */
function Pagination({
  filters,
  page,
  lastPage,
}: {
  filters: CatalogFilters;
  page: number;
  lastPage: number;
}) {
  const pages = Array.from({ length: lastPage }, (_, index) => index + 1);

  return (
    <nav className="type-meta flex items-center justify-between border-t border-hairline pt-6">
      <Step
        href={catalogHref(filters, { page: page - 1 })}
        enabled={page > 1}
        label="Anterior"
      />

      <ul className="flex gap-2">
        {pages.map((number) => (
          <li key={number}>
            <Link
              href={catalogHref(filters, { page: number })}
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center border outline-none",
                "focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2",
                number === page
                  ? "border-ink"
                  : "border-transparent text-muted hover:text-rust",
              )}
            >
              {number}
            </Link>
          </li>
        ))}
      </ul>

      <Step
        href={catalogHref(filters, { page: page + 1 })}
        enabled={page < lastPage}
        label="Próxima"
      />
    </nav>
  );
}

function Step({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}) {
  if (!enabled) {
    return <span className="text-muted">{label}</span>;
  }

  return (
    <Link
      href={href}
      className="outline-none hover:text-rust focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2"
    >
      {label}
    </Link>
  );
}

/**
 * One `total` per band, from the API, with the active category applied.
 *
 * Four requests rather than one reduce over the page, because a count computed
 * here would only describe the twelve rows already fetched — it would say "2"
 * beside a band on page one and something else on page two. And scoping them to
 * the chosen category is what keeps a count honest: a band labelled 4 that
 * returns 1 when clicked is worse than no count at all.
 */
async function countBands(
  filters: CatalogFilters,
): Promise<Record<string, number>> {
  const counts = await Promise.all(
    PRICE_BANDS.map(async (band) => {
      const total = await countProducts({
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...bandBounds(band.value),
      });

      return [band.value, total] as const;
    }),
  );

  return Object.fromEntries(counts);
}

/**
 * Category counts, scoped to the active price band.
 *
 * `productCount` on `GET /categories` counts the whole category, which is right
 * until a band is chosen — then it would advertise five camisetas inside a band
 * holding two. With no band active this costs nothing extra and uses the count
 * the categories route already returns.
 */
async function scopeCategoryCounts(
  filters: CatalogFilters,
  categories: Awaited<ReturnType<typeof listCategories>>,
) {
  if (!filters.band && !filters.search) {
    return categories;
  }

  return Promise.all(
    categories.map(async (category) => ({
      ...category,
      productCount: await countProducts({
        category: category.slug,
        ...(filters.search ? { search: filters.search } : {}),
        ...bandBounds(filters.band),
      }),
    })),
  );
}
