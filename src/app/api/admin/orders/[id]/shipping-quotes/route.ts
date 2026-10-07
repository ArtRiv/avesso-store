import type { NextRequest } from "next/server";

import { withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

const COPY = {
  403: "Esta conta não tem permissão para visualizar cotações.",
  404: "Este pedido não existe.",
  503: "O serviço de cálculo de frete está indisponível.",
} as const;

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/orders/[id]/shipping-quotes">,
) {
  const { id } = await context.params;

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.GET("/orders/{id}/shipping-quotes", {
        params: { path: { id } },
      }),
    ),
  );
}
