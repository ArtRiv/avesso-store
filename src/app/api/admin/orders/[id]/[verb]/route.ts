import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { TRANSITIONS, type TransitionVerb } from "@/lib/admin/status";
import { unwrap } from "@/lib/api/client";

/**
 * The five lifecycle transitions, behind one route.
 *
 * They are explicit verbs upstream rather than a PATCH of a status field, and
 * that shape is kept here: each has its own source state, its own permission
 * and its own refusals. One handler rather than five files because the only
 * thing that differs between them is the verb in the path — the branching that
 * matters happens in the backend, and duplicating it here would be a second
 * copy of the state machine.
 *
 * `ship` is the one that takes a body. Tracking is optional by business rule
 * and not by omission: a local courier hand-off is a real shipment with no
 * code to quote, and demanding one would block it.
 *
 * A 409 is the honest answer to a transition the order cannot make — already
 * paid, already shipped, cancelled. The panel only offers the buttons a status
 * allows, but that is a courtesy: the backend decides, and this passes its
 * refusal through rather than pre-empting it.
 */
const COPY = {
  400: "O código ou a URL de rastreio não passou na validação.",
  403: "Esta conta não tem permissão para esta transição.",
  404: "Este pedido não existe.",
  409: "O pedido não está no estado que esta transição exige. Recarregue a página.",
  503: "O provedor de pagamento está indisponível. O pedido não foi alterado.",
} as const;

const VERBS = new Set<string>(TRANSITIONS.map((t) => t.verb));

function isVerb(value: string): value is TransitionVerb {
  return VERBS.has(value);
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/orders/[id]/[verb]">,
) {
  const { id, verb } = await context.params;

  if (!isVerb(verb)) {
    return NextResponse.json({ error: "Transição desconhecida." }, { status: 404 });
  }

  if (verb !== "ship") {
    return withAdminApi(COPY, async (api) =>
      unwrap(
        await api.POST(`/orders/{id}/${verb}` as "/orders/{id}/cancel", {
          params: { path: { id } },
        }),
      ),
    );
  }

  const [body, invalid] = await readJson(request);

  if (invalid) {
    return invalid;
  }

  const { trackingCode, trackingUrl } = body as {
    trackingCode?: unknown;
    trackingUrl?: unknown;
  };

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.POST("/orders/{id}/ship", {
        params: { path: { id } },
        // Empty strings are absent, not empty values: the API stores null for
        // a shipment with no tracking, and "" would be a code that is not one.
        body: {
          ...(typeof trackingCode === "string" && trackingCode.trim()
            ? { trackingCode: trackingCode.trim() }
            : {}),
          ...(typeof trackingUrl === "string" && trackingUrl.trim()
            ? { trackingUrl: trackingUrl.trim() }
            : {}),
        },
      }),
    ),
  );
}
