import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/admin/route";
import { readPaging } from "@/lib/admin/reports";
import { unwrap } from "@/lib/api/client";

/**
 * Pieces that are not moving: ACTIVE, holding stock, and with no sale in the
 * window — the three conditions together.
 *
 * A sold-out piece is deliberately absent, because sold out is the opposite of
 * not moving; so is a DRAFT or an ARCHIVED one, which was never for sale. The
 * same definition of "a sale" decides this list and `/reports/product-sales`,
 * which makes them exact complements — and is why neither of them is
 * recomputed on this side.
 */
const COPY = {
  400: "Período recusado: o início precisa ser uma data válida e anterior ao fim.",
  403: "Esta conta não tem permissão de relatórios.",
} as const;

export function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const paging = readPaging(search);

  if (!paging) {
    return NextResponse.json(
      { error: "A página e o tamanho da página precisam ser inteiros positivos." },
      { status: 400 },
    );
  }

  const from = search.get("from");
  const to = search.get("to");

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.GET("/reports/unsold-products", {
        params: {
          query: {
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
            ...paging,
          },
        },
      }),
    ),
  );
}
