import { describe, expect, it } from "vitest";
import { ApiError, retryAfterFrom } from "./errors";

describe("ApiError", () => {
  it("extracts error message from string body", () => {
    const error = new ApiError(
      400,
      {
        message: "Dados inválidos",
        error: "Bad Request",
        statusCode: 400,
      },
      null,
    );

    expect(error.message).toBe("Dados inválidos");
    expect(error.status).toBe(400);
    expect(error.name).toBe("ApiError");
    expect(error.retryAfterSeconds).toBeNull();
  });

  it("joins array messages into a single string", () => {
    const error = new ApiError(
      422,
      {
        message: ["CEP obrigatório.", "Número é inválido."],
        error: "Unprocessable Entity",
        statusCode: 422,
      },
      null,
    );

    expect(error.message).toBe("CEP obrigatório. Número é inválido.");
  });

  it("uses default fallback message when body or message is null/missing", () => {
    const error = new ApiError(500, null, null);

    expect(error.message).toBe(
      "Ocorreu um erro inesperado. Tente novamente em instantes.",
    );
  });

  it("exposes status-checking getters accurately", () => {
    expect(new ApiError(401, null, null).isUnauthorized).toBe(true);
    expect(new ApiError(404, null, null).isNotFound).toBe(true);
    expect(new ApiError(409, null, null).isConflict).toBe(true);
    expect(new ApiError(429, null, 30).isRateLimited).toBe(true);
    expect(new ApiError(503, null, null).isUnavailable).toBe(true);

    const normal = new ApiError(200, null, null);
    expect(normal.isUnauthorized).toBe(false);
    expect(normal.isNotFound).toBe(false);
    expect(normal.isConflict).toBe(false);
    expect(normal.isRateLimited).toBe(false);
    expect(normal.isUnavailable).toBe(false);
  });
});

describe("retryAfterFrom", () => {
  it("parses valid numeric seconds", () => {
    const headers = new Headers();
    headers.set("retry-after", "120");

    expect(retryAfterFrom(headers)).toBe(120);
  });

  it("returns null when header is missing", () => {
    const headers = new Headers();

    expect(retryAfterFrom(headers)).toBeNull();
  });

  it("returns null when header is not a valid positive number", () => {
    const headers = new Headers();
    headers.set("retry-after", "Wed, 21 Oct 2026 07:28:00 GMT");

    expect(retryAfterFrom(headers)).toBeNull();

    headers.set("retry-after", "-10");
    expect(retryAfterFrom(headers)).toBeNull();
  });
});
