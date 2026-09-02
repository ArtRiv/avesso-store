import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { apiAs, publicApi, unwrap } from "@/lib/api/client";
import {
  badRequest,
  errorResponse,
  noContent,
} from "@/lib/auth/api-response";
import { probeAdminAccess } from "@/lib/admin/session";
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

    setSession(await cookies(), pair, {
      email: credentials.email,
      backOffice: await hasBackOffice(pair.accessToken),
    });

    return noContent();
  } catch (error) {
    return errorResponse(error, COPY);
  }
}

/**
 * Asks once, here, whether this account has the back office — so the store
 * header never has to.
 *
 * The header renders on every page of the shop, and `adminAccess()` costs a
 * request to the API. Asking on each navigation to decide whether to draw one
 * menu entry is the wrong trade; asking once at sign-in and recording it in the
 * session profile is the right one.
 *
 * A failure answers false rather than propagating. This runs after the tokens
 * are already in hand, and refusing to sign someone in because a cosmetic probe
 * timed out would be trading a working session for a menu entry. The worst case
 * is a real operator who has to reach /admin by typing it until their next
 * sign-in — where the panel gate, which is the one that decides anything, will
 * let them in exactly as before.
 */
async function hasBackOffice(accessToken: string): Promise<boolean> {
  try {
    return (await probeAdminAccess(apiAs(accessToken))) === "granted";
  } catch {
    return false;
  }
}
