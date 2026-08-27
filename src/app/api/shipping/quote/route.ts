import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { badRequest, errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

/**
 * Freight for the caller's own sacola, priced from a CEP.
 *
 * There is no cart id and no item list in the request: the cart is whichever
 * one the token belongs to. The postal code alone sets the price — city and
 * state travel in the order address to print a label and never feed the
 * number.
 *
 * The two failure shapes below are kept apart on purpose, and the checkout
 * treats them differently. An empty `options` list arrives as a **200**: it
 * means "nothing carries this, to there", which is a fact about the address
 * rather than a fault, and retrying will never change it. A provider that is
 * merely unreachable is a 503, and that one is worth trying again.
 *
 * POST rather than GET despite being a read, for the same reason the backend
 * chose it: a postal code is personal data and query strings end up in access
 * logs and browser history.
 */
const COPY = {
  400: "CEP inválido. Informe os oito dígitos.",
  409: "Sua sacola está vazia.",
  429: "Muitos cálculos de frete seguidos. Aguarde um momento.",
  503: "A cotação de frete está indisponível. Tente novamente em instantes.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const { postalCode } = body as { postalCode?: unknown };

  if (typeof postalCode !== "string") {
    return badRequest(COPY[400]);
  }

  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    const quote = unwrap(
      await api.POST("/shipping/quote", { body: { postalCode } }),
    );

    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, COPY);
  }
}
