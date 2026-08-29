import type { NextRequest } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

/**
 * Adding a size.
 *
 * `position` is omitted deliberately: the API defaults it to one past the
 * highest in use, which is the end of the list, and that is where a new size
 * belongs. Sending an index would be this screen deciding an ordering the
 * operator has not asked for.
 *
 * `stockQuantity` defaults to 0, and zero is a real state — the size exists
 * and has none left — not a placeholder for "unknown".
 */
const COPY = {
  400: "O rótulo está vazio ou passa de 20 caracteres.",
  404: "Este produto não existe mais.",
  409: "Este produto já tem um tamanho com esse rótulo.",
} as const;

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants">,
) {
  const { id } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { label } = body as { label?: unknown };

  if (typeof label !== "string" || label.trim().length === 0) {
    return Response.json({ error: COPY[400] }, { status: 400 });
  }

  return withAdminApi(
    COPY,
    async (api) =>
      unwrap(
        await api.POST("/products/{id}/variants", {
          params: { path: { id } },
          // Sent rather than omitted only because a documented `default` makes
          // the generated type require it. Zero is that default, so this is
          // the same request either way — and zero is a real state: the size
          // exists and has none left.
          body: { label: label.trim(), stockQuantity: 0 },
        }),
      ),
    201,
  );
}
