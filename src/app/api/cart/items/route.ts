import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { badRequest, errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

/**
 * Adiciona uma peça à sacola de compras.
 *
 * Requer sessão ativa: caso o usuário não esteja autenticado (401),
 * o cliente web exibe o painel de login inline mantendo a peça em foco.
 */
const COPY = {
  400: "Não foi possível adicionar. Confira a quantidade.",
  404: "Este tamanho não está mais disponível.",
  409: "Este tamanho acabou de esgotar.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const form = body as { variantId?: unknown; quantity?: unknown };

  // The sellable unit is the variant, not the product: one size can be gone
  // while the next is on the shelf, and the cart has to say which.
  if (typeof form.variantId !== "string") {
    return badRequest("Tamanho inválido.");
  }

  const quantity =
    typeof form.quantity === "number" && Number.isInteger(form.quantity)
      ? form.quantity
      : 1;

  const api = await customerApi();

  if (!api) {
    // Sinal para o cliente web exibir o painel de autenticação inline.
    return NextResponse.json({ error: "Entre para montar sua sacola." }, {
      status: 401,
    });
  }

  try {
    // The whole cart comes back, not just the line that changed.
    const cart = unwrap(
      await api.POST("/cart/items", {
        body: { variantId: form.variantId, quantity },
      }),
    );

    return NextResponse.json(cart, { status: 201 });
  } catch (error) {
    // An expired access token also lands here. The browser client refreshes
    // once and retries, and only a second 401 becomes the sign-in panel.
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Entre para montar sua sacola." }, {
        status: 401,
      });
    }

    return errorResponse(error, COPY);
  }
}
