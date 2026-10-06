import type { NextRequest } from "next/server";

import { withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

const ARCHIVE_COPY = {
  400: "Requisição inválida.",
  404: "Este tamanho não existe mais.",
  409: "O produto deve manter pelo menos um tamanho ativo.",
} as const;

export async function PATCH(
  _request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants/[variantId]/archive">,
) {
  const { id, variantId } = await context.params;

  return withAdminApi(ARCHIVE_COPY, async (api) =>
    unwrap(
      await api.PATCH("/products/{id}/variants/{variantId}/archive", {
        params: { path: { id, variantId } },
      }),
    ),
  );
}
