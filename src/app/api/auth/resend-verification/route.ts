import type { NextRequest } from "next/server";

import { assertOk, publicApi } from "@/lib/api/client";
import {
  badRequest,
  errorResponse,
  noContent,
} from "@/lib/auth/api-response";

/**
 * Sends the verification e-mail again.
 *
 * Reachable from the /verify-email page, which is where someone lands holding
 * a link that has expired — the token is only good for 24 hours, and a link
 * that has already been spent looks identical to one that timed out. Without
 * this route that customer has an account they can never sign in to and no way
 * back, since password login stays shut until the address is confirmed.
 *
 * Like forgot-password, this reveals nothing about whether the address exists.
 */
const COPY = {
  400: "Confira o e-mail digitado.",
  429: "Já enviamos um e-mail para este endereço há pouco. Aguarde um momento.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const { email } = body as { email?: unknown };

  if (typeof email !== "string") {
    return badRequest("Informe o e-mail.");
  }

  try {
    assertOk(
      await publicApi.POST("/auth/resend-verification", { body: { email } }),
    );

    return noContent();
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
