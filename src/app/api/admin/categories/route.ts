import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

/**
 * Creating a category.
 *
 * Gated on `products.create` upstream rather than a permission of its own: the
 * catalogue is treated as one capability, since no role manages categories
 * without managing products.
 *
 * `slug` is omitted when the operator left the field empty, which makes the
 * API generate one from the name and add a numeric suffix on collision. Send
 * one that is taken and the answer is 409 instead — a caller who chose the
 * slug wants that slug, and silently renaming it would be the API deciding
 * something the operator typed.
 */
const COPY = {
  400: "O nome está vazio ou passa do limite.",
  409: "Já existe uma categoria com este slug.",
} as const;

export async function POST(request: NextRequest) {
  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { name, slug, description } = body as {
    name?: unknown;
    slug?: unknown;
    description?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: COPY[400] }, { status: 400 });
  }

  return withAdminApi(
    COPY,
    async (api) =>
      unwrap(
        await api.POST("/categories", {
          body: {
            name: name.trim(),
            ...(typeof slug === "string" && slug.trim()
              ? { slug: slug.trim() }
              : {}),
            ...(typeof description === "string" && description.trim()
              ? { description: description.trim() }
              : {}),
          },
        }),
      ),
    201,
  );
}
