import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { adminAccess } from "@/lib/admin/session";
import { customerApi } from "@/lib/auth/session";

/**
 * Renaming a size, and removing one.
 *
 * Rename is the safe operation and the escape hatch for the unsafe one:
 * `OrderItem.variantLabel` is a snapshot taken at purchase, so renaming can
 * never rewrite what somebody bought. Carts are the deliberate opposite —
 * they hold no snapshot, so a cart line shows the new label at once, which is
 * the current truth a cart is supposed to promise.
 */
const RENAME_COPY = {
  400: "O rótulo está vazio ou passa de 20 caracteres.",
  404: "Este tamanho não existe mais.",
  409: "Este produto já tem um tamanho com esse rótulo.",
} as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants/[variantId]">,
) {
  const { id, variantId } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { label } = body as { label?: unknown };

  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: RENAME_COPY[400] }, { status: 400 });
  }

  return withAdminApi(RENAME_COPY, async (api) =>
    unwrap(
      await api.PATCH("/products/{id}/variants/{variantId}", {
        params: { path: { id, variantId } },
        body: { label: label.trim() },
      }),
    ),
  );
}

/**
 * Removing a size — the one destructive operation in the catalogue.
 *
 * The API refuses three ways, and only one of them is negotiable:
 *
 * 1. **The last size never goes.** A product with none is unbuyable. Nothing
 *    overrides this; archiving the product is the other door.
 * 2. **A size somebody bought never goes.** Order items reference it forever
 *    and the database RESTRICTs the delete. Rename is the escape hatch, and it
 *    costs history nothing.
 * 3. **Carts do not veto, but they are not discarded silently.** A size
 *    sitting in any cart is a 409 carrying `cartLineCount`. Going through
 *    needs BOTH `discardCartLines=true` and `expectedCartLineCount` — the
 *    count is taken again under a row lock inside the transaction, and any
 *    difference in either direction aborts and answers 409 with the new
 *    number.
 *
 * This handler does not translate case 3's 409. It passes the body through
 * intact, because the dialog needs `cartLineCount` to renumber its sentence
 * and clear its checkbox — a message alone cannot do that. The other refusals
 * do get pt-BR copy, since there is nothing structured in them to keep.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]/variants/[variantId]">,
) {
  const { id, variantId } = await context.params;
  const url = new URL(request.url);

  const discard = url.searchParams.get("discardCartLines") === "true";
  const expectedRaw = url.searchParams.get("expectedCartLineCount");
  const expected = expectedRaw === null ? null : Number(expectedRaw);

  // The API refuses one half without the other with a 400. Catching it here
  // keeps a programming mistake in this app from looking like a backend
  // refusal in the dialog.
  if (discard !== (expected !== null)) {
    return NextResponse.json(
      {
        error:
          "A autorização e a contagem viajam juntas — uma sem a outra não confirma nada.",
      },
      { status: 400 },
    );
  }

  if (expected !== null && (!Number.isInteger(expected) || expected < 0)) {
    return NextResponse.json(
      { error: "Contagem de linhas inválida." },
      { status: 400 },
    );
  }

  const access = await adminAccess();

  if (access === "signed-out") {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  if (access === "denied") {
    return NextResponse.json(
      { error: "Esta conta não tem permissão para remover um tamanho." },
      { status: 403 },
    );
  }

  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    return NextResponse.json(
      unwrap(
        await api.DELETE("/products/{id}/variants/{variantId}", {
          params: {
            path: { id, variantId },
            query: discard
              ? {
                  discardCartLines: true,
                  expectedCartLineCount: expected ?? 0,
                }
              : {},
          },
        }),
      ),
    );
  } catch (error) {
    return removalRefusal(error);
  }
}

/** The 409 body the API sends when carts hold this size. */
type VariantInCarts = { message: string; cartLineCount: number };

function hasCartLineCount(body: unknown): body is VariantInCarts {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as VariantInCarts).cartLineCount === "number"
  );
}

/**
 * Turns a refusal into something the dialog can render.
 *
 * A 409 carrying `cartLineCount` keeps it — that number is the whole
 * mechanism, and the dialog uses it to renumber the sentence and uncheck the
 * box. A 409 without one is a refusal with no way through: the last size, or
 * one that was sold. The two are told apart by the count's presence, which is
 * exactly how the document describes them.
 */
function removalRefusal(error: unknown): NextResponse {
  if (!(error instanceof ApiError)) {
    return NextResponse.json(
      { error: "Não foi possível concluir. Tente novamente em instantes." },
      { status: 502 },
    );
  }

  if (error.isUnauthorized) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  if (error.isConflict && hasCartLineCount(error.body)) {
    return NextResponse.json(
      { reason: "carts", cartLineCount: error.body.cartLineCount },
      { status: 409 },
    );
  }

  if (error.isConflict) {
    // Prose, and the two cases read differently enough to tell apart — but
    // the panel already knows when it is holding the last size, so anything
    // else reaching here is the sold one.
    return NextResponse.json({ reason: "blocked" }, { status: 409 });
  }

  if (error.isNotFound) {
    return NextResponse.json(
      { error: "Este tamanho não existe mais." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { error: "Não foi possível remover este tamanho." },
    { status: error.status },
  );
}
