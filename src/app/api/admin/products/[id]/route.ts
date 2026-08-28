import type { NextRequest } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type UpdateProduct = components["schemas"]["UpdateProductDto"];

/**
 * Editing a product, and archiving one.
 *
 * There is no publish route and that is deliberate upstream: a product reaches
 * ACTIVE through `status` on this same PATCH. `DELETE /products/{id}` archives
 * rather than deletes — the row and its slug persist forever — which is why
 * the screen's destructive action is called `Arquivar` and not `Excluir`.
 */
const COPY = {
  400: "Algum campo não passou na validação da API.",
  404: "Este produto não existe mais.",
  409: "Já existe um produto com este slug.",
} as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]">,
) {
  const { id } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  // The body is forwarded as the DTO the document declares rather than being
  // re-validated field by field here. The backend's pipe rejects an unknown
  // key outright — it does not ignore it — so a second set of rules on this
  // side could only ever disagree with the one that decides.
  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.PATCH("/products/{id}", {
        params: { path: { id } },
        body: body as UpdateProduct,
      }),
    ),
  );
}

/** Archive. The product stays, its slug stays taken, the storefront drops it. */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]">,
) {
  const { id } = await context.params;

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.DELETE("/products/{id}", { params: { path: { id } } }),
    ),
  );
}
