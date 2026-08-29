import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { publicApi, unwrap } from "@/lib/api/client";
import {
  badRequest,
  errorResponse,
  noContent,
} from "@/lib/auth/api-response";
import { setSession } from "@/lib/auth/cookies";

/**
 * The only place in this app that talks to POST /auth/login.
 *
 * The tokens never leave this function — they go straight into httpOnly
 * cookies and the browser gets a 204. That is the BFF: the customer's browser
 * is authenticated to *this* app, and only this app is authenticated to the
 * API.
 */
const COPY = {
  400: "Confira o e-mail digitado.",
  // The backend answers a wrong address, a wrong password, an unverified
  // account and a Google-only account with the identical 401, so that nothing
  // here can be used to discover which addresses have accounts. The copy has
  // to keep that promise rather than explain it away.
  401: "E-mail ou senha incorretos, ou o e-mail ainda não foi confirmado.",
  429: "Muitas tentativas de entrada. Aguarde alguns minutos.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const credentials = body as { email?: unknown; password?: unknown };

  if (
    typeof credentials.email !== "string" ||
    typeof credentials.password !== "string"
  ) {
    return badRequest("Informe e-mail e senha.");
  }

  try {
    const pair = unwrap(
      await publicApi.POST("/auth/login", {
        body: {
          email: credentials.email,
          password: credentials.password,
        },
      }),
    );

    setSession(await cookies(), pair);

    return noContent();
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
