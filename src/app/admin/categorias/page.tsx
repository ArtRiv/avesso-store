import { PageHeader } from "@/components/admin/page-parts";
import { requireAdminApi } from "@/lib/admin/session";
import { unwrap } from "@/lib/api/client";

import { CategoriesView } from "./categories-view";

/**
 * Categories, with how many pieces each one holds.
 *
 * The count is not on `CategoryResponse` — the category knows nothing about
 * the products pointing at it — so it comes from `GET /products` per category,
 * with `perPage: 1` because only `total` is wanted. The backend counts what
 * matches the filter rather than what fits on the page, so each of these is
 * one row over the wire for a number this screen must not work out for itself.
 *
 * That is N requests for N categories, and it is a deliberate acceptance
 * rather than an oversight: they run in parallel, and the API declares the
 * category list unpaginated precisely because the whole set is small. A
 * `productCount` on the category would collapse it to one request, and that is
 * recorded in README as a candidate rather than assumed.
 *
 * `status: "all"` matters. The public count is ACTIVE only, and an operator
 * looking at a category with three drafts in it needs to see three, not zero.
 */
export default async function CategoriesPage() {
  const api = await requireAdminApi();
  const categories = unwrap(await api.GET("/categories"));

  const counts = await Promise.all(
    categories.map(async (category) => {
      const page = unwrap(
        await api.GET("/products", {
          params: {
            query: { category: category.slug, status: "all", perPage: 1 },
          },
        }),
      );

      return [category.id, page.total] as const;
    }),
  );

  return (
    <>
      <PageHeader
        title="Categorias"
        meta={
          <span className="type-meta text-muted">
            {categories.length}{" "}
            {categories.length === 1 ? "categoria" : "categorias"}
          </span>
        }
      />
      <CategoriesView
        categories={categories}
        counts={Object.fromEntries(counts)}
      />
    </>
  );
}
