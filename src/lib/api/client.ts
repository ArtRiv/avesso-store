import "server-only";

import createClient from "openapi-fetch";

import type { paths } from "./schema";
import { ApiError, retryAfterFrom, type ErrorBody } from "./errors";

/**
 * The one typed client, built on the document `pnpm api:types` generates.
 *
 * Server-only, and not by accident: `API_URL` has no NEXT_PUBLIC_ prefix and
 * every call goes through this app, so the browser never learns the API's
 * origin and never holds a token. `import "server-only"` turns a mistaken
 * client-component import into a build error rather than a leak.
 */
const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error(
    "API_URL is not set. Copy .env.example to .env.local — it is server-only " +
      "and must never be prefixed NEXT_PUBLIC_.",
  );
}

/**
 * No timeout is configured anywhere, deliberately. The backend is on Render's
 * free tier: it hibernates after 15 minutes idle and takes about a minute to
 * wake, so the first request after a quiet period looks frozen and is not.
 * A 10s timeout here would turn that into an error the store cannot recover
 * from, and the documented instruction is not to work around the cold start
 * but to keep loading states honest.
 */
export const publicApi = createClient<paths>({ baseUrl: API_URL });

/**
 * A client carrying one customer's access token.
 *
 * `cache: "no-store"` is a correctness rule, not a performance one: every
 * response reachable through this client belongs to the token that fetched it,
 * and a cached cart or order shared between two visitors is one customer
 * reading another's. The public catalogue is a different client for exactly
 * this reason.
 */
export function apiAs(accessToken: string) {
  return createClient<paths>({
    baseUrl: API_URL,
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

type FetchResult<T> =
  | { data: T; error?: never; response: Response }
  | { data?: never; error: unknown; response: Response };

/**
 * openapi-fetch answers with `{ data, error }` rather than throwing. These two
 * turn a failure into an ApiError so a screen can branch on 409 or 429 instead
 * of on an untyped body — see src/lib/api/errors.ts.
 */
export function unwrap<T>(result: FetchResult<T>): NonNullable<T> {
  assertOk(result);

  // openapi-fetch types `data` as optional across the whole result union, so
  // the inferred T carries an `undefined` that a successful response with a
  // body never actually has. Use `assertOk` for the 204 routes, where the
  // absence is real.
  return result.data as NonNullable<T>;
}

/** For the routes that answer 204 and carry no body at all. */
export function assertOk<T>(result: FetchResult<T>): void {
  if (result.response.ok && result.error === undefined) {
    return;
  }

  throw new ApiError(
    result.response.status,
    asErrorBody(result.error),
    retryAfterFrom(result.response.headers),
  );
}

function asErrorBody(error: unknown): ErrorBody | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as Partial<ErrorBody>;

  return typeof candidate.statusCode === "number" ? (error as ErrorBody) : null;
}
