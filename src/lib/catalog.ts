import "server-only";

import { publicApi, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Product = components["schemas"]["ProductResponse"];
export type Category = components["schemas"]["CategoryResponse"];

/**
 * Reads of the public catalogue.
 *
 * Everything here is cached for a short window, for one reason that is not
 * really about speed: the backend hibernates on Render's free tier and a cold
 * request takes about a minute. Serving a browsing visitor a page assembled 30
 * seconds ago is the difference between a store and a stopwatch.
 *
 * Stale stock is safe, and the design already assumes it — the sacola says in
 * so many words that stock is not reserved and a piece leaves the bag if it
 * sells first. The authority on availability is the 409 at checkout, never a
 * badge on a grid.
 */
const CATEGORY_TTL = 300;
const PRODUCT_TTL = 30;

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc";

export type ProductQuery = {
  page?: number;
  perPage?: number;
  category?: string;
  search?: string;
  sort?: ProductSort;
  minPriceCents?: number;
  maxPriceCents?: number;
};

/**
 * Unpaginated by design on the backend's side: categories are flat, have no
 * status, and the whole set is small enough to be the storefront's navigation
 * in one response.
 */
export async function listCategories(): Promise<Category[]> {
  return unwrap(
    await publicApi.GET("/categories", {
      next: { revalidate: CATEGORY_TTL, tags: ["categories"] },
    }),
  );
}

export async function listProducts(query: ProductQuery = {}) {
  return unwrap(
    await publicApi.GET("/products", {
      params: { query },
      next: { revalidate: PRODUCT_TTL, tags: ["products"] },
    }),
  );
}

/**
 * Accepts an id or a slug in the same segment — ids are UUIDs and slugs never
 * look like one, so the two cannot collide. Returns null for a 404, which here
 * means "no such piece, or it is not ACTIVE"; the backend deliberately answers
 * the same way for both so that probing slugs cannot reveal an unreleased
 * product.
 */
export async function getProduct(idOrSlug: string): Promise<Product | null> {
  const result = await publicApi.GET("/products/{idOrSlug}", {
    params: { path: { idOrSlug } },
    next: { revalidate: PRODUCT_TTL, tags: ["products", `product:${idOrSlug}`] },
  });

  if (result.response.status === 404) {
    return null;
  }

  return unwrap(result);
}

/**
 * How many pieces the store has, for the header of the catalogue and the
 * "Ver as 12 peças" link on the home page.
 *
 * `perPage: 1` because only `total` is wanted — the backend counts what matches
 * the filters rather than what fits on the page, so this is one row over the
 * wire for a number the storefront must not work out for itself.
 */
export async function countProducts(query: ProductQuery = {}): Promise<number> {
  const page = await listProducts({ ...query, perPage: 1 });

  return page.total;
}
