import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, SESSION_COOKIE } from "@/lib/auth/cookie-names";

/**
 * Renews an expired session before a page render begins.
 *
 * This file is `proxy.ts` rather than `middleware.ts` because that is what
 * Next 16 renamed it to; the export has to be named `proxy` too. It runs on
 * the nodejs runtime, which is the only runtime it supports.
 *
 * Why it exists at all: a server component cannot set a cookie, so it cannot
 * refresh. By the time a page is rendering, the response has started and the
 * chance is gone. The proxy is the last point that still holds an unstarted
 * response, so it is where a fifteen-minute-old access token gets replaced —
 * before any component notices it was missing.
 *
 * It decides on `av_session`, not on the refresh token: `av_rt` is scoped to
 * /api/auth and is never sent here. The marker says "this browser has a
 * session"; the absence of `av_at` says "its access token has expired". Both
 * together are the only case worth a redirect.
 */
export function proxy(request: NextRequest) {
  if (!shouldRenew(request)) {
    return NextResponse.next();
  }

  const refresh = new URL("/api/auth/refresh", request.nextUrl.origin);

  refresh.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(refresh);
}

function shouldRenew(request: NextRequest): boolean {
  // Only navigations. A redirect answering a POST is a 307 that repeats the
  // method and body against the new URL, which would deliver a checkout to the
  // refresh route. Anything that is not a plain GET repairs itself through the
  // browser client instead — see src/lib/api/browser.ts.
  if (request.method !== "GET") {
    return false;
  }

  // A hovered link should not spend a single-use refresh token for a page the
  // customer may never open.
  if (request.headers.get("next-router-prefetch") === "1") {
    return false;
  }

  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const hasMarker = request.cookies.get(SESSION_COOKIE)?.value === "1";

  return !hasAccess && hasMarker;
}

export const config = {
  /**
   * Everything except the API, Next's own assets and the files served from
   * public/. The API is excluded on purpose and not just for cost: the refresh
   * route itself lives there, and redirecting it to itself is a loop.
   */
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
