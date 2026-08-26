import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { assertOk, publicApi } from "@/lib/api/client";
import {
  badRequest,
  errorResponse,
  noContent,
} from "@/lib/auth/api-response";
import { clearSession } from "@/lib/auth/cookies";

/**
 * Sets a new password from the token in the reset e-mail.
 *
 * Two side effects worth knowing about. Every existing session is revoked, not
 * only this one — a password change is exactly when "sign me out everywhere"
 * is the right default. And the address is marked verified if it was not
 * already, because reaching a reset token proves possession of the mailbox,
 * which is the same proof the verification e-mail asks for.
 *
 * Because of the first, this clears the cookies here too. Leaving them in
 * place would hand the customer an access token that still works for up to
 * fifteen minutes against a session the backend has already thrown away, and a
 * refresh token that is certain to fail — and to look like theft when it does.
 */
const COPY = {
  400: "Este link expirou ou já foi usado, ou a senha não atende ao mínimo de 8 caracteres.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const form = body as { token?: unknown; newPassword?: unknown };

  if (typeof form.token !== "string" || form.token.length === 0) {
    return badRequest("Link de redefinição inválido.");
  }

  if (typeof form.newPassword !== "string") {
    return badRequest("Informe a nova senha.");
  }

  try {
    assertOk(
      await publicApi.POST("/auth/reset-password", {
        body: { token: form.token, newPassword: form.newPassword },
      }),
    );

    clearSession(await cookies());

    return noContent();
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
