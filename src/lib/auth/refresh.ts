import "server-only";

import { publicApi, unwrap } from "@/lib/api/client";

import type { TokenPair } from "./cookies";

/**
 * Refresh, serialised per token.
 *
 * A refresh token is single-use: every `POST /auth/refresh` returns a new pair
 * and retires the one presented. Re-presenting a spent token is read as theft
 * and revokes the **entire session family** — the customer is signed out
 * everywhere. So two concurrent refreshes with the same token do not race to a
 * winner; they both lose, and so does the customer.
 *
 * That is easy to cause by accident. One page load can put several requests
 * through the proxy at once, and each of them would otherwise see the same
 * expired access token and reach for the same refresh token.
 *
 * Keyed by the token rather than global: a module-level singleton would hand
 * one visitor's new pair to whichever other visitor happened to be refreshing
 * at the same moment.
 *
 * What this cannot do is serialise across processes. Two instances of this app
 * holding the same refresh token would still collide — the fix for that lives
 * in the backend, not here, and nothing in this deployment runs more than one
 * instance today.
 */
const inFlight = new Map<string, Promise<TokenPair>>();

export function refreshSession(refreshToken: string): Promise<TokenPair> {
  const existing = inFlight.get(refreshToken);

  if (existing) {
    return existing;
  }

  const pending = exchange(refreshToken).finally(() => {
    inFlight.delete(refreshToken);
  });

  inFlight.set(refreshToken, pending);

  return pending;
}

async function exchange(refreshToken: string): Promise<TokenPair> {
  // Deliberately the unauthenticated client: this route takes no bearer token,
  // because the refresh token *is* the credential and the access token has
  // usually expired by the time anyone needs this.
  const result = await publicApi.POST("/auth/refresh", {
    body: { refreshToken },
  });

  return unwrap(result);
}
