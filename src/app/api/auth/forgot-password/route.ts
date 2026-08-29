import type { NextRequest } from "next/server";

import { assertOk, publicApi } from "@/lib/api/client";
import {
  badRequest,
  errorResponse,
  noContent,
} from "@/lib/auth/api-response";

/**
 * Asks for a reset e-mail.
 *
 * The backend answers identically whether or not the address has an account —
 * it is anti-enumeration, and nothing may be inferred from the response. This
 * route keeps that intact by returning the same 204 either way, and the page
 * above it must show the same confirmation either way. A screen that said "we
 * couldn't find that e-mail" would hand an attacker the account list the
 * backend just refused to give them.
 *
 * The rate limit here is per address rather than per IP, because the abuse is
 * not against this store — it is using our mail reputation to flood someone
 * else's inbox.
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
    assertOk(await publicApi.POST("/auth/forgot-password", { body: { email } }));

    return noContent();
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
