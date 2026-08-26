import type { components } from "./schema";

/**
 * The backend's error convention, in one place
 * (docs/backend-commerce-core.md, "Convenção de erros").
 *
 * Every failing route answers the same shape, so the storefront never has to
 * guess at a body. What it does have to do is treat several of these as screens
 * rather than as generic failure — 409 in particular is the last unit selling
 * between the sacola and the checkout, and it has an artboard of its own.
 */
export type ErrorBody = components["schemas"]["ErrorResponse"];

export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody | null;
  /** Seconds the server asked us to wait. Only ever present on a 429. */
  readonly retryAfterSeconds: number | null;

  constructor(
    status: number,
    body: ErrorBody | null,
    retryAfterSeconds: number | null,
  ) {
    super(messageOf(body) ?? `A API respondeu ${String(status)}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** No token, or one that expired. The BFF answers this with a refresh. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Gone, or not yours. A customer asking for someone else's order gets this,
   * not a 403 — so copy here must never say "acesso negado", which would tell
   * the customer something the backend deliberately refuses to confirm.
   */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * A state conflict: stock ran out, the freight quote went stale, the order
   * is already paid. Artboard 10 is what this looks like at checkout.
   */
  get isConflict(): boolean {
    return this.status === 409;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** The payment or shipping provider is down, or the feature is off here. */
  get isUnavailable(): boolean {
    return this.status === 503;
  }
}

/**
 * `message` is a string for a domain failure and an array of strings when the
 * validation pipe rejected a body field by field.
 */
function messageOf(body: ErrorBody | null): string | null {
  if (!body) {
    return null;
  }

  if (typeof body.message === "string") {
    return body.message;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(" ");
  }

  return null;
}

/**
 * `Retry-After` is seconds here. The header can also carry an HTTP date by
 * spec, so a non-numeric value is treated as absent rather than as zero —
 * retrying immediately is the one behaviour a rate limit is asking us not to.
 */
export function retryAfterFrom(headers: Headers): number | null {
  const raw = headers.get("retry-after");

  if (!raw) {
    return null;
  }

  const seconds = Number(raw);

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
