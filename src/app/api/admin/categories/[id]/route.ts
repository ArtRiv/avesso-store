import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { assertOk, unwrap } from "@/lib/api/client";

/**
 * Editing and deleting a category.
 *
 * `DELETE` here is a **real** delete, unlike a product's — no order ever
 * references a category, so there is no history to protect. The pieces
 * attached to it survive and simply lose the association; a product in no
 * category is valid, and only the association rows cascade. That is the
 * sentence the screen tells the operator before they confirm.
 *
 * It answers 204, so there is nothing to hand back and the screen re-reads.
 */
const COPY = {
  400: "O nome está vazio ou passa do limite.",
  404: "Esta categoria não existe mais.",
  409: "Já existe uma categoria com este slug.",
} as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/categories/[id]">,
) {
  const { id } = await context.params;
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { name, slug, description } = body as {
    name?: unknown;
    slug?: unknown;
    description?: unknown;
  };

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: COPY[400] }, { status: 400 });
  }

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.PATCH("/categories/{id}", {
        params: { path: { id } },
        body: {
          ...(typeof name === "string" ? { name: name.trim() } : {}),
          ...(typeof slug === "string" && slug.trim()
            ? { slug: slug.trim() }
            : {}),
          // An emptied description is sent as an empty string rather than
          // omitted: omitting means "leave it alone", and clearing a field has
          // to be expressible.
          ...(typeof description === "string"
            ? { description: description.trim() }
            : {}),
        },
      }),
    ),
  );
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/categories/[id]">,
) {
  const { id } = await context.params;

  return withAdminApi(COPY, async (api) => {
    // 204: no body to unwrap, and `assertOk` is what this client offers for
    // exactly that. The screen re-reads rather than patching its own list.
    assertOk(
      await api.DELETE("/categories/{id}", { params: { path: { id } } }),
    );
  });
}
