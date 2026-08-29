import { notFound } from "next/navigation";

import { Crumb } from "@/components/admin/page-parts";
import { requireAdminApi } from "@/lib/admin/session";
import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { ProductEditor } from "./product-editor";

/**
 * One product, everything about it on one screen.
 *
 * `GET /products/{idOrSlug}` takes either, and this route carries the **id**
 * on purpose: the slug is editable on this very page, and a URL that broke the
 * moment you renamed the thing it points at would be a trap.
 *
 * A 404 here means gone **or** not visible to this caller — a non-ACTIVE
 * product answers 404 to anyone without `products.read`, deliberately, so that
 * a refusal never confirms the id exists. The copy must never say "acesso
 * negado", which would confirm exactly that.
 */
export default async function ProductEditorPage({
  params,
}: PageProps<"/admin/produtos/[id]">) {
  const { id } = await params;
  const api = await requireAdminApi();

  let product;

  try {
    product = unwrap(
      await api.GET("/products/{idOrSlug}", {
        params: { path: { idOrSlug: id } },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }

    throw error;
  }

  const categories = unwrap(await api.GET("/categories"));

  return (
    <>
      <Crumb href="/admin/produtos" label="Produtos" />
      <ProductEditor product={product} categories={categories} />
    </>
  );
}
