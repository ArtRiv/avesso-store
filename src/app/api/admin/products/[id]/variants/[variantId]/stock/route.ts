import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

/**
 * Setting one size's stock.
 *
 * An absolute quantity — "the shelf holds N of this size" — and never a delta.
 * Selling is the other path entirely: checkout decrements the variant inside
 * its own transaction and nothing here is involved in it.
 *
 * The API documents this as last-write-wins against a concurrent sale, which
 * is accepted upstream for v1. Worth knowing before anyone reads a surprising
 * number: this route can overwrite a decrement that landed a moment earlier.
 */
const COPY = {
  400: "A quantidade precisa ser um número inteiro e não negativa.",
  404: "Este tamanho não existe mais.",
} as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants/[variantId]/stock">,
) {
  const { id, variantId } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { quantity } = body as { quantity?: unknown };

  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    return NextResponse.json({ error: COPY[400] }, { status: 400 });
  }

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.PATCH("/products/{id}/variants/{variantId}/stock", {
        params: { path: { id, variantId } },
        body: { quantity },
      }),
    ),
  );
}
