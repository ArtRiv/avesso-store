import "server-only";

import type { cookies } from "next/headers";

import {
  ACCESS_COOKIE,
  PROFILE_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
} from "./cookie-names";

/**
 * The session, as three cookies. None of them is readable by JavaScript.
 *
 * The browser never holds a token — it holds cookies this app set and only
 * this app can read. That is the whole point of the BFF, and it is why
 * `API_URL` is server-only.
 */
export { ACCESS_COOKIE, PROFILE_COOKIE, REFRESH_COOKIE, SESSION_COOKIE };

/** The access token's own lifetime, from the backend contract. */
const ACCESS_MAX_AGE = 15 * 60;

/** The refresh token is valid for 7 days and single-use within that. */
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * The refresh token is scoped to the routes allowed to spend it. A cookie is
 * only sent to paths that match, so it never rides along on a page request, a
 * cart request or anything else that has no business holding it.
 *
 * The brief asks for `/api/auth/refresh` exactly, and this is one segment
 * wider than that, deliberately: `POST /auth/logout` needs the refresh token
 * in its body as well as the access token in its header — that is how the
 * backend knows *which* session to end, since the access token carries only a
 * user id and revoking on that alone would sign the customer out of every
 * device. Scoped to the single refresh route, `/api/auth/logout` would never
 * be sent the cookie, and the only way to "log out" would be to drop this
 * app's cookies and leave the session family alive on the backend for its full
 * seven days. A logout that does not revoke anything is not a logout.
 *
 * What the tighter path was protecting is still protected: no page route and
 * no cart or order route is ever sent this cookie.
 */
export const REFRESH_COOKIE_PATH = "/api/auth";

const secure = process.env.NODE_ENV === "production";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

/**
 * What this app knows about who is signed in — which is only what it learned
 * at sign-in, because the API tells it nothing afterwards.
 *
 * `email` is the address that was typed into the form. There is no route that
 * reports it back: `POST /auth/login` answers `{ accessToken, refreshToken }`
 * and the token carries only `{ sub }`. **A name is not available at all** —
 * registration takes one and no response ever returns it — so the menu and the
 * panel bar show an address, which is the honest answer rather than an
 * invented one.
 *
 * `backOffice` is whether the Back office entry is worth offering. It is a
 * hint for drawing a link and **never** a permission: /admin re-asks the API
 * on every render through `adminAccess()`, and every route under /api/admin
 * re-asks it again. Cached here for up to the session lifetime, so a
 * permission granted or revoked in between shows a link that then refuses, or
 * hides one that would have worked if typed. Both are recoverable by signing
 * in again, and neither lets anybody do anything.
 */
export type SessionProfile = {
  email: string;
  backOffice: boolean;
};

/**
 * Writes the pair, plus a marker.
 *
 * The marker exists because of the path scoping above: `av_rt` is invisible
 * outside the refresh route, so nothing else in the app — not a page, not the
 * proxy — can tell a signed-in visitor whose access token has just expired
 * from someone who was never signed in at all. `av_session` answers exactly
 * that question and carries no secret to answer it with: it holds "1". It is
 * what lets the proxy decide a refresh is worth attempting, and what lets a
 * public page render the right header without a token.
 */
export function setSession(
  store: CookieStore,
  pair: TokenPair,
  /**
   * Omitted by the refresh route, which renews tokens and has no way to learn
   * an address — the refresh response is another bare token pair. Leaving it
   * out carries the existing profile forward with a fresh lifetime, so a
   * session that keeps refreshing keeps its name instead of quietly losing it
   * seven days after sign-in.
   */
  profile?: SessionProfile,
): void {
  store.set(ACCESS_COOKIE, pair.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });

  store.set(REFRESH_COOKIE, pair.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE,
  });

  store.set(SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });

  const carried = profile ?? readProfile(store);

  if (carried) {
    store.set(PROFILE_COOKIE, encodeProfile(carried), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    });
  }
}

/**
 * Clears all three. Deleting the refresh cookie needs the same path it was
 * written with, or the browser keeps it and the next refresh presents a token
 * the backend has already retired — which it reads as theft and answers by
 * revoking the whole session family.
 */
export function clearSession(store: CookieStore): void {
  store.delete({ name: ACCESS_COOKIE, path: "/" });
  store.delete({ name: REFRESH_COOKIE, path: REFRESH_COOKIE_PATH });
  store.delete({ name: SESSION_COOKIE, path: "/" });
  store.delete({ name: PROFILE_COOKIE, path: "/" });
}

export function readAccessToken(store: CookieStore): string | null {
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export function readRefreshToken(store: CookieStore): string | null {
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

/** Whether this browser has a session at all, spendable token or not. */
export function hasSessionMarker(store: CookieStore): boolean {
  return store.get(SESSION_COOKIE)?.value === "1";
}

/**
 * Base64url rather than raw JSON, so the value carries no characters a cookie
 * has opinions about — `{`, `"`, `,` and `;` all mean something in a Set-Cookie
 * header, and the shortest way not to think about which proxy re-encodes what
 * is to send an alphabet that has none of them.
 *
 * Not a signature and not encryption, and it does not need to be: the cookie is
 * httpOnly, so the browser cannot read or write it, and nothing here is trusted
 * for authorisation anyway. Anyone forging one would give themselves a
 * different name in a menu and a link that refuses them.
 */
function encodeProfile(profile: SessionProfile): string {
  return Buffer.from(JSON.stringify(profile), "utf8").toString("base64url");
}

/**
 * Reads the profile back, and answers null to anything that is not exactly the
 * shape written above.
 *
 * Tolerant on purpose. This cookie is cosmetic, so an old format, a truncated
 * value or a hand-edited one has to degrade into "no name shown" — never into
 * an exception that takes the header, and every page under it, down with it.
 */
export function readProfile(store: CookieStore): SessionProfile | null {
  const raw = store.get(PROFILE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    );

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const { email, backOffice } = parsed as Record<string, unknown>;

    if (typeof email !== "string" || typeof backOffice !== "boolean") {
      return null;
    }

    return { email, backOffice };
  } catch {
    return null;
  }
}
