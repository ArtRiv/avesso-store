import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

/**
 * The sacola, re-read from the client.
 *
 * This exists for one caller: the checkout's 409. The conflict body is prose
 * and names the sold-out pieces inside a sentence, so the screen that has to
 * strike a *line* through cannot learn which one from the error. It asks the
 * cart instead — `GET /cart` reads price, status and per-size stock live on
 * every request, precisely so a storefront can tell which line went bad —
 * and that reconciliation is recorded in README.md as a deliberate deferral.
 *
 * Every other read of the cart happens on the server, during a render.
 */
const COPY = {} as const;

export async function GET() {
  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    return NextResponse.json(unwrap(await api.GET("/cart")));
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, COPY);
  }
}
