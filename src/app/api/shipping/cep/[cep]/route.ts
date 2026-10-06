import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { publicApi, unwrap } from "@/lib/api/client";
import { badRequest, errorResponse } from "@/lib/auth/api-response";

const COPY = {
  400: "CEP inválido. Informe os oito dígitos.",
  404: "CEP não encontrado.",
  429: "Muitas consultas seguidas. Aguarde um momento.",
  503: "A consulta de CEP está indisponível no momento.",
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cep: string }> },
) {
  const { cep } = await params;

  if (!cep || typeof cep !== "string") {
    return badRequest(COPY[400]);
  }

  try {
    const address = unwrap(
      await publicApi.GET("/shipping/cep/{postalCode}", {
        params: { path: { postalCode: cep } },
      }),
    );

    return NextResponse.json(address);
  } catch (error) {
    return errorResponse(error, COPY);
  }
}
