import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";

/**
 * BFF route for /auth/me.
 *
 * Calls commerce-core GET /auth/me with the current user's session token.
 * Answers 401 if unauthenticated.
 */
export async function GET() {
  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  try {
    const me = unwrap(await api.GET("/auth/me"));
    return NextResponse.json(me);
  } catch {
    return NextResponse.json(
      { message: "Não foi possível carregar os dados do usuário." },
      { status: 500 },
    );
  }
}
