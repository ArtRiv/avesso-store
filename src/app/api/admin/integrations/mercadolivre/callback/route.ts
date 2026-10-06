import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readJson, withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";

const COPY = {
  400: "Parâmetros de autenticação inválidos ou expirados.",
  401: "Sessão expirada.",
  403: "Sem permissão para autorizar integrações.",
} as const;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = url.origin;

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(
        `/admin/integracoes?error=${encodeURIComponent(error ?? "auth_failed")}`,
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
      await api.POST("/integrations/mercadolivre/callback", {
        body: { code, state },
      }),
    );
    return NextResponse.redirect(
      new URL("/admin/integracoes?connected=true", baseUrl),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "callback_failed";
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

  const { code, state } = body as { code?: unknown; state?: unknown };
  if (typeof code !== "string" || typeof state !== "string") {
    return NextResponse.json(
      { error: "Código e state são obrigatórios." },
      { status: 400 },
    );
  }

  return withAdminApi(COPY, async (api) => {
    return unwrap(
      await api.POST("/integrations/mercadolivre/callback", {
        body: { code, state },
      }),
    );
  });
}
