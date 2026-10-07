import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

const COPY = {
  400: "O código do serviço de entrega é inválido.",
  403: "Esta conta não tem permissão para gerar etiquetas de postagem.",
  404: "Este pedido não existe.",
  409: "Apenas pedidos pagos (PAID) podem ter etiquetas geradas.",
  503: "A transportadora está temporariamente indisponível.",
} as const;

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/orders/[id]/label">,
) {
  const { id } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { serviceCode } = body as { serviceCode?: unknown };

  if (typeof serviceCode !== "string" || !serviceCode.trim()) {
    return NextResponse.json(
      { error: "O código do serviço de entrega é obrigatório." },
      { status: 400 },
    );
  }

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.POST("/orders/{id}/label", {
        params: { path: { id } },
        body: { serviceCode: serviceCode.trim() },
      }),
    ),
  );
}
