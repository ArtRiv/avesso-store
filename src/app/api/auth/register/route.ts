import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { publicApi, unwrap } from "@/lib/api/client";
import { badRequest, errorResponse } from "@/lib/auth/api-response";

/**
 * Creates the account and nothing else.
 *
 * Registering does **not** sign anyone in, and there is no token in the
 * response to put in a cookie: password login stays shut until the e-mailed
 * link is followed, because e-mail verification is mandatory. So the caller's
 * next screen is "check your inbox", never the sacola.
 *
 * Registering again with an address that exists but was never verified resends
 * the link and creates no second account, so the 409 below really does mean a
 * verified account is already there.
 */
const COPY = {
  400: "Confira os dados. A senha precisa ter entre 8 e 128 caracteres.",
  409: "Já existe uma conta com esse e-mail. Tente entrar.",
  429: "Muitas contas criadas a partir daqui. Tente novamente mais tarde.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const form = body as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
  };

  if (
    typeof form.email !== "string" ||
    typeof form.password !== "string" ||
    typeof form.name !== "string"
  ) {
    return badRequest("Informe nome, e-mail e senha.");
  }

  try {
    const user = unwrap(
      await publicApi.POST("/auth/register", {
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
        },
      }),
    );

    return NextResponse.json({ email: user.email }, { status: 201 });
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
