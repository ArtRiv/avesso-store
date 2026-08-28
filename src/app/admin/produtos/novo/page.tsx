import { Crumb } from "@/components/admin/page-parts";
import { requireAdminApi } from "@/lib/admin/session";
import { unwrap } from "@/lib/api/client";

import { NewProductForm } from "./new-product-form";

/**
 * Creating a product.
 *
 * The canvas draws the button and never the screen behind it, so this follows
 * the editor's shape rather than inventing a second visual language: the same
 * cards, the same field sizes, the same words.
 *
 * A product is born DRAFT and stays off the storefront until moved to ACTIVE —
 * there is no publish route, that is what `status` on the editor's PATCH is
 * for. So this screen creates and then hands over to the editor, where the
 * sizes panel and the rest of the catalogue work already live.
 */
export default async function NewProductPage() {
  const api = await requireAdminApi();
  const categories = unwrap(await api.GET("/categories"));

  return (
    <>
      <Crumb href="/admin/produtos" label="Produtos" />
      <NewProductForm categories={categories} />
    </>
  );
}
