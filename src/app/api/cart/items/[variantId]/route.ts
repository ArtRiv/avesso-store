import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { badRequest, errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";
import type { components } from "@/lib/api/schema";

/**
 * One line of the sacola — the stepper and `Remover` on artboard 06.
 *
 * A line is addressed by its **variantId**, not by the product: two sizes of
 * the same shirt are two lines, and the id in this path is the one that says
 * which. Both verbs answer with the whole cart, so the page never sums
 * anything to find out what the totals became.
 */
const COPY = {
  400: "Quantidade inválida.",
  404: "Esta peça não está mais na sacola.",
  409: "Este tamanho acabou de esgotar.",
} as const;

const MAX_QUANTITY = 999;

/** Set the line to an absolute quantity. Zero is `DELETE`, not a quantity. */
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/cart/items/[variantId]">,
) {
  const { variantId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const { quantity } = body as { quantity?: unknown };

  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUANTITY
  ) {
    return badRequest(COPY[400]);
  }

  return withCart(async (api) =>
    unwrap(
      await api.PATCH("/cart/items/{variantId}", {
        params: { path: { variantId } },
        body: { quantity },
      }),
    ),
  );
}

/** Remove the line entirely. */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/cart/items/[variantId]">,
) {
  const { variantId } = await context.params;

  return withCart(async (api) =>
    unwrap(
      await api.DELETE("/cart/items/{variantId}", {
        params: { path: { variantId } },
      }),
    ),
  );
}

type CustomerApi = NonNullable<Awaited<ReturnType<typeof customerApi>>>;
type Cart = components["schemas"]["CartResponse"];

/**
 * The half both verbs share: no session is a 401 the browser client answers
 * with one refresh and one retry, and anything else becomes pt-BR copy.
 */
async function withCart(call: (api: CustomerApi) => Promise<Cart>) {
  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    return NextResponse.json(await call(api));
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, COPY);
  }
}
