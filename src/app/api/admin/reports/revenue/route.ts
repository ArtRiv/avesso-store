import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/admin/route";
import { isGranularity } from "@/lib/admin/reports";
import { unwrap } from "@/lib/api/client";

/**
 * Revenue by week or by month.
 *
 * `from` and `to` go through untouched. The window is `[from, to)` and a `from`
 * at or after `to` is a **400, not an empty list** — the API is explicit that
 * an impossible window is the caller's bug, and forwarding it rather than
 * pre-empting it is what keeps that answer the API's to give.
 *
 * `granularity` is the one thing checked here, and only because the typed
 * client cannot carry a value outside the enum. The 400 that comes back is the
 * same status, for the same reason, as the one the API would have sent.
 */
const COPY = {
  400: "Período recusado: o início precisa ser uma data válida e anterior ao fim.",
  403: "Esta conta não tem permissão de relatórios.",
} as const;

export function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const granularity = search.get("granularity");

  if (granularity !== null && !isGranularity(granularity)) {
    return NextResponse.json(
      { error: "A granularidade precisa ser week ou month." },
      { status: 400 },
    );
  }

  const from = search.get("from");
  const to = search.get("to");

  return withAdminApi(COPY, async (api) =>
    unwrap(
      await api.GET("/reports/revenue", {
        params: {
          query: {
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
            ...(granularity ? { granularity } : {}),
          },
        },
      }),
    ),
  );
}
