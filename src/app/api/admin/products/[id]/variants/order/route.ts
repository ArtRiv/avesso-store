import type { NextRequest } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

/**
 * Reordering — the whole list, every time.
 *
 * The API restates the entire ordering rather than moving one size, and it
 * refuses a partial list with a 400 instead of guessing where the omitted ones
 * go. That is why the panel sends every id it is holding after a drag, not
 * just the one that moved.
 *
 * Explicit ordering exists because alphabetical is wrong: P/M/G/GG/XGG sorts
 * to G, GG, M, P, XGG.
 */
const COPY = {
  400: "A lista enviada não corresponde exatamente aos tamanhos deste produto. Recarregue a página.",
  404: "Este produto não existe mais.",
} as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants/order">,
) {
  const { id } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { variantIds } = body as { variantIds?: unknown };

  if (
    !Array.isArray(variantIds) ||
    variantIds.length === 0 ||
    !variantIds.every((value) => typeof value === "string")
  ) {
    return Response.json({ error: COPY[400] }, { status: 400 });
  }

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.PATCH("/products/{id}/variants/order", {
        params: { path: { id } },
        body: { variantIds: variantIds as string[] },
      }),
    ),
  );
}
