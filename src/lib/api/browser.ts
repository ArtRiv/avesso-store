"use client";

/**
 * The browser's half of the session repair.
 *
 * The proxy keeps page renders supplied with a fresh token, but it only acts
 * on navigations. A fetch fired from a component — adding to the sacola,
 * quoting freight, changing a quantity — can still meet a token that expired
 * seconds ago. This is what answers that: refresh once, retry once, and on a
 * second 401 the session is over.
 *
 * Everything here talks to this app's own routes. It never sees the API's
 * origin and never holds a token; the cookies do all of it, and they are
 * httpOnly.
 */

/**
 * The single in-flight refresh.
 *
 * This is the module-level promise the brief insists on, and the reason is
 * worth restating: a refresh token is single-use, and presenting a spent one
 * is read as theft and revokes the whole session family. If three components
 * each hit a 401 at once and each called the refresh route, two of them would
 * present a token the first had already retired, and the customer would be
 * signed out for the crime of loading a busy page.
 *
 * A module-level singleton is right *here* and would be wrong on the server:
 * this module exists once per browser tab, so it is already scoped to one
 * customer. The server's copy is keyed by token for exactly that reason.
 */
let inFlightRefresh: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  inFlightRefresh ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

/** Thrown when the session is over and the customer has to sign in again. */
export class SessionEndedError extends Error {
  constructor() {
    super("A sessão expirou. Entre novamente.");
    this.name = "SessionEndedError";
  }
}

/**
 * `fetch` against this app's own API routes, with the session repaired around
 * it.
 *
 * `init.body` must be re-readable, which in practice means a string — a
 * ReadableStream body cannot survive the retry. Every call in this store sends
 * JSON, so that holds.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const first = await fetch(path, init);

  if (first.status !== 401) {
    return first;
  }

  if (!(await refreshOnce())) {
    throw new SessionEndedError();
  }

  const second = await fetch(path, init);

  // A 401 that survives a successful refresh is not a stale token. The backend
  // is refusing, and asking again would only spend more single-use tokens.
  if (second.status === 401) {
    throw new SessionEndedError();
  }

  return second;
}

/** The JSON body these routes return when they refuse. */
type ProblemBody = { error?: string };

/**
 * Reads the message a BFF route sent, falling back to something honest when a
 * response carries no body — a 502 from a cold backend, for instance.
 */
export async function problemMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ProblemBody;

    if (typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // No body, or not JSON. Fall through.
  }

  return "Não foi possível concluir. Tente novamente em instantes.";
}
