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

/**
 * Who is signed in, for the header to render — an address and whether the back
 * office is worth offering. Cosmetic, and deliberately NOT folded into
 * `av_session`.
 *
 * `av_session` is read by the proxy on every single request and its value is
 * compared to "1". Overloading it with display data would put a parse in that
 * hot path and make a malformed value read as "signed out" — a cosmetic bug
 * that logs people out. Separate cookie, separate failure: this one going bad
 * costs a name in a menu and nothing else.
 *
 * Written and cleared alongside the other three in cookies.ts, so they cannot
 * drift apart.
 */
export const PROFILE_COOKIE = "av_profile";
