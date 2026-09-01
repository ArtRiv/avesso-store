import "server-only";

import { cache } from "react";

import { apiAs } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { customerApi } from "@/lib/auth/session";

/**
 * Whether this session may run the back office — asked of the API, because
 * nothing else can answer it.
 *
 * There is no `/auth/me`, no `/users/me`, no route of any kind that reports
 * the caller's permissions, and the access token carries only `{ sub }`: the
 * backend resolves permissions from the database on every request, which is
 * exactly what makes a revoked permission revoked *now* rather than in fifteen
 * minutes. Decoding the token would learn nothing, and caching an answer
 * across requests would give back the staleness the backend went out of its
 * way to avoid.
 *
 * So the panel asks a question only an operator can be answered: `status` on
 * `GET /products` REQUIRES `products.read` and is a 403 without it — the spec
 * is explicit that it is refused rather than silently ignored. `perPage=1`
 * because the answer is the status code; the body is thrown away.
 *
 * This is a gate on the UI, not a security boundary. Every write the panel
 * makes is permission-checked at the backend and answers 403 or 404 on its
 * own; hiding a button has never protected anything.
 */
export type AdminAccess = "granted" | "denied" | "signed-out";

/**
 * Memoised per render pass, never across requests.
 *
 * `cache()` de-duplicates within one React render — the layout and a page
 * underneath it ask once between them — and is thrown away when the request
 * ends. That is the whole intended lifetime: a permission revoked between two
 * page loads has to bite on the second one.
 */
export const adminAccess = cache(async (): Promise<AdminAccess> => {
  const api = await customerApi();

  return api ? probeAdminAccess(api) : "signed-out";
});

/**
 * The question itself, against a client the caller already holds.
 *
 * Split out of `adminAccess` for the login route, which has a fresh access
 * token in hand and no cookie written yet — it records the answer in the
 * session profile so the store header can draw the Back office entry without
 * asking again on every navigation. Same probe, one place, so the two cannot
 * come to disagree about what "has the back office" means.
 */
export async function probeAdminAccess(
  api: ReturnType<typeof apiAs>,
): Promise<AdminAccess> {
  const { response } = await api.GET("/products", {
    params: { query: { status: "all", perPage: 1 } },
  });

  if (response.ok) {
    return "granted";
  }

  // 401 here means the token expired between the proxy's refresh and this
  // render. The browser repairs that on its next call; from the panel's point
  // of view there is no usable session right now.
  return response.status === 401 ? "signed-out" : "denied";
}

/** Thrown when a panel screen runs without the permission it needs. */
export class AdminAccessError extends Error {
  readonly access: Exclude<AdminAccess, "granted">;

  constructor(access: Exclude<AdminAccess, "granted">) {
    super(
      access === "signed-out"
        ? "A sessão expirou."
        : "Esta conta não tem acesso ao painel.",
    );
    this.name = "AdminAccessError";
    this.access = access;
  }
}

/**
 * An API client for a screen that has no meaning without back-office rights.
 *
 * The layout has usually decided this already; a page calling it again costs
 * nothing, because `adminAccess` answered once for the whole render.
 */
export async function requireAdminApi(): Promise<ReturnType<typeof apiAs>> {
  const access = await adminAccess();

  if (access !== "granted") {
    throw new AdminAccessError(access);
  }

  const api = await customerApi();

  if (!api) {
    throw new AdminAccessError("signed-out");
  }

  return api;
}

/**
 * How a panel route handler answers when the backend refuses.
 *
 * Deliberately thin: the backend is the authority on every one of these, and
 * this only names them in pt-BR. A 404 on a privileged read is "gone **or**
 * not yours" by design — copy here must never say "acesso negado", which
 * would confirm the thing the 404 exists to withhold.
 */
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
