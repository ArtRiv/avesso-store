import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Category } from "@/lib/catalog";
import {
  catalogHref,
  PRICE_BANDS,
  type CatalogFilters,
} from "@/lib/catalog-filters";

/**
 * The left rail from artboard 03: two lists separated by hairlines, an active
 * row in rust. §3 is explicit that this is not an accordion, a chip or a pill —
 * it is rows with rules between them.
 *
 * Counts come from the API, never from counting an array here. The category
 * counts are `productCount`; the band counts are four `total`s from
 * `GET /products` with the bounds applied, which is also what makes them agree
 * with the grid when a category is already selected.
 */
export function FilterRail({
  filters,
  categories,
  totalCount,
  bandCounts,
}: {
  filters: CatalogFilters;
  categories: (Category | { id: string; name: string; slug: string; productCount: number })[];
  totalCount: number;
  bandCounts: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h2 className="type-meta text-muted">Categoria</h2>
        <ul className="border-t border-hairline">
          <RailRow
            href={catalogHref(filters, { category: null })}
            label="Todas as peças"
            count={totalCount}
            active={filters.category === null}
          />
          {categories.map((category) => (
            <RailRow
              key={category.id}
              href={catalogHref(filters, { category: category.slug })}
              label={category.name}
              count={category.productCount}
              active={filters.category === category.slug}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="type-meta text-muted">Faixa de preço</h2>
        <ul className="border-t border-hairline">
          {PRICE_BANDS.map((band) => (
            <RailRow
              key={band.value}
              href={catalogHref(filters, {
                band: filters.band === band.value ? null : band.value,
              })}
              label={band.label}
              count={bandCounts[band.value] ?? 0}
              active={filters.band === band.value}
              mono
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function RailRow({
  href,
  label,
  count,
  active,
  mono = false,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  mono?: boolean;
}) {
  return (
    <li className="border-b border-hairline">
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex items-center justify-between py-3 outline-none",
          "focus-visible:outline-1 focus-visible:outline-ink focus-visible:-outline-offset-2",
          mono ? "font-mono text-[14px] leading-[1.5]" : "text-body",
          active ? "text-rust" : "hover:text-rust",
        )}
      >
        <span>{label}</span>
        <span className="font-mono text-[12px] leading-[1.4] text-muted">
          {count}
        </span>
      </Link>
    </li>
  );
}
