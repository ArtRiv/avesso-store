import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type CreateProduct = components["schemas"]["CreateProductDto"];

/**
 * Creating a product.
 *
 * Born DRAFT and off the storefront until moved to ACTIVE — there is no
 * publish route upstream, `status` on the editor's PATCH is the path, and this
 * route does not set it. A product that appeared in the shop the instant it
 * was created would be a piece with no stock and no photograph.
 *
 * The body is forwarded as the DTO the document declares rather than
 * re-validated field by field: the backend's pipe rejects an unknown key
 * outright instead of ignoring it, so a second set of rules here could only
 * disagree with the one that decides.
 */
const COPY = {
  400: "Algum campo não passou na validação da API.",
  409: "Já existe um produto com este slug.",
} as const;

export async function POST(request: NextRequest) {
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { name, priceCents } = body as {
    name?: unknown;
    priceCents?: unknown;
  };

  // The two the screen cannot submit without. Everything else the API judges.
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
  }

  if (
    typeof priceCents !== "number" ||
    !Number.isInteger(priceCents) ||
    priceCents < 1
  ) {
    return NextResponse.json(
      { error: "O preço precisa ser maior que zero." },
      { status: 400 },
    );
  }

  return withAdminApi(
    COPY,
    async (api) =>
      unwrap(await api.POST("/products", { body: body as CreateProduct })),
    201,
  );
}
