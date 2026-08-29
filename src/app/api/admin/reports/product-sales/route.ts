import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/admin/route";
import { readPaging } from "@/lib/admin/reports";
import { unwrap } from "@/lib/api/client";

/**
 * Units and revenue per piece, over a period.
 *
 * A sale is `PAID`, `SHIPPED` or `DELIVERED`, timed by `paidAt`. That
 * definition is the API's and is never restated here — `CREATED` orders and
 * refunds are already out of these rows before they leave the backend, and a
 * filter on this side would be the second contract upstream-first exists to
 * prevent.
 *
 * `itemsRevenueCents` is the goods alone, at the price frozen on each order
 * line. It is deliberately not called `revenueCents`, so that it never gets
 * added to the freight that lives on `/reports/revenue`.
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
      await api.GET("/reports/product-sales", {
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
