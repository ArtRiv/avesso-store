"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChevronIcon, SearchIcon } from "@/components/icons";
import {
  catalogHref,
  SORTS,
  type CatalogFilters,
  type SortValue,
} from "@/lib/catalog-filters";

/**
 * The search field and the sort control from artboard 03.
 *
 * Both only ever rewrite the URL. The filters live in the query string, which
 * is what makes a filtered catalogue a page someone can bookmark, share and
 * reload, and what lets the server do all the filtering — the browser holds no
 * catalogue state at all.
 *
 * The current filters arrive as a prop rather than through `useSearchParams`,
 * so this component reads nothing it was not handed and needs no Suspense
 * boundary around it.
 */
export function CatalogControls({ filters }: { filters: CatalogFilters }) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search ?? "");

  return (
    <div className="flex items-center gap-6">
      <form
        role="search"
        className="flex h-12 w-[280px] items-center gap-3 rounded-[2px] border border-hairline bg-paper px-4 focus-within:border-ink"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(catalogHref(filters, { search: search.trim() || null }));
        }}
      >
        <SearchIcon className="shrink-0 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className="h-full w-full min-w-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
      </form>

      <div className="type-meta relative flex h-12 items-center gap-4 rounded-[2px] border border-hairline bg-paper px-4 focus-within:border-ink">
        <label htmlFor="catalog-sort" className="text-muted">
          Ordenar
        </label>
        <select
          id="catalog-sort"
          value={filters.sort}
          onChange={(event) =>
            router.push(
              catalogHref(filters, { sort: event.target.value as SortValue }),
            )
          }
          // The chevron beside it is the design's, so the browser's own arrow
          // is removed rather than shown twice.
          className="type-meta appearance-none bg-transparent pr-6 text-ink outline-none"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronIcon className="pointer-events-none absolute right-4" />
      </div>
    </div>
  );
}
