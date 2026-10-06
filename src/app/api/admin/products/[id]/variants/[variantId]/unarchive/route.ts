import type { NextRequest } from "next/server";

import { withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

const UNARCHIVE_COPY = {
  400: "Requisição inválida.",
  404: "Este tamanho não existe mais.",
} as const;

export async function PATCH(
  _request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants/[variantId]/unarchive">,
) {
  const { id, variantId } = await context.params;

  return withAdminApi(UNARCHIVE_COPY, async (api) =>
    unwrap(
      await api.PATCH("/products/{id}/variants/{variantId}/unarchive", {
        params: { path: { id, variantId } },
      }),
    ),
  );
}
