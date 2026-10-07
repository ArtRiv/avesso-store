import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";

const COPY = {
  400: "Parâmetros de autorização Amazon SP-API inválidos ou expirados.",
  401: "Sessão expirada.",
  403: "Sem permissão para autorizar integrações.",
} as const;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const spapiCode =
    url.searchParams.get("spapi_oauth_code") ?? url.searchParams.get("code");
  const sellingPartnerId =
    url.searchParams.get("selling_partner_id") ?? "A21TJRUUN4KGV";
  const state = url.searchParams.get("state") ?? undefined;
  const error = url.searchParams.get("error");

  const baseUrl = url.origin;

  if (error || !spapiCode) {
    return NextResponse.redirect(
      new URL(
        `/admin/integracoes?error=${encodeURIComponent(error ?? "amazon_auth_failed")}`,
        baseUrl,
      ),
    );
  }

  const api = await customerApi();
  if (!api) {
    return NextResponse.redirect(
      new URL("/admin/integracoes?error=session_expired", baseUrl),
    );
  }

  try {
    await unwrap(
      await api.POST("/integrations/amazon/callback", {
        body: {
          spapi_oauth_code: spapiCode,
          code: spapiCode,
          selling_partner_id: sellingPartnerId,
          state: state ?? "",
        },
      }),
    );
    return NextResponse.redirect(
      new URL("/admin/integracoes?connected=amazon", baseUrl),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "amazon_callback_failed";
    return NextResponse.redirect(
      new URL(`/admin/integracoes?error=${encodeURIComponent(msg)}`, baseUrl),
    );
  }
}

export async function POST(request: NextRequest) {
  const [body, invalid] = await readJson(request);
  if (invalid) {
    return invalid;
  }

  const { spapi_oauth_code, code, selling_partner_id, state } = body as {
    spapi_oauth_code?: unknown;
    code?: unknown;
    selling_partner_id?: unknown;
    state?: unknown;
  };

  const finalCode =
    (typeof spapi_oauth_code === "string" ? spapi_oauth_code : null) ??
    (typeof code === "string" ? code : null);

  if (!finalCode || typeof selling_partner_id !== "string") {
    return NextResponse.json(
      { error: "Código e selling_partner_id são obrigatórios." },
      { status: 400 },
    );
  }

  return withAdminApi(COPY, async (api) => {
    return unwrap(
      await api.POST("/integrations/amazon/callback", {
        body: {
          spapi_oauth_code: finalCode,
          code: finalCode,
          selling_partner_id,
          state: typeof state === "string" ? state : "",
        },
      }),
    );
  });
}
