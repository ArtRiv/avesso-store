import "server-only";

import { cookies } from "next/headers";

import { apiAs } from "@/lib/api/client";

import { hasSessionMarker, readAccessToken } from "./cookies";

/**
 * Reading the session is safe anywhere. Repairing it happens in exactly two
 * places, and neither of them is here.
 *
 * Two constraints decide this. A server component cannot set a cookie — HTTP
 * will not allow it once the response has started streaming — so a component
 * that finds an expired token mid-render has no way to fix it. And `av_rt` is
 * scoped to `/api/auth/refresh`, so no other route in this app is even sent
 * it; a cart route handler could not refresh if it wanted to.
 *
 * So refresh happens either in the proxy, before a page render begins, or in
 * the browser through src/lib/api/browser.ts, which retries the call it was
 * already making. Everything here just reads.
 */

/** The current access token, if the browser still has an unexpired one. */
export async function getAccessToken(): Promise<string | null> {
  return readAccessToken(await cookies());
}

/**
 * Whether this browser has a session at all — true while the refresh token
 * lives, including in the minutes after the access token has expired. This is
 * the question a header should ask, so it does not flip to "Entrar" every
 * fifteen minutes for someone who is still perfectly signed in.
 */
export async function hasSession(): Promise<boolean> {
  return hasSessionMarker(await cookies());
}

/**
 * Thrown when something needs a token and the browser has none to give. The
 * proxy is meant to have refreshed before a page ever got here, so this is the
 * edge — a token that expired between the proxy and the render, or a visitor
 * who is simply not signed in.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super("A sessão expirou.");
    this.name = "SessionExpiredError";
  }
}

/**
 * An API client bound to the current customer, or null when nobody is signed
 * in. For pages that show more when there is a session and still render when
 * there is not — the header's sacola count, for one.
 */
export async function customerApi(): Promise<ReturnType<
  typeof apiAs
> | null> {
  const token = await getAccessToken();

  return token ? apiAs(token) : null;
}

/**
 * The same, for a page that has no meaning without a session. The caller is
 * expected to let this throw into an error boundary that sends the customer
 * to sign in.
 */
export async function requireCustomerApi(): Promise<ReturnType<typeof apiAs>> {
  const api = await customerApi();

  if (!api) {
    throw new SessionExpiredError();
  }

  return api;
}
