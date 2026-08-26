import "server-only";

import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";

/**
 * How a BFF route answers when the backend refuses.
 *
 * The backend's own message is not passed through. It is written for whoever
 * is holding the OpenAPI document, in English, and some of it is deliberately
 * vague in ways the storefront has to preserve rather than translate — a wrong
 * password and an unverified address produce the same 401 on purpose, and copy
 * here that told them apart would undo that.
 *
 * So each route names its own pt-BR message per status, and this only carries
 * the shape and the one header that matters.
 */
export type StatusCopy = Readonly<Record<number, string>>;

const FALLBACK = "Não foi possível concluir. Tente novamente em instantes.";

const SHARED: StatusCopy = {
  429: "Muitas tentativas. Aguarde um momento antes de tentar de novo.",
  503: "O serviço está indisponível no momento. Tente novamente em instantes.",
};

export function errorResponse(error: unknown, copy: StatusCopy): NextResponse {
  if (!(error instanceof ApiError)) {
    return NextResponse.json({ error: FALLBACK }, { status: 502 });
  }

  const message = copy[error.status] ?? SHARED[error.status] ?? FALLBACK;

  const headers = new Headers();

  // A rate limit that says when to come back is worth repeating verbatim —
  // the client honours it rather than guessing at a backoff.
  if (error.isRateLimited && error.retryAfterSeconds !== null) {
    headers.set("retry-after", String(error.retryAfterSeconds));
  }

  return NextResponse.json(
    { error: message },
    { status: error.status, headers },
  );
}

/** Nothing to return but success — the session lives in cookies. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
