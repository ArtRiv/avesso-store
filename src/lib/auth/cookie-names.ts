/**
 * Just the names, with no `server-only` guard and no imports.
 *
 * The proxy needs these, and it runs in its own bundle before any request
 * reaches a page — so it cannot pull in the cookie-writing helpers, which are
 * server-only by design. Keeping the three names in one place is what stops
 * the proxy and the routes from drifting apart over a typo.
 */
export const ACCESS_COOKIE = "av_at";
export const REFRESH_COOKIE = "av_rt";
export const SESSION_COOKIE = "av_session";
