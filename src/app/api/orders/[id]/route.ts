import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

/**
 * One order, for the page that polls it.
 *
 * The Stripe redirect is not payment confirmation: when the buyer comes back
 * the order is very often still CREATED, because the webhook that moves it to
 * PAID is a separate request from Stripe to the backend and may arrive seconds
 * later. On this deployment it can be worse than seconds — the service
 * hibernates, and a webhook that arrives while it is asleep is cut off at 30s
 * and only lands on Stripe's retry.
 *
 * So this exists to be asked again, and the page above it renders the waiting
 * state until the answer says PAID.
 */
const COPY = {
  // "Gone, or not yours" — another customer's order is a 404, never a 403, so
  // that guessing ids cannot reveal that an order exists. Copy that said
  // "acesso negado" would give away precisely what the 404 protects.
  404: "Pedido não encontrado.",
} as const;

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/orders/[id]">,
) {
  const { id } = await context.params;
  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    const order = unwrap(
      await api.GET("/orders/{id}", { params: { path: { id } } }),
    );

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, COPY);
  }
}
