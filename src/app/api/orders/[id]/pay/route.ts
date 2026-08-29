import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

/**
 * The recovery path, and the reason a failed payment never costs an order.
 *
 * If the payment provider is unreachable during checkout the order is still
 * created and `payment` comes back null — the order is real, the stock is
 * decremented, and only the way to pay is missing. The same is true of a
 * buyer who closed the Stripe tab, and of the `/checkout/cancel` return.
 * Without this route every one of those is an order nobody can pay.
 *
 * It returns the **existing open session** rather than issuing a second one:
 * two live ways to pay the same order is how a buyer gets charged twice.
 *
 * No body is sent. `paymentMode` is optional and would insist on a UI this
 * storefront cannot render — see src/app/api/orders/route.ts.
 */
const COPY = {
  404: "Pedido não encontrado.",
  // Already paid, cancelled, refunded — or the provider says the session has
  // completed, which means the money is in flight and only the confirmation
  // is late. Reloading is genuinely the right advice for that last one.
  409: "Este pedido não está mais aguardando pagamento. Recarregue a página.",
  429: "Muitas tentativas de pagamento. Aguarde um momento.",
  503: "O processador de pagamento está fora do ar. Seu pedido está guardado — tente novamente em instantes.",
} as const;

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/orders/[id]/pay">,
) {
  const { id } = await context.params;
  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    const order = unwrap(
      await api.POST("/orders/{id}/pay", {
        params: { path: { id } },
        body: {},
      }),
    );

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, COPY);
  }
}
