import type { NextRequest } from "next/server";

import { assertOk, publicApi } from "@/lib/api/client";
import {
  badRequest,
  errorResponse,
  noContent,
} from "@/lib/auth/api-response";

/**
 * Spends the token from the verification e-mail, which is what unlocks
 * password login. Single-use, and it expires after 24 hours.
 *
 * The token arrives on the /verify-email page as a query parameter and is
 * posted here rather than sent from the page's own render — a link in an
 * e-mail gets prefetched, scanned by mail providers and followed by link
 * checkers, and any of those would silently burn a single-use token before the
 * customer ever clicked.
 */
const COPY = {
  400: "Este link de confirmação expirou ou já foi usado. Peça um novo.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const { token } = body as { token?: unknown };

  if (typeof token !== "string" || token.length === 0) {
    return badRequest("Link de confirmação inválido.");
  }

  try {
    assertOk(await publicApi.POST("/auth/verify-email", { body: { token } }));

    return noContent();
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
