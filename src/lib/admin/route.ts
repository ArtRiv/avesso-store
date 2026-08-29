import "server-only";

import { NextResponse } from "next/server";

import { apiAs } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { errorResponse, type StatusCopy } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";

import { adminAccess } from "./session";

type AdminApi = ReturnType<typeof apiAs>;

/**
 * The half every panel route handler shares.
 *
 * Two refusals before the call and one translation after it:
 *
 * - **no session** is a 401, which the browser client answers with one refresh
 *   and one retry (src/lib/api/browser.ts). It must be a 401 and not a
 *   redirect, or that repair never fires.
 * - **a session without back-office rights** is a 403 that never reaches the
 *   backend. This is not the security check — the backend re-asks on every
 *   call and refuses on its own authority — it is what stops the panel from
 *   spending a request to be told what it could already tell.
 * - **anything the backend refuses** becomes pt-BR copy through the store's
 *   existing `errorResponse`, which also carries `Retry-After` on a 429.
 *
 * `adminAccess()` is memoised per request, so a handler that calls this pays
 * for the probe once no matter how many times it asks.
 */
export async function withAdminApi<T>(
  copy: StatusCopy,
  call: (api: AdminApi) => Promise<T>,
  /**
   * The status a success answers with. 200 unless the route created
   * something — a caller that cannot tell a create from an update has lost
   * information the protocol was carrying for it.
   */
  successStatus = 200,
): Promise<NextResponse> {
  const access = await adminAccess();

  if (access === "signed-out") {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  if (access === "denied") {
    return NextResponse.json(
      { error: "Esta conta não tem permissão para esta operação." },
      { status: 403 },
    );
  }

  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    const result = await call(api);

    return result === undefined
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(result, { status: successStatus });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, copy);
  }
}

/**
 * Reads a JSON body, or answers 400.
 *
 * Returns a tuple rather than throwing so a handler can branch without a
 * try/catch around its whole body.
 */
export async function readJson(
  request: Request,
): Promise<[unknown, null] | [null, NextResponse]> {
  try {
    return [await request.json(), null];
  } catch {
    return [
      null,
      NextResponse.json({ error: "Requisição inválida." }, { status: 400 }),
    ];
  }
}
