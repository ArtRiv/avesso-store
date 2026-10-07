import type { components } from "./schema";

/**
 * Convenção de erros da API.
 *
 * Todas as rotas de erro respondem no mesmo formato (ErrorResponse),
 * permitindo tratamento uniforme no storefront.
 */
export type ErrorBody = components["schemas"]["ErrorResponse"];

export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody | null;
  /** Segundos que o servidor solicitou de espera. Presente apenas em 429. */
  readonly retryAfterSeconds: number | null;

  constructor(
    status: number,
    body: ErrorBody | null,
    retryAfterSeconds: number | null,
  ) {
    super(
      messageOf(body) ??
        "Ocorreu um erro inesperado. Tente novamente em instantes.",
    );
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** Sem token ou token expirado. O BFF trata com refresh de sessão. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Recurso inexistente ou não pertencente ao usuário.
   */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Conflito de estado: estoque esgotado, cotação de frete expirada, pedido já pago.
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
