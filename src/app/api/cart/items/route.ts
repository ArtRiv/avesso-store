import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { badRequest, errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

/**
 * Adds a piece to the sacola.
 *
 * There is no guest cart: `POST /cart/items` requires a token, and that is a
 * deliberate property of the backend rather than a gap. So a 401 here is not an
 * error state — it is the cue for artboard 05, where the sign-in panel replaces
 * the CTA on the product page and the page does not navigate. The browser
 * client turns this 401 into that panel.
 */
const COPY = {
  400: "Não foi possível adicionar. Confira a quantidade.",
  404: "Esta peça não está mais disponível.",
  409: "Esta peça acabou de esgotar.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const form = body as { productId?: unknown; quantity?: unknown };

  if (typeof form.productId !== "string") {
    return badRequest("Peça inválida.");
  }

  const quantity =
    typeof form.quantity === "number" && Number.isInteger(form.quantity)
      ? form.quantity
      : 1;

  const api = await customerApi();

  if (!api) {
    // The signal artboard 05 is built on, not a failure.
    return NextResponse.json({ error: "Entre para montar sua sacola." }, {
      status: 401,
    });
  }

  try {
    // The whole cart comes back, not just the line that changed.
    const cart = unwrap(
      await api.POST("/cart/items", {
        body: { productId: form.productId, quantity },
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
