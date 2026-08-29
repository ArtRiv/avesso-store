import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { badRequest, errorResponse } from "@/lib/auth/api-response";
import { customerApi } from "@/lib/auth/session";
import type { components } from "@/lib/api/schema";

type Address = components["schemas"]["ShippingAddressDto"];

/**
 * Checkout: the sacola becomes an order.
 *
 * One transaction on the backend — names and prices frozen, stock decremented,
 * cart consumed — so this route is not retryable in the ordinary way. Two
 * concurrent calls produce exactly one order and the loser gets a 409.
 *
 * `paymentMode` is deliberately **not sent**. It defaults to the deployment's
 * own setting, and which checkout UI an instance issues is that instance's
 * configuration rather than this storefront's opinion. See README.md — the
 * deployed instance is `hosted`, and rendering Stripe's embedded form would
 * additionally need a publishable key that neither this repo holds nor the
 * API publishes.
 */
const COPY = {
  400: "Confira o endereço de entrega.",
  // Prose, and it names the sold-out pieces inside a sentence rather than
  // saying which line to strike. The checkout does not read this message: it
  // re-reads the cart and reconciles. Kept honest anyway, for the caller that
  // only shows text.
  409: "Algo mudou enquanto você finalizava.",
  503: "Não foi possível cotar o frete agora. Nenhum pedido foi criado.",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Requisição inválida.");
  }

  const form = body as {
    shippingAddress?: unknown;
    shippingOptionCode?: unknown;
    quotedShippingCents?: unknown;
  };

  const address = readAddress(form.shippingAddress);

  if (!address) {
    return badRequest(COPY[400]);
  }

  if (typeof form.shippingOptionCode !== "string" || !form.shippingOptionCode) {
    return badRequest("Escolha uma opção de frete.");
  }

  // An assertion about what the customer was *shown*, never an instruction:
  // the server re-quotes and charges its own number, comparing this one only
  // to catch a price that went stale. Sending anything but the displayed
  // price would defeat the check in both directions.
  if (
    typeof form.quotedShippingCents !== "number" ||
    !Number.isInteger(form.quotedShippingCents) ||
    form.quotedShippingCents < 0
  ) {
    return badRequest("Recalcule o frete antes de finalizar.");
  }

  const api = await customerApi();

  if (!api) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    const order = unwrap(
      await api.POST("/orders", {
        body: {
          shippingAddress: address,
          shippingOptionCode: form.shippingOptionCode,
          quotedShippingCents: form.quotedShippingCents,
        },
      }),
    );

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return errorResponse(error, COPY);
  }
}

/**
 * The address the API actually has: a street line, an optional second line,
 * city, state and CEP.
 *
 * The design's `Número` and `Bairro` have no field to land in, and this does
 * not invent one — see README.md. The number rides in `line1`, exactly as the
 * spec's own example does ("Rua das Flores, 100").
 */
function readAddress(value: unknown): Address | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const line1 = trimmed(raw.line1);
  const city = trimmed(raw.city);
  const state = trimmed(raw.state);
  const postalCode = trimmed(raw.postalCode);

  if (!line1 || !city || !state || !postalCode) {
    return null;
  }

  const line2 = trimmed(raw.line2);

  // Omitted rather than sent empty: the validation pipe rejects an unknown
  // field, and an empty string is a value the label would print.
  return { line1, city, state, postalCode, ...(line2 ? { line2 } : {}) };
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
