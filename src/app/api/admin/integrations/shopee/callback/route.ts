import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";

const COPY = {
  400: "Parâmetros de autorização Shopee inválidos ou expirados.",
  401: "Sessão expirada.",
  403: "Sem permissão para autorizar integrações.",
} as const;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shopIdParam = url.searchParams.get("shop_id");
  const state = url.searchParams.get("state") ?? undefined;
  const error = url.searchParams.get("error");

  const baseUrl = url.origin;

  if (error || !code) {
    return NextResponse.redirect(
      new URL(
        `/admin/integracoes?error=${encodeURIComponent(error ?? "shopee_auth_failed")}`,
        baseUrl,
      ),
    );
  }

  const shop_id = shopIdParam ? Number.parseInt(shopIdParam, 10) : 654321;

  const api = await customerApi();
  if (!api) {
    return NextResponse.redirect(
      new URL("/admin/integracoes?error=session_expired", baseUrl),
    );
  }

  try {
    await unwrap(
      await api.POST("/integrations/shopee/callback", {
        body: { code, shop_id, state },
      }),
    );
    return NextResponse.redirect(
      new URL("/admin/integracoes?connected=shopee", baseUrl),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "shopee_callback_failed";
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

  const { code, shop_id, state } = body as {
    code?: unknown;
    shop_id?: unknown;
    state?: unknown;
  };

  if (typeof code !== "string" || typeof shop_id !== "number") {
    return NextResponse.json(
      { error: "Código e shop_id são obrigatórios." },
      { status: 400 },
    );
  }

  return withAdminApi(COPY, async (api) => {
    return unwrap(
      await api.POST("/integrations/shopee/callback", {
        body: {
          code,
          shop_id,
          state: typeof state === "string" ? state : undefined,
        },
      }),
    );
  });
}
